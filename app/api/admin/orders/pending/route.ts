import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recordOperationalAlert } from "@/lib/monitoring/operationalAlerts";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const UNHANDLED_ORDER_THRESHOLD_MS = 5 * 60 * 1000;

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: NextResponse.json({ error: "Ikke logget ind." }, { status: 401 }),
    };
  }

  if (user.app_metadata?.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Ingen adgang." }, { status: 403 }),
    };
  }

  return { error: null };
}

export async function GET() {
  try {
    const auth = await requireAdmin();

    if (auth.error) {
      return auth.error;
    }

    const supabaseAdmin = createAdminClient();

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, created_at, checkout_session_id")
      .eq("status", "pending")
      .order("created_at", {
        ascending: true,
      })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Pending order fetch error:", error);

      return NextResponse.json(
        {
          error: "Kunne ikke kontrollere nye ordrer.",
        },
        { status: 500 },
      );
    }

    if (order) {
      const createdAt = Date.parse(order.created_at);

      if (
        Number.isFinite(createdAt) &&
        Date.now() - createdAt >= UNHANDLED_ORDER_THRESHOLD_MS
      ) {
        await recordOperationalAlert({
          dedupeKey: `pending-order-unhandled:${order.id}`,
          category: "pending_order",
          severity: "critical",
          summary:
            "A paid order has remained pending for more than five minutes.",
          checkoutSessionId: order.checkout_session_id,
          orderId: order.id,
          context: {
            threshold_minutes: 5,
          },
          notify: true,
        });
      }
    }

    return NextResponse.json(
      {
        order: order ?? null,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error: unknown) {
    console.error("Unexpected pending order error:", error);

    return NextResponse.json(
      {
        error: "Der opstod en uventet fejl.",
      },
      { status: 500 },
    );
  }
}
