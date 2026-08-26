import "server-only";

import { sendRestaurantNewOrderEmail } from "@/lib/email/restaurantEmails";
import {
  recordOperationalAlert,
  resolveOperationalAlert,
} from "@/lib/monitoring/operationalAlerts";
import { createAdminClient } from "@/lib/supabase/admin";

const NOTIFICATION_CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

export async function ensureRestaurantNewOrderNotification({
  orderId,
  origin,
}: {
  orderId: number;
  origin: string;
}): Promise<void> {
  const dedupeKey = `restaurant-new-order-email:${orderId}`;
  const stateDedupeKey = `restaurant-new-order-email-state:${orderId}`;
  const supabaseAdmin = createAdminClient();
  const claimedAt = new Date().toISOString();
  const staleClaimBefore = new Date(
    Date.now() - NOTIFICATION_CLAIM_TIMEOUT_MS,
  ).toISOString();

  const { data: order, error: claimError } = await supabaseAdmin
    .from("orders")
    .update({
      restaurant_notification_email_claimed_at: claimedAt,
    })
    .eq("id", orderId)
    .is("restaurant_notification_email_sent_at", null)
    .or(
      `restaurant_notification_email_claimed_at.is.null,restaurant_notification_email_claimed_at.lt.${staleClaimBefore}`,
    )
    .select("id, delivery_method, requested_time, total_price")
    .maybeSingle();

  if (claimError) {
    console.error("Restaurant order email claim failed:", claimError);

    await recordOperationalAlert({
      dedupeKey,
      category: "restaurant_order_email",
      severity: "warning",
      summary: "The fallback new-order email could not be claimed.",
      orderId,
      context: {
        stage: "claim",
      },
    });

    return;
  }

  if (!order) {
    return;
  }

  try {
    await sendRestaurantNewOrderEmail({
      orderId: order.id,
      adminUrl: `${origin.replace(/\/+$/, "")}/admin/orders`,
      deliveryMethod: order.delivery_method,
      requestedTime: order.requested_time,
      totalPrice: order.total_price,
    });

    const { error: sentStateError } = await supabaseAdmin
      .from("orders")
      .update({
        restaurant_notification_email_sent_at: new Date().toISOString(),
        restaurant_notification_email_claimed_at: null,
      })
      .eq("id", order.id)
      .eq("restaurant_notification_email_claimed_at", claimedAt);

    if (sentStateError) {
      console.error(
        "Restaurant order email state update failed:",
        sentStateError,
      );

      await recordOperationalAlert({
        dedupeKey: stateDedupeKey,
        category: "restaurant_order_email",
        severity: "warning",
        summary:
          "The restaurant email was delivered, but its delivery state was not saved.",
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
    console.error("Restaurant new-order fallback email failed:", emailError);

    const { error: releaseError } = await supabaseAdmin
      .from("orders")
      .update({
        restaurant_notification_email_claimed_at: null,
      })
      .eq("id", order.id)
      .eq("restaurant_notification_email_claimed_at", claimedAt);

    if (releaseError) {
      console.error(
        "Restaurant order email claim release failed:",
        releaseError,
      );
    }

    await recordOperationalAlert({
      dedupeKey,
      category: "restaurant_order_email",
      severity: "critical",
      summary: "The fallback new-order email was not delivered.",
      orderId,
      context: {
        stage: "send",
      },
      notify: true,
    });
  }
}
