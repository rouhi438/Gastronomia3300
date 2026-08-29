import "server-only";

import { sendFeedbackReplyEmail } from "@/lib/email/orderEmails";
import {
  recordOperationalAlert,
  resolveOperationalAlert,
} from "@/lib/monitoring/operationalAlerts";
import { createAdminClient } from "@/lib/supabase/admin";

const NOTIFICATION_CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

export async function ensureFeedbackReplyNotification({
  feedbackId,
  orderId,
  origin,
}: {
  feedbackId: number;
  orderId: number;
  origin: string;
}): Promise<void> {
  const dedupeKey = `customer-feedback-reply-email:${feedbackId}`;
  const stateDedupeKey = `customer-feedback-reply-email-state:${feedbackId}`;

  const supabaseAdmin = createAdminClient();
  const claimedAt = new Date().toISOString();

  const staleClaimBefore = new Date(
    Date.now() - NOTIFICATION_CLAIM_TIMEOUT_MS,
  ).toISOString();

  const { data: feedback, error: claimError } = await supabaseAdmin
    .from("order_feedback")
    .update({
      customer_reply_email_claimed_at: claimedAt,
      customer_reply_email_error: null,
    })
    .eq("id", feedbackId)
    .eq("order_id", orderId)
    .not("admin_reply", "is", null)
    .is("customer_reply_email_sent_at", null)
    .or(
      `customer_reply_email_claimed_at.is.null,customer_reply_email_claimed_at.lt.${staleClaimBefore}`,
    )
    .select("id, order_id")
    .maybeSingle();

  if (claimError) {
    console.error("Feedback reply email claim failed:", claimError);

    await recordOperationalAlert({
      dedupeKey,
      category: "customer_feedback_email",
      severity: "warning",
      summary: "The customer feedback reply email could not be claimed.",
      orderId,
      context: {
        stage: "claim",
        database_code: claimError.code ?? null,
      },
    });

    return;
  }

  if (!feedback) {
    return;
  }

  const releaseClaim = async (errorMessage: string | null = null) => {
    const { error: releaseError } = await supabaseAdmin
      .from("order_feedback")
      .update({
        customer_reply_email_claimed_at: null,
        customer_reply_email_error: errorMessage,
      })
      .eq("id", feedback.id)
      .eq("customer_reply_email_claimed_at", claimedAt);

    if (releaseError) {
      console.error("Feedback reply email claim release failed:", releaseError);
    }
  };

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, customer_name, customer_email, public_token")
    .eq("id", feedback.order_id)
    .maybeSingle();

  if (orderError) {
    console.error("Feedback reply email order lookup failed:", orderError);

    await releaseClaim(orderError.message);

    await recordOperationalAlert({
      dedupeKey,
      category: "customer_feedback_email",
      severity: "warning",
      summary:
        "The order for a customer feedback reply email could not be loaded.",
      orderId,
      context: {
        stage: "order_lookup",
        database_code: orderError.code ?? null,
      },
    });

    return;
  }

  const customerEmail =
    typeof order?.customer_email === "string"
      ? order.customer_email.trim()
      : "";

  if (!order || !customerEmail) {
    await releaseClaim();

    return;
  }

  try {
    const normalizedOrigin = origin.replace(/\/+$/, "");

    await sendFeedbackReplyEmail({
      to: customerEmail,
      customerName: order.customer_name,
      orderId: order.id,
      feedbackUrl: `${normalizedOrigin}/order/${encodeURIComponent(
        String(order.public_token),
      )}/feedback`,
    });

    const { error: sentStateError } = await supabaseAdmin
      .from("order_feedback")
      .update({
        customer_reply_email_sent_at: new Date().toISOString(),
        customer_reply_email_claimed_at: null,
        customer_reply_email_error: null,
      })
      .eq("id", feedback.id)
      .eq("customer_reply_email_claimed_at", claimedAt);

    if (sentStateError) {
      console.error(
        "Feedback reply email state update failed:",
        sentStateError,
      );

      await recordOperationalAlert({
        dedupeKey: stateDedupeKey,
        category: "customer_feedback_email",
        severity: "warning",
        summary:
          "The feedback reply email was delivered, but its delivery state was not saved.",
        orderId,
        context: {
          stage: "persist_sent_state",
          database_code: sentStateError.code ?? null,
        },
      });
    } else {
      await resolveOperationalAlert(stateDedupeKey);
    }

    await resolveOperationalAlert(dedupeKey);
  } catch (emailError: unknown) {
    console.error("Feedback reply email failed:", emailError);

    const errorMessage =
      emailError instanceof Error
        ? emailError.message
        : "Unknown feedback reply email error.";

    await releaseClaim(errorMessage);

    await recordOperationalAlert({
      dedupeKey,
      category: "customer_feedback_email",
      severity: "warning",
      summary: "The customer feedback reply email was not delivered.",
      orderId,
      context: {
        stage: "send",
      },
    });
  }
}
