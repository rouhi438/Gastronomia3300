import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { netsEasyConfig } from "@/lib/nets/config";
import type { PreparedCheckout } from "@/lib/orders/prepareCheckout";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderReceivedEmail } from "@/lib/email/orderEmails";

type NetsChargeWebhook = {
  id?: unknown;
  event?: unknown;
  timestamp?: unknown;

  data?: {
    chargeId?: unknown;
    paymentId?: unknown;
    paymentMethod?: unknown;
    paymentType?: unknown;
    myReference?: unknown;

    amount?: {
      amount?: unknown;
      currency?: unknown;
    };
  };
};

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

  let body: NetsChargeWebhook;

  try {
    body = (await request.json()) as NetsChargeWebhook;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON",
      },
      { status: 400 },
    );
  }

  /*
   * We only subscribe this endpoint to charge-created-v2.
   * If another Nets event somehow reaches it, acknowledge
   * and ignore it so Nets does not retry an irrelevant event.
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

  if (
    !paymentId ||
    !chargeId ||
    !checkoutSessionId ||
    !currency ||
    amountMinor === null
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

  if (checkoutSession.nets_payment_id !== paymentId) {
    console.error("Nets webhook payment id mismatch:", {
      checkoutSessionId,
      expected: checkoutSession.nets_payment_id,
      received: paymentId,
    });

    return NextResponse.json(
      {
        error: "Payment mismatch",
      },
      { status: 409 },
    );
  }

  if (checkoutSession.currency !== "DKK" || currency !== "DKK") {
    console.error("Nets webhook currency mismatch:", {
      checkoutSessionId,
      expected: checkoutSession.currency,
      received: currency,
    });

    return NextResponse.json(
      {
        error: "Currency mismatch",
      },
      { status: 409 },
    );
  }

  if (checkoutSession.amount_minor !== amountMinor) {
    console.error("Nets webhook amount mismatch:", {
      checkoutSessionId,
      expected: checkoutSession.amount_minor,
      received: amountMinor,
    });

    return NextResponse.json(
      {
        error: "Amount mismatch",
      },
      { status: 409 },
    );
  }

  /*
   * Idempotency:
   * If an order already exists for this checkout session,
   * acknowledge the duplicate webhook.
   */

  const { data: existingOrder, error: existingOrderError } = await supabaseAdmin
    .from("orders")
    .select(
      "id, public_token, customer_email, customer_name, confirmation_email_sent_at",
    )
    .eq("checkout_session_id", checkoutSession.id)
    .maybeSingle();

  if (existingOrderError) {
    console.error("Existing order lookup failed:", existingOrderError);

    return NextResponse.json(
      {
        error: "Order lookup failed",
      },
      { status: 500 },
    );
  }

  if (existingOrder) {
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
      } catch (emailError: unknown) {
        console.error(
          "Duplicate paid order confirmation email failed:",
          emailError,
        );
      }
    }

    const now = new Date().toISOString();

    const { error: duplicateSessionUpdateError } = await supabaseAdmin
      .from("checkout_sessions")
      .update({
        status: "completed",
        nets_charge_id: chargeId,
        nets_payment_method: paymentMethod,
        paid_at: now,
        completed_at: now,
        updated_at: now,
      })
      .eq("id", checkoutSession.id);

    if (duplicateSessionUpdateError) {
      console.error(
        "Duplicate checkout session update failed:",
        duplicateSessionUpdateError,
      );

      return NextResponse.json(
        {
          error: "Failed to finalize checkout session",
        },
        { status: 500 },
      );
    }

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
  } catch (emailError: unknown) {
    console.error("Paid order confirmation email failed:", emailError);
  }

  const now = new Date().toISOString();

  const { error: sessionUpdateError } = await supabaseAdmin
    .from("checkout_sessions")
    .update({
      status: "completed",
      nets_charge_id: chargeId,
      nets_payment_method: paymentMethod,
      paid_at: now,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", checkoutSession.id);

  if (sessionUpdateError) {
    console.error("Paid checkout session update failed:", sessionUpdateError);

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
