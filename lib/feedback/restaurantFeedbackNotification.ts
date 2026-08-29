import "server-only";

import { sendRestaurantFeedbackEmail } from "@/lib/email/restaurantEmails";
import {
  recordOperationalAlert,
  resolveOperationalAlert,
} from "@/lib/monitoring/operationalAlerts";
import { createAdminClient } from "@/lib/supabase/admin";

const NOTIFICATION_CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

export async function ensureRestaurantFeedbackNotification({
  feedbackId,
  orderId,
  origin,
}: {
  feedbackId: number;
  orderId: number;
  origin: string;
}): Promise<void> {
  const dedupeKey = `restaurant-feedback-email:${feedbackId}`;
  const stateDedupeKey = `restaurant-feedback-email-state:${feedbackId}`;

  const supabaseAdmin = createAdminClient();
  const claimedAt = new Date().toISOString();

  const staleClaimBefore = new Date(
    Date.now() - NOTIFICATION_CLAIM_TIMEOUT_MS,
  ).toISOString();

  const { data: feedback, error: claimError } = await supabaseAdmin
    .from("order_feedback")
    .update({
      restaurant_notification_email_claimed_at: claimedAt,
      restaurant_notification_email_error: null,
    })
    .eq("id", feedbackId)
    .eq("order_id", orderId)
    .is("restaurant_notification_email_sent_at", null)
    .or(
      `restaurant_notification_email_claimed_at.is.null,restaurant_notification_email_claimed_at.lt.${staleClaimBefore}`,
    )
    .select("id, order_id, rating, private_message")
    .maybeSingle();

  if (claimError) {
    console.error("Restaurant feedback email claim failed:", claimError);

    await recordOperationalAlert({
      dedupeKey,
      category: "restaurant_feedback_email",
      severity: "warning",
      summary: "The restaurant feedback email could not be claimed.",
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

  try {
    const normalizedOrigin = origin.replace(/\/+$/, "");

    await sendRestaurantFeedbackEmail({
      orderId: feedback.order_id,
      rating: feedback.rating,
      hasPrivateMessage:
        typeof feedback.private_message === "string" &&
        feedback.private_message.trim().length > 0,
      adminUrl: `${normalizedOrigin}/admin/feedback/${feedback.order_id}`,
    });

    const { error: sentStateError } = await supabaseAdmin
      .from("order_feedback")
      .update({
        restaurant_notification_email_sent_at: new Date().toISOString(),
        restaurant_notification_email_claimed_at: null,
        restaurant_notification_email_error: null,
      })
      .eq("id", feedback.id)
      .eq("restaurant_notification_email_claimed_at", claimedAt);

    if (sentStateError) {
      console.error(
        "Restaurant feedback email state update failed:",
        sentStateError,
      );

      await recordOperationalAlert({
        dedupeKey: stateDedupeKey,
        category: "restaurant_feedback_email",
        severity: "warning",
        summary:
          "The restaurant feedback email was delivered, but its delivery state was not saved.",
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
    console.error("Restaurant feedback email failed:", emailError);

    const errorMessage =
      emailError instanceof Error
        ? emailError.message
        : "Unknown restaurant feedback email error.";

    const { error: releaseError } = await supabaseAdmin
      .from("order_feedback")
      .update({
        restaurant_notification_email_claimed_at: null,
        restaurant_notification_email_error: errorMessage,
      })
      .eq("id", feedback.id)
      .eq("restaurant_notification_email_claimed_at", claimedAt);

    if (releaseError) {
      console.error(
        "Restaurant feedback email claim release failed:",
        releaseError,
      );
    }

    await recordOperationalAlert({
      dedupeKey,
      category: "restaurant_feedback_email",
      severity: "warning",
      summary: "The restaurant feedback email was not delivered.",
      orderId,
      context: {
        stage: "send",
      },
    });
  }
}
