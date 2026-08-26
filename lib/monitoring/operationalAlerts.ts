import "server-only";

import { sendOperationalAlertEmail } from "@/lib/email/restaurantEmails";
import { createAdminClient } from "@/lib/supabase/admin";

type AlertContextValue = string | number | boolean | null;

export type OperationalAlertInput = {
  dedupeKey: string;
  category: string;
  severity: "warning" | "critical";
  summary: string;
  checkoutSessionId?: string | null;
  orderId?: number | null;
  context?: Record<string, AlertContextValue>;
  notify?: boolean;
};

const NOTIFICATION_CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

export async function recordOperationalAlert({
  dedupeKey,
  category,
  severity,
  summary,
  checkoutSessionId = null,
  orderId = null,
  context = {},
  notify = false,
}: OperationalAlertInput): Promise<void> {
  try {
    const supabaseAdmin = createAdminClient();
    const now = new Date().toISOString();

    const { data: alert, error: alertError } = await supabaseAdmin
      .from("operational_alerts")
      .upsert(
        {
          dedupe_key: dedupeKey.slice(0, 200),
          category: category.slice(0, 80),
          severity,
          summary: summary.slice(0, 500),
          checkout_session_id: checkoutSessionId,
          order_id: orderId,
          context,
          last_seen_at: now,
          resolved_at: null,
        },
        {
          onConflict: "dedupe_key",
        },
      )
      .select("id, notified_at")
      .single();

    if (alertError || !alert) {
      console.error("Operational alert persistence failed:", alertError);
      return;
    }

    if (!notify || alert.notified_at) {
      return;
    }

    const staleClaimBefore = new Date(
      Date.now() - NOTIFICATION_CLAIM_TIMEOUT_MS,
    ).toISOString();

    const { data: claimedAlert, error: claimError } = await supabaseAdmin
      .from("operational_alerts")
      .update({
        notification_claimed_at: now,
        notification_error: null,
      })
      .eq("id", alert.id)
      .is("notified_at", null)
      .or(
        `notification_claimed_at.is.null,notification_claimed_at.lt.${staleClaimBefore}`,
      )
      .select("id")
      .maybeSingle();

    if (claimError) {
      console.error("Operational alert notification claim failed:", claimError);
      return;
    }

    if (!claimedAlert) {
      return;
    }

    try {
      await sendOperationalAlertEmail({
        severity,
        category,
        summary,
        checkoutSessionId,
        orderId,
        detectedAt: now,
      });

      const { error: notificationUpdateError } = await supabaseAdmin
        .from("operational_alerts")
        .update({
          notified_at: new Date().toISOString(),
          notification_claimed_at: null,
          notification_error: null,
        })
        .eq("id", alert.id)
        .eq("notification_claimed_at", now);

      if (notificationUpdateError) {
        console.error(
          "Operational alert notification state update failed:",
          notificationUpdateError,
        );
      }
    } catch (notificationError: unknown) {
      console.error("Operational alert email failed:", notificationError);

      const { error: notificationErrorUpdateError } = await supabaseAdmin
        .from("operational_alerts")
        .update({
          notification_claimed_at: null,
          notification_error: "Alert email delivery failed.",
        })
        .eq("id", alert.id)
        .eq("notification_claimed_at", now);

      if (notificationErrorUpdateError) {
        console.error(
          "Operational alert email error state update failed:",
          notificationErrorUpdateError,
        );
      }
    }
  } catch (error: unknown) {
    console.error("Unexpected operational alert failure:", error);
  }
}

export async function resolveOperationalAlert(
  dedupeKey: string,
): Promise<void> {
  try {
    const supabaseAdmin = createAdminClient();

    const { error } = await supabaseAdmin
      .from("operational_alerts")
      .update({
        resolved_at: new Date().toISOString(),
      })
      .eq("dedupe_key", dedupeKey)
      .is("resolved_at", null);

    if (error) {
      console.error("Operational alert resolution failed:", error);
    }
  } catch (error: unknown) {
    console.error("Unexpected operational alert resolution failure:", error);
  }
}
