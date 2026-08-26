import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { netsEasyConfig } from "@/lib/nets/config";
import { ensureRestaurantNewOrderNotification } from "@/lib/monitoring/newOrderNotification";
import {
  recordOperationalAlert,
  resolveOperationalAlert,
} from "@/lib/monitoring/operationalAlerts";
import type { PreparedCheckout } from "@/lib/orders/prepareCheckout";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderReceivedEmail } from "@/lib/email/orderEmails";

type NetsWebhook = {
  id?: unknown;
  event?: unknown;
  timestamp?: unknown;

  data?: {
    chargeId?: unknown;
    refundId?: unknown;

    paymentId?: unknown;
    paymentMethod?: unknown;
    paymentType?: unknown;
    myReference?: unknown;

    amount?: {
      amount?: unknown;
      currency?: unknown;
    };

    error?: {
      code?: unknown;
      message?: unknown;
      source?: unknown;
    };
  };
};

type RefundWebhookEvent =
  | "payment.refund.initiated"
  | "payment.refund.completed"
  | "payment.refund.failed";

const REFUND_WEBHOOK_EVENTS = new Set<RefundWebhookEvent>([
  "payment.refund.initiated",
  "payment.refund.completed",
  "payment.refund.failed",
]);

function isRefundWebhookEvent(value: unknown): value is RefundWebhookEvent {
  return (
    typeof value === "string" &&
    REFUND_WEBHOOK_EVENTS.has(value as RefundWebhookEvent)
  );
}

function getWebhookTimestamp(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function safeSecretEquals(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

function getWebhookAmount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : null;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);

    return Number.isSafeInteger(parsed) ? parsed : null;
  }

  return null;
}

function isPreparedCheckout(value: unknown): value is PreparedCheckout {
  if (!value || typeof value !== "object") {
    return false;
  }

  const checkout = value as Partial<PreparedCheckout>;

  return (
    typeof checkout.customerName === "string" &&
    typeof checkout.customerPhone === "string" &&
    typeof checkout.customerEmail === "string" &&
    (checkout.deliveryMethod === "pickup" ||
      checkout.deliveryMethod === "delivery") &&
    (checkout.paymentMethod === "card" ||
      checkout.paymentMethod === "mobilepay") &&
    typeof checkout.requestedTime === "string" &&
    typeof checkout.bagIncluded === "boolean" &&
    !!checkout.pricing &&
    typeof checkout.pricing === "object" &&
    Array.isArray(checkout.pricing.items) &&
    typeof checkout.pricing.subtotal === "number" &&
    typeof checkout.pricing.bagFee === "number" &&
    typeof checkout.pricing.serviceFee === "number" &&
    typeof checkout.pricing.deliveryFee === "number" &&
    typeof checkout.pricing.totalPrice === "number"
  );
}

async function handleRefundWebhook(body: NetsWebhook) {
  if (!isRefundWebhookEvent(body.event)) {
    return NextResponse.json(
      {
        ok: true,
        ignored: true,
      },
      { status: 200 },
    );
  }

  const event = body.event;
  const data = body.data;

  if (!data || typeof data !== "object") {
    return NextResponse.json(
      {
        error: "Missing refund webhook data",
      },
      { status: 400 },
    );
  }

  const refundId =
    typeof data.refundId === "string" && data.refundId.trim()
      ? data.refundId.trim()
      : null;

  const paymentId =
    typeof data.paymentId === "string" && data.paymentId.trim()
      ? data.paymentId.trim()
      : null;

  const chargeId =
    typeof data.chargeId === "string" && data.chargeId.trim()
      ? data.chargeId.trim()
      : null;

  const checkoutSessionId =
    typeof data.myReference === "string" && data.myReference.trim()
      ? data.myReference.trim()
      : null;

  const currency =
    typeof data.amount?.currency === "string" ? data.amount.currency : null;

  const amountMinor = getWebhookAmount(data.amount?.amount);

  if (
    !refundId ||
    !paymentId ||
    currency !== "DKK" ||
    amountMinor === null ||
    amountMinor <= 0
  ) {
    return NextResponse.json(
      {
        error: "Incomplete refund webhook payload",
      },
      { status: 400 },
    );
  }
  const eventAt = getWebhookTimestamp(body.timestamp);

  if (!eventAt) {
    return NextResponse.json(
      {
        error: "Invalid refund webhook timestamp",
      },
      { status: 400 },
    );
  }

  if (event === "payment.refund.initiated" && !chargeId) {
    return NextResponse.json(
      {
        error: "Incomplete initiated refund webhook payload",
      },
      { status: 400 },
    );
  }

  const supabaseAdmin = createAdminClient();

  /*
   * Completed/failed refund events do not include chargeId or
   * myReference, so paymentId is the stable order lookup key.
   */
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select(
      `
      id,
      checkout_session_id,
      nets_payment_id,
      nets_charge_id,
      nets_refund_id,
      refund_status,
      refund_amount_minor,
      refund_requested_at
    `,
    )
    .eq("nets_payment_id", paymentId)
    .maybeSingle();

  if (orderError) {
    console.error("Refund webhook order lookup failed:", orderError);

    return NextResponse.json(
      {
        error: "Order lookup failed",
      },
      { status: 500 },
    );
  }

  if (!order) {
    return NextResponse.json(
      {
        error: "Refund order not found",
      },
      { status: 404 },
    );
  }

  if (!order.checkout_session_id) {
    console.error("Refund order missing checkout session:", {
      orderId: order.id,
      paymentId,
    });

    return NextResponse.json(
      {
        error: "Missing checkout session",
      },
      { status: 409 },
    );
  }

  const { data: checkoutSession, error: checkoutSessionError } =
    await supabaseAdmin
      .from("checkout_sessions")
      .select(
        `
        id,
        amount_minor,
        currency,
        nets_payment_id,
        nets_charge_id
      `,
      )
      .eq("id", order.checkout_session_id)
      .maybeSingle();

  if (checkoutSessionError) {
    console.error(
      "Refund webhook checkout session lookup failed:",
      checkoutSessionError,
    );

    return NextResponse.json(
      {
        error: "Checkout session lookup failed",
      },
      { status: 500 },
    );
  }

  if (!checkoutSession) {
    return NextResponse.json(
      {
        error: "Checkout session not found",
      },
      { status: 404 },
    );
  }

  if (
    checkoutSession.nets_payment_id !== paymentId ||
    checkoutSession.currency !== "DKK" ||
    checkoutSession.amount_minor !== amountMinor
  ) {
    console.error("Refund webhook payment identity mismatch:", {
      orderId: order.id,
      paymentId,
      amountMinor,
      currency,
    });

    return NextResponse.json(
      {
        error: "Refund payment mismatch",
      },
      { status: 409 },
    );
  }

  /*
   * refund.initiated carries these extra identifiers.
   * Verify them whenever Nexi supplies them.
   */
  if (checkoutSessionId && checkoutSessionId !== checkoutSession.id) {
    console.error("Refund webhook checkout session mismatch:", {
      orderId: order.id,
      expected: checkoutSession.id,
      received: checkoutSessionId,
    });

    return NextResponse.json(
      {
        error: "Checkout session mismatch",
      },
      { status: 409 },
    );
  }

  if (
    chargeId &&
    (chargeId !== order.nets_charge_id ||
      (checkoutSession.nets_charge_id &&
        chargeId !== checkoutSession.nets_charge_id))
  ) {
    console.error("Refund webhook charge mismatch:", {
      orderId: order.id,
      received: chargeId,
    });

    return NextResponse.json(
      {
        error: "Charge mismatch",
      },
      { status: 409 },
    );
  }

  if (order.nets_refund_id && order.nets_refund_id !== refundId) {
    console.error("Refund webhook refund ID mismatch:", {
      orderId: order.id,
      expected: order.nets_refund_id,
      received: refundId,
    });

    return NextResponse.json(
      {
        error: "Refund mismatch",
      },
      { status: 409 },
    );
  }

  if (
    order.refund_amount_minor !== null &&
    order.refund_amount_minor !== amountMinor
  ) {
    console.error("Refund webhook amount mismatch:", {
      orderId: order.id,
      expected: order.refund_amount_minor,
      received: amountMinor,
    });

    return NextResponse.json(
      {
        error: "Refund amount mismatch",
      },
      { status: 409 },
    );
  }

  const targetRefundStatus: "pending" | "completed" | "failed" =
    event === "payment.refund.initiated"
      ? "pending"
      : event === "payment.refund.completed"
        ? "completed"
        : "failed";

  /*
   * These checks are an idempotent fast path only. The UPDATE below
   * repeats the state guard atomically so a concurrent webhook cannot
   * overwrite a terminal state after this snapshot was loaded.
   */
  if (order.refund_status === targetRefundStatus) {
    return NextResponse.json(
      {
        ok: true,
        duplicate: true,
        refund_status: order.refund_status,
      },
      { status: 200 },
    );
  }

  /*
   * A terminal refund state is final. A delayed initiated event or
   * a conflicting terminal event must be acknowledged without
   * changing the stored outcome.
   */

  if (order.refund_status === "completed" || order.refund_status === "failed") {
    console.error("Conflicting terminal refund webhook ignored:", {
      orderId: order.id,
      refundId,
      storedStatus: order.refund_status,
      receivedEvent: event,
    });

    return NextResponse.json(
      {
        ok: true,
        ignored: true,
        refund_status: order.refund_status,
      },
      { status: 200 },
    );
  }

  const updateData: {
    nets_refund_id: string;
    refund_status: "pending" | "completed" | "failed";
    refund_amount_minor: number;
    refund_requested_at: string;
    refund_completed_at: string | null;
    refund_failed_at: string | null;
    refund_error: string | null;
  } = {
    nets_refund_id: refundId,
    refund_status: targetRefundStatus,
    refund_amount_minor: amountMinor,
    refund_requested_at: order.refund_requested_at ?? eventAt,
    refund_completed_at: null,
    refund_failed_at: null,
    refund_error: null,
  };

  if (event === "payment.refund.completed") {
    updateData.refund_completed_at = eventAt;
  }

  if (event === "payment.refund.failed") {
    const errorParts: string[] = [];

    if (typeof data.error?.code === "string") {
      errorParts.push(data.error.code);
    }

    if (typeof data.error?.source === "string") {
      errorParts.push(data.error.source);
    }

    if (typeof data.error?.message === "string") {
      errorParts.push(data.error.message);
    }

    updateData.refund_failed_at = eventAt;
    updateData.refund_error =
      errorParts.length > 0 ? errorParts.join(" | ") : "Nets refund failed.";
  }

  /*
   * If another request changed refund identity between our lookup
   * and update, return non-200 so Nexi can retry with fresh state.
   */
  let updateQuery = supabaseAdmin
    .from("orders")
    .update(updateData)
    .eq("id", order.id);

  if (order.nets_refund_id) {
    updateQuery = updateQuery.eq("nets_refund_id", order.nets_refund_id);
  } else {
    updateQuery = updateQuery.is("nets_refund_id", null);
  }

  if (targetRefundStatus === "pending") {
    updateQuery = updateQuery.or(
      "refund_status.is.null,refund_status.eq.pending",
    );
  } else if (targetRefundStatus === "completed") {
    updateQuery = updateQuery.or(
      "refund_status.is.null,refund_status.eq.pending,refund_status.eq.completed",
    );
  } else {
    updateQuery = updateQuery.or(
      "refund_status.is.null,refund_status.eq.pending,refund_status.eq.failed",
    );
  }

  const { data: updatedOrder, error: updateError } = await updateQuery
    .select("id, nets_refund_id, refund_status")
    .maybeSingle();

  if (updateError) {
    console.error("Refund webhook update failed:", updateError);

    return NextResponse.json(
      {
        error: "Refund update failed",
      },
      { status: 500 },
    );
  }

  if (!updatedOrder) {
    const { data: latestOrder, error: latestOrderError } = await supabaseAdmin
      .from("orders")
      .select("id, nets_refund_id, refund_status, refund_amount_minor")
      .eq("id", order.id)
      .maybeSingle();

    if (latestOrderError || !latestOrder) {
      console.error("Refund state reload failed:", latestOrderError);

      return NextResponse.json(
        {
          error: "Refund state reload failed",
        },
        { status: 500 },
      );
    }
    if (
      latestOrder.nets_refund_id !== refundId ||
      latestOrder.refund_amount_minor !== amountMinor
    ) {
      console.error("Refund identity changed concurrently:", {
        orderId: order.id,
        expectedRefundId: refundId,
        receivedRefundId: latestOrder.nets_refund_id,
        expectedAmountMinor: amountMinor,
        receivedAmountMinor: latestOrder.refund_amount_minor,
      });

      return NextResponse.json(
        {
          error: "Refund identity changed",
        },
        { status: 409 },
      );
    }

    if (latestOrder.refund_status === targetRefundStatus) {
      return NextResponse.json(
        {
          ok: true,
          duplicate: true,
          refund_status: latestOrder.refund_status,
        },
        { status: 200 },
      );
    }

    if (
      latestOrder.refund_status === "completed" ||
      latestOrder.refund_status === "failed"
    ) {
      console.error("Conflicting concurrent terminal refund state:", {
        orderId: order.id,
        refundId,
        storedStatus: latestOrder.refund_status,
        receivedEvent: event,
      });

      return NextResponse.json(
        {
          ok: true,
          ignored: true,
          refund_status: latestOrder.refund_status,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        error: "Refund state changed concurrently",
      },
      { status: 409 },
    );
  }

  if (event === "payment.refund.failed") {
    await recordOperationalAlert({
      dedupeKey: `refund-failed:${order.id}`,
      category: "refund_webhook",
      severity: "critical",
      summary: "Nets reported that an order refund failed.",
      checkoutSessionId: order.checkout_session_id,
      orderId: order.id,
      context: {
        stage: "refund_webhook",
      },
      notify: true,
    });
  } else {
    await resolveOperationalAlert(`refund-request-failed:${order.id}`);
  }

  if (event === "payment.refund.completed") {
    await Promise.all([
      resolveOperationalAlert(`refund-failed:${order.id}`),
      resolveOperationalAlert(`refund-state-persistence-failed:${order.id}`),
    ]);
  }

  return NextResponse.json(
    {
      ok: true,
      order_id: updatedOrder.id,
      refund_status: updatedOrder.refund_status,
    },
    { status: 200 },
  );
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";

  if (!safeSecretEquals(authorization, netsEasyConfig.webhookAuthorization)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  let body: NetsWebhook;

  try {
    body = (await request.json()) as NetsWebhook;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON",
      },
      { status: 400 },
    );
  }

  /*
   * Refund events must be handled before the generic
   * unsupported-event fallback below.
   */
  if (isRefundWebhookEvent(body.event)) {
    return handleRefundWebhook(body);
  }

  /*
   * Charge-created-v2 is the payment event handled by
   * the existing order-creation flow below.
   *
   * Any other unexpected event is acknowledged and ignored
   * so Nexi does not retry an event we do not subscribe to.
   */
  if (body.event !== "payment.charge.created.v2") {
    return NextResponse.json(
      {
        ok: true,
        ignored: true,
      },
      { status: 200 },
    );
  }

  const data = body.data;

  if (!data || typeof data !== "object") {
    return NextResponse.json(
      {
        error: "Missing webhook data",
      },
      { status: 400 },
    );
  }

  const paymentId = typeof data.paymentId === "string" ? data.paymentId : null;

  const chargeId = typeof data.chargeId === "string" ? data.chargeId : null;

  const checkoutSessionId =
    typeof data.myReference === "string" ? data.myReference : null;

  const paymentMethod =
    typeof data.paymentMethod === "string" ? data.paymentMethod : null;

  const currency =
    typeof data.amount?.currency === "string" ? data.amount.currency : null;

  const amountMinor = getWebhookAmount(data.amount?.amount);
  const chargeEventAt = getWebhookTimestamp(body.timestamp);

  if (
    !paymentId ||
    !chargeId ||
    !checkoutSessionId ||
    !currency ||
    amountMinor === null ||
    !chargeEventAt
  ) {
    return NextResponse.json(
      {
        error: "Incomplete webhook payload",
      },
      { status: 400 },
    );
  }

  const supabaseAdmin = createAdminClient();

  const { data: checkoutSession, error: checkoutSessionError } =
    await supabaseAdmin
      .from("checkout_sessions")
      .select(
        `
        id,
        user_id,
        status,
        order_payload,
        amount_minor,
        currency,
        nets_payment_id,
        nets_charge_id
      `,
      )
      .eq("id", checkoutSessionId)
      .single();

  if (checkoutSessionError || !checkoutSession) {
    console.error(
      "Nets webhook checkout session lookup failed:",
      checkoutSessionError,
    );

    return NextResponse.json(
      {
        error: "Checkout session not found",
      },
      { status: 404 },
    );
  }

  /*
   * Important payment identity checks.
   */

  const webhookValidationAlertKey = `charge-webhook-validation-failed:${checkoutSession.id}`;

  let webhookValidationFailure: {
    error: string;
    stage: string;
  } | null = null;

  if (checkoutSession.nets_payment_id !== paymentId) {
    webhookValidationFailure = {
      error: "Payment mismatch",
      stage: "verify_payment_id",
    };
  } else if (checkoutSession.currency !== "DKK" || currency !== "DKK") {
    webhookValidationFailure = {
      error: "Currency mismatch",
      stage: "verify_currency",
    };
  } else if (checkoutSession.amount_minor !== amountMinor) {
    webhookValidationFailure = {
      error: "Amount mismatch",
      stage: "verify_amount",
    };
  }

  if (webhookValidationFailure) {
    console.error(
      "Authenticated Nets charge webhook validation failed:",
      webhookValidationFailure.stage,
    );

    await recordOperationalAlert({
      dedupeKey: webhookValidationAlertKey,
      category: "charge_webhook_validation",
      severity: "critical",
      summary:
        "An authenticated Nets charge webhook did not match its checkout session.",
      checkoutSessionId: checkoutSession.id,
      context: {
        stage: webhookValidationFailure.stage,
      },
      notify: true,
    });

    return NextResponse.json(
      {
        error: webhookValidationFailure.error,
      },
      { status: 409 },
    );
  }

  await resolveOperationalAlert(webhookValidationAlertKey);

  /*
   * Persist the verified charge before creating the restaurant order.
   * If order creation fails afterward, the database still contains a
   * durable "paid without order" state for recovery and monitoring.
   */
  if (checkoutSession.status !== "completed") {
    const { data: paidSession, error: paidSessionError } = await supabaseAdmin
      .from("checkout_sessions")
      .update({
        status: "paid",
        nets_charge_id: chargeId,
        nets_payment_method: paymentMethod,
        paid_at: chargeEventAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", checkoutSession.id)
      .neq("status", "completed")
      .select("id")
      .maybeSingle();

    if (paidSessionError || !paidSession) {
      console.error("Paid checkout session tracking failed:", paidSessionError);

      await recordOperationalAlert({
        dedupeKey: `paid-session-tracking-failed:${checkoutSession.id}`,
        category: "paid_session_tracking",
        severity: "critical",
        summary:
          "Nets confirmed payment, but the paid checkout state was not saved.",
        checkoutSessionId: checkoutSession.id,
        context: {
          stage: "mark_paid",
        },
        notify: true,
      });

      return NextResponse.json(
        {
          error: "Failed to track paid checkout session",
        },
        { status: 500 },
      );
    }
  }

  const paidOrderAlertKey = `paid-order-missing:${checkoutSession.id}`;
  /*
   * Idempotency:
   * If an order already exists for this checkout session,
   * acknowledge the duplicate webhook.
   */

  const { data: existingOrder, error: existingOrderError } = await supabaseAdmin
    .from("orders")
    .select(
      `
    id,
    public_token,
    customer_email,
    customer_name,
    confirmation_email_sent_at,
    order_items (id)
  `,
    )
    .eq("checkout_session_id", checkoutSession.id)
    .maybeSingle();

  if (existingOrderError) {
    console.error("Existing order lookup failed:", existingOrderError);

    await recordOperationalAlert({
      dedupeKey: paidOrderAlertKey,
      category: "paid_order_lookup",
      severity: "critical",
      summary:
        "Nets confirmed payment, but the application could not verify the restaurant order.",
      checkoutSessionId: checkoutSession.id,
      context: {
        stage: "lookup_existing_order",
        database_code: existingOrderError.code ?? null,
      },
      notify: true,
    });

    return NextResponse.json(
      {
        error: "Order lookup failed",
      },
      { status: 500 },
    );
  }

  if (existingOrder) {
    if (
      !Array.isArray(existingOrder.order_items) ||
      existingOrder.order_items.length === 0
    ) {
      console.error("Existing paid order has no order items:", {
        checkoutSessionId: checkoutSession.id,
        orderId: existingOrder.id,
      });

      await recordOperationalAlert({
        dedupeKey: paidOrderAlertKey,
        category: "paid_order_incomplete",
        severity: "critical",
        summary: "A paid order exists without any order items.",
        checkoutSessionId: checkoutSession.id,
        orderId: existingOrder.id,
        context: {
          stage: "verify_existing_order",
        },
        notify: true,
      });

      return NextResponse.json(
        {
          error: "Paid order is incomplete",
        },
        { status: 500 },
      );
    }
    let confirmationEmailSent =
      existingOrder.confirmation_email_sent_at !== null;

    if (!confirmationEmailSent) {
      try {
        if (
          typeof existingOrder.public_token !== "string" ||
          existingOrder.public_token.trim() === "" ||
          typeof existingOrder.customer_email !== "string" ||
          existingOrder.customer_email.trim() === "" ||
          typeof existingOrder.customer_name !== "string" ||
          existingOrder.customer_name.trim() === ""
        ) {
          throw new Error(
            "Existing paid order is missing confirmation email data.",
          );
        }

        const origin = (process.env.SITE_URL ?? request.nextUrl.origin).replace(
          /\/+$/,
          "",
        );

        const receiptUrl = `${origin}/order/${encodeURIComponent(
          existingOrder.public_token,
        )}`;

        await sendOrderReceivedEmail({
          to: existingOrder.customer_email,
          customerName: existingOrder.customer_name,
          orderId: existingOrder.id,
          receiptUrl,
        });

        confirmationEmailSent = true;

        const { error: emailTimestampError } = await supabaseAdmin
          .from("orders")
          .update({
            confirmation_email_sent_at: new Date().toISOString(),
          })
          .eq("id", existingOrder.id);

        if (emailTimestampError) {
          console.error(
            "Duplicate confirmation email timestamp update failed:",
            emailTimestampError,
          );
        }

        await resolveOperationalAlert(
          `customer-order-email-failed:${existingOrder.id}`,
        );
      } catch (emailError: unknown) {
        console.error(
          "Duplicate paid order confirmation email failed:",
          emailError,
        );
        await recordOperationalAlert({
          dedupeKey: `customer-order-email-failed:${existingOrder.id}`,
          category: "customer_order_email",
          severity: "warning",
          summary: "The customer order-received email was not delivered.",
          checkoutSessionId: checkoutSession.id,
          orderId: existingOrder.id,
          context: {
            stage: "duplicate_webhook",
          },
        });
      }
    }

    const siteOrigin = (process.env.SITE_URL ?? request.nextUrl.origin).replace(
      /\/+$/,
      "",
    );

    await ensureRestaurantNewOrderNotification({
      orderId: existingOrder.id,
      origin: siteOrigin,
    });

    const now = new Date().toISOString();

    const { error: duplicateSessionUpdateError } = await supabaseAdmin
      .from("checkout_sessions")
      .update({
        status: "completed",
        nets_charge_id: chargeId,
        nets_payment_method: paymentMethod,
        paid_at: chargeEventAt,
        completed_at: now,
        updated_at: now,
      })
      .eq("id", checkoutSession.id);

    if (duplicateSessionUpdateError) {
      console.error(
        "Duplicate checkout session update failed:",
        duplicateSessionUpdateError,
      );

      await recordOperationalAlert({
        dedupeKey: `checkout-finalization-failed:${checkoutSession.id}`,
        category: "checkout_finalization",
        severity: "warning",
        summary:
          "The paid order exists, but its checkout session was not finalized.",
        checkoutSessionId: checkoutSession.id,
        orderId: existingOrder.id,
        context: {
          stage: "duplicate_webhook",
        },
      });

      return NextResponse.json(
        {
          error: "Failed to finalize checkout session",
        },
        { status: 500 },
      );
    }

    await Promise.all([
      resolveOperationalAlert(paidOrderAlertKey),
      resolveOperationalAlert(
        `paid-session-tracking-failed:${checkoutSession.id}`,
      ),
      resolveOperationalAlert(
        `checkout-finalization-failed:${checkoutSession.id}`,
      ),
    ]);

    return NextResponse.json(
      {
        ok: true,
        duplicate: true,
        order_id: existingOrder.id,
        email_sent: confirmationEmailSent,
      },
      { status: 200 },
    );
  }

  if (!isPreparedCheckout(checkoutSession.order_payload)) {
    console.error("Invalid stored checkout payload:", checkoutSession.id);

    await recordOperationalAlert({
      dedupeKey: paidOrderAlertKey,
      category: "paid_order_creation",
      severity: "critical",
      summary:
        "Nets confirmed payment, but the stored checkout payload is invalid.",
      checkoutSessionId: checkoutSession.id,
      context: {
        stage: "validate_checkout_payload",
      },
      notify: true,
    });

    return NextResponse.json(
      {
        error: "Invalid stored checkout payload",
      },
      { status: 500 },
    );
  }

  const checkout = checkoutSession.order_payload;

  /*
   * The money is now verified as fully charged.
   * Only now do we create the real restaurant order.
   */

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert({
      user_id: checkoutSession.user_id,

      subtotal: checkout.pricing.subtotal,
      bag_included: checkout.bagIncluded,
      bag_fee: checkout.pricing.bagFee,
      service_fee: checkout.pricing.serviceFee,
      delivery_fee: checkout.pricing.deliveryFee,
      total_price: checkout.pricing.totalPrice,

      delivery_method: checkout.deliveryMethod,

      payment_method: checkout.paymentMethod,

      customer_name: checkout.customerName,
      customer_phone: checkout.customerPhone,
      customer_email: checkout.customerEmail,

      customer_address: checkout.customerAddress,

      customer_address_line1:
        checkout.deliveryMethod === "delivery"
          ? checkout.customerAddressLine1
          : null,

      customer_postal_code:
        checkout.deliveryMethod === "delivery"
          ? checkout.customerPostalCode
          : null,

      customer_city:
        checkout.deliveryMethod === "delivery" ? checkout.customerCity : null,

      customer_floor_door:
        checkout.deliveryMethod === "delivery"
          ? checkout.customerFloorDoor
          : null,

      customer_place_id:
        checkout.deliveryMethod === "delivery"
          ? checkout.customerPlaceId
          : null,

      customer_latitude:
        checkout.deliveryMethod === "delivery"
          ? checkout.customerLatitude
          : null,

      customer_longitude:
        checkout.deliveryMethod === "delivery"
          ? checkout.customerLongitude
          : null,

      order_note: checkout.orderNote,

      requested_time: checkout.requestedTime,

      status: "pending",

      checkout_session_id: checkoutSession.id,

      nets_payment_id: paymentId,
      nets_charge_id: chargeId,
    })
    .select()
    .single();

  if (orderError || !order) {
    /*
     * Another concurrent copy of the same webhook
     * may have won the unique-index race.
     */
    if (orderError?.code === "23505") {
      const { data: concurrentOrder, error: concurrentOrderError } =
        await supabaseAdmin
          .from("orders")
          .select("id")
          .eq("checkout_session_id", checkoutSession.id)
          .maybeSingle();

      if (concurrentOrderError) {
        console.error("Concurrent order lookup failed:", concurrentOrderError);

        return NextResponse.json(
          {
            error: "Concurrent order lookup failed",
          },
          { status: 500 },
        );
      }

      if (concurrentOrder) {
        /*
         * Another webhook may still be creating
         * order_items and finalizing the checkout.
         *
         * Do NOT acknowledge with 200 yet.
         * Returning non-200 makes Nets retry later,
         * when the normal duplicate branch can verify
         * the already-created order safely.
         */
        console.warn(
          "Concurrent paid order creation still in progress:",
          concurrentOrder.id,
        );

        return NextResponse.json(
          {
            error: "Paid order creation still in progress",
          },
          { status: 500 },
        );
      }
    }

    console.error("Paid order insert failed:", orderError);

    await recordOperationalAlert({
      dedupeKey: paidOrderAlertKey,
      category: "paid_order_creation",
      severity: "critical",
      summary:
        "Nets confirmed payment, but the restaurant order was not created.",
      checkoutSessionId: checkoutSession.id,
      context: {
        stage: "insert_order",
        database_code: orderError?.code ?? null,
      },
      notify: true,
    });

    return NextResponse.json(
      {
        error: "Failed to create paid order",
      },
      { status: 500 },
    );
  }

  const orderItems = checkout.pricing.items.map((item) => ({
    ...item,
    order_id: order.id,
  }));

  const { error: orderItemsError } = await supabaseAdmin
    .from("order_items")
    .insert(orderItems);

  if (orderItemsError) {
    console.error("Paid order items insert failed:", orderItemsError);

    /*
     * Roll back the incomplete restaurant order.
     * Nets will retry because we return non-200.
     */
    const { error: rollbackError } = await supabaseAdmin
      .from("orders")
      .delete()
      .eq("id", order.id);

    if (rollbackError) {
      console.error("Paid order rollback failed:", rollbackError);
    }

    await recordOperationalAlert({
      dedupeKey: paidOrderAlertKey,
      category: "paid_order_incomplete",
      severity: "critical",
      summary: rollbackError
        ? "A paid order has incomplete items and could not be rolled back."
        : "Paid order items failed; the incomplete order was rolled back for retry.",
      checkoutSessionId: checkoutSession.id,
      orderId: rollbackError ? order.id : null,
      context: {
        stage: "insert_order_items",
        database_code: orderItemsError.code ?? null,
        rollback_failed: Boolean(rollbackError),
      },
      notify: true,
    });

    return NextResponse.json(
      {
        error: "Failed to create order items",
      },
      { status: 500 },
    );
  }

  let confirmationEmailSent = false;

  try {
    const origin = (process.env.SITE_URL ?? request.nextUrl.origin).replace(
      /\/+$/,
      "",
    );

    const receiptUrl = `${origin}/order/${encodeURIComponent(
      String(order.public_token),
    )}`;

    await sendOrderReceivedEmail({
      to: checkout.customerEmail,
      customerName: checkout.customerName,
      orderId: order.id,
      receiptUrl,
    });

    confirmationEmailSent = true;

    const { error: emailTimestampError } = await supabaseAdmin
      .from("orders")
      .update({
        confirmation_email_sent_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (emailTimestampError) {
      console.error(
        "Confirmation email timestamp update failed:",
        emailTimestampError,
      );
    }

    await resolveOperationalAlert(`customer-order-email-failed:${order.id}`);
  } catch (emailError: unknown) {
    console.error("Paid order confirmation email failed:", emailError);

    await recordOperationalAlert({
      dedupeKey: `customer-order-email-failed:${order.id}`,
      category: "customer_order_email",
      severity: "warning",
      summary: "The customer order-received email was not delivered.",
      checkoutSessionId: checkoutSession.id,
      orderId: order.id,
      context: {
        stage: "initial_webhook",
      },
    });
  }

  const siteOrigin = (process.env.SITE_URL ?? request.nextUrl.origin).replace(
    /\/+$/,
    "",
  );

  await ensureRestaurantNewOrderNotification({
    orderId: order.id,
    origin: siteOrigin,
  });

  const now = new Date().toISOString();

  const { error: sessionUpdateError } = await supabaseAdmin
    .from("checkout_sessions")
    .update({
      status: "completed",
      nets_charge_id: chargeId,
      nets_payment_method: paymentMethod,
      paid_at: chargeEventAt,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", checkoutSession.id);

  if (sessionUpdateError) {
    console.error("Paid checkout session update failed:", sessionUpdateError);

    await recordOperationalAlert({
      dedupeKey: `checkout-finalization-failed:${checkoutSession.id}`,
      category: "checkout_finalization",
      severity: "warning",
      summary:
        "The paid order exists, but its checkout session was not finalized.",
      checkoutSessionId: checkoutSession.id,
      orderId: order.id,
      context: {
        stage: "initial_webhook",
      },
    });

    /*
     * Do not create another order on retry:
     * the unique checkout_session_id link already
     * makes the operation idempotent.
     */
    return NextResponse.json(
      {
        error: "Failed to finalize checkout session",
      },
      { status: 500 },
    );
  }

  await Promise.all([
    resolveOperationalAlert(paidOrderAlertKey),
    resolveOperationalAlert(
      `paid-session-tracking-failed:${checkoutSession.id}`,
    ),
    resolveOperationalAlert(
      `checkout-finalization-failed:${checkoutSession.id}`,
    ),
  ]);

  /*
   * Nets requires exactly HTTP 200 to acknowledge
   * successful webhook processing.
   */

  return NextResponse.json(
    {
      ok: true,
      order_id: order.id,
      email_sent: confirmationEmailSent,
    },
    { status: 200 },
  );
}
