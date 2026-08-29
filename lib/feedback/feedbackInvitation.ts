import "server-only";

import { sendFeedbackInvitationEmail } from "@/lib/email/orderEmails";
import {
  recordOperationalAlert,
  resolveOperationalAlert,
} from "@/lib/monitoring/operationalAlerts";
import { createAdminClient } from "@/lib/supabase/admin";

const INVITATION_CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

const DEFAULT_FEEDBACK_INVITATION_DELAY_HOURS = 3;
const MAX_FEEDBACK_INVITATION_DELAY_HOURS = 24;

function getFeedbackInvitationDelayHours(): number {
  const configuredValue = process.env.FEEDBACK_INVITATION_DELAY_HOURS?.trim();

  if (!configuredValue) {
    return DEFAULT_FEEDBACK_INVITATION_DELAY_HOURS;
  }

  const parsedValue = Number(configuredValue);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < 0 ||
    parsedValue > MAX_FEEDBACK_INVITATION_DELAY_HOURS
  ) {
    console.error(
      "Invalid FEEDBACK_INVITATION_DELAY_HOURS; using the default delay.",
    );

    return DEFAULT_FEEDBACK_INVITATION_DELAY_HOURS;
  }

  return parsedValue;
}

export async function ensureFeedbackInvitation({
  orderId,
  origin,
}: {
  orderId: number;
  origin: string;
}): Promise<void> {
  const dedupeKey = `customer-feedback-invitation-email:${orderId}`;
  const stateDedupeKey = `customer-feedback-invitation-email-state:${orderId}`;

  const supabaseAdmin = createAdminClient();
  const claimedAt = new Date().toISOString();

  const staleClaimBefore = new Date(
    Date.now() - INVITATION_CLAIM_TIMEOUT_MS,
  ).toISOString();

  const { data: order, error: claimError } = await supabaseAdmin
    .from("orders")
    .update({
      feedback_invitation_email_claimed_at: claimedAt,
      feedback_invitation_email_error: null,
    })
    .eq("id", orderId)
    .eq("status", "completed")
    .not("customer_email", "is", null)
    .is("feedback_invitation_email_sent_at", null)
    .or(
      `feedback_invitation_email_claimed_at.is.null,feedback_invitation_email_claimed_at.lt.${staleClaimBefore}`,
    )
    .select("id, customer_name, customer_email, public_token, completed_at")
    .maybeSingle();

  if (claimError) {
    console.error("Feedback invitation email claim failed:", claimError);

    await recordOperationalAlert({
      dedupeKey,
      category: "customer_feedback_email",
      severity: "warning",
      summary: "The customer feedback invitation email could not be claimed.",
      orderId,
      context: {
        stage: "claim",
        database_code: claimError.code ?? null,
      },
    });

    return;
  }

  if (!order) {
    return;
  }

  const customerEmail =
    typeof order.customer_email === "string" ? order.customer_email.trim() : "";

  if (!customerEmail) {
    await supabaseAdmin
      .from("orders")
      .update({
        feedback_invitation_email_claimed_at: null,
      })
      .eq("id", order.id)
      .eq("feedback_invitation_email_claimed_at", claimedAt);

    return;
  }

  try {
    const normalizedOrigin = origin.replace(/\/+$/, "");

    const completedAtTime = new Date(order.completed_at).getTime();

    if (!Number.isFinite(completedAtTime)) {
      throw new Error("The completed order has an invalid completed_at value.");
    }

    const delayHours = getFeedbackInvitationDelayHours();
    const scheduledForTime = completedAtTime + delayHours * 60 * 60 * 1000;

    const scheduledAt =
      scheduledForTime > Date.now()
        ? new Date(scheduledForTime).toISOString()
        : undefined;

    await sendFeedbackInvitationEmail({
      to: customerEmail,
      customerName: order.customer_name,
      orderId: order.id,
      feedbackUrl: `${normalizedOrigin}/order/${encodeURIComponent(
        String(order.public_token),
      )}/feedback`,
      scheduledAt,
    });

    const { error: sentStateError } = await supabaseAdmin
      .from("orders")
      .update({
        feedback_invitation_email_scheduled_for:
          scheduledAt ?? new Date().toISOString(),
        feedback_invitation_email_sent_at: new Date().toISOString(),
        feedback_invitation_email_claimed_at: null,
        feedback_invitation_email_error: null,
      })
      .eq("id", order.id)
      .eq("feedback_invitation_email_claimed_at", claimedAt);

    if (sentStateError) {
      console.error(
        "Feedback invitation email state update failed:",
        sentStateError,
      );

      await recordOperationalAlert({
        dedupeKey: stateDedupeKey,
        category: "customer_feedback_email",
        severity: "warning",
        summary:
          "The feedback invitation email was delivered, but its delivery state was not saved.",
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
    console.error("Feedback invitation email failed:", emailError);

    const errorMessage =
      emailError instanceof Error
        ? emailError.message
        : "Unknown feedback invitation email error.";

    const { error: releaseError } = await supabaseAdmin
      .from("orders")
      .update({
        feedback_invitation_email_claimed_at: null,
        feedback_invitation_email_error: errorMessage,
      })
      .eq("id", order.id)
      .eq("feedback_invitation_email_claimed_at", claimedAt);

    if (releaseError) {
      console.error(
        "Feedback invitation email claim release failed:",
        releaseError,
      );
    }

    await recordOperationalAlert({
      dedupeKey,
      category: "customer_feedback_email",
      severity: "warning",
      summary: "The customer feedback invitation email was not delivered.",
      orderId,
      context: {
        stage: "send",
      },
    });
  }
}
