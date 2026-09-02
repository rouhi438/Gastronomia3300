import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCopenhagenDateRange } from "@/lib/time/copenhagenDateRange";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 1000;
const TIME_ZONE = "Europe/Copenhagen";

const STATUS_ORDER = ["pending", "accepted", "ready", "completed", "cancelled"];

type RefundStatus = "pending" | "completed" | "failed";
type PaymentMethod = "card" | "mobilepay" | "other";

type AccountingOrderRow = {
  id: number;
  created_at: string;
  status: string;
  payment_method: string;
  total_price: number | string;
  refund_status: RefundStatus | null;
  refund_amount_minor: number | null;
};

type SummaryBucket = {
  orderCount: number;
  grossAmountMinor: number;
  completedRefundAmountMinor: number;
};

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: jsonNoStore({ error: "Unauthorized" }, 401),
    };
  }

  if (user.app_metadata?.role !== "admin") {
    return {
      error: jsonNoStore({ error: "Forbidden" }, 403),
    };
  }

  return {
    error: null,
  };
}

function createSummaryBucket(): SummaryBucket {
  return {
    orderCount: 0,
    grossAmountMinor: 0,
    completedRefundAmountMinor: 0,
  };
}

function kronerToMinor(value: number | string): number {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("An order contains an invalid total price.");
  }

  return Math.round(amount * 100);
}

function normalizeRefundAmount(value: number | null): number {
  if (value === null) {
    return 0;
  }

  const amount = Number(value);

  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("An order contains an invalid refund amount.");
  }

  return amount;
}

function normalizePaymentMethod(value: string): PaymentMethod {
  if (value === "card" || value === "mobilepay") {
    return value;
  }

  return "other";
}

function finalizeBucket(bucket: SummaryBucket) {
  return {
    ...bucket,
    netAmountMinor: bucket.grossAmountMinor - bucket.completedRefundAmountMinor,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();

    if (auth.error) {
      return auth.error;
    }

    const from = request.nextUrl.searchParams.get("from")?.trim() ?? "";
    const to = request.nextUrl.searchParams.get("to")?.trim() ?? "";

    const dateRange = getCopenhagenDateRange(from, to);

    if (!dateRange) {
      return jsonNoStore(
        {
          error:
            "A valid from/to date range is required. Dates must use YYYY-MM-DD.",
        },
        400,
      );
    }

    const supabaseAdmin = createAdminClient();
    const orders: AccountingOrderRow[] = [];

    let offset = 0;

    while (true) {
      const { data, error } = await supabaseAdmin
        .from("orders")
        .select(
          `
            id,
            created_at,
            status,
            payment_method,
            total_price,
            refund_status,
            refund_amount_minor
          `,
        )
        .gte("created_at", dateRange.startUtc.toISOString())
        .lt("created_at", dateRange.endExclusiveUtc.toISOString())
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error("Accounting report orders fetch failed:", error);

        return jsonNoStore(
          {
            error: "Could not load accounting report orders.",
          },
          500,
        );
      }

      const page = (data ?? []) as AccountingOrderRow[];

      orders.push(...page);

      if (page.length < PAGE_SIZE) {
        break;
      }

      offset += PAGE_SIZE;
    }

    const paymentBuckets: Record<PaymentMethod, SummaryBucket> = {
      card: createSummaryBucket(),
      mobilepay: createSummaryBucket(),
      other: createSummaryBucket(),
    };

    const statusBuckets = new Map<
      string,
      {
        orderCount: number;
        grossAmountMinor: number;
      }
    >();

    let grossAmountMinor = 0;
    let completedRefundAmountMinor = 0;
    let pendingRefundAmountMinor = 0;
    let failedRefundAmountMinor = 0;

    let completedRefundCount = 0;
    let pendingRefundCount = 0;
    let failedRefundCount = 0;

    const exceptionOrders: Array<{
      id: number;
      createdAt: string;
      status: string;
      paymentMethod: PaymentMethod;
      totalAmountMinor: number;
      refundStatus: RefundStatus | null;
      refundAmountMinor: number | null;
    }> = [];

    for (const order of orders) {
      const totalAmountMinor = kronerToMinor(order.total_price);
      const refundAmountMinor = normalizeRefundAmount(
        order.refund_amount_minor,
      );

      const paymentMethod = normalizePaymentMethod(order.payment_method);
      const paymentBucket = paymentBuckets[paymentMethod];

      grossAmountMinor += totalAmountMinor;

      paymentBucket.orderCount += 1;
      paymentBucket.grossAmountMinor += totalAmountMinor;

      const statusBucket = statusBuckets.get(order.status) ?? {
        orderCount: 0,
        grossAmountMinor: 0,
      };

      statusBucket.orderCount += 1;
      statusBucket.grossAmountMinor += totalAmountMinor;

      statusBuckets.set(order.status, statusBucket);

      if (order.refund_status === "completed") {
        completedRefundCount += 1;
        completedRefundAmountMinor += refundAmountMinor;
        paymentBucket.completedRefundAmountMinor += refundAmountMinor;
      }

      if (order.refund_status === "pending") {
        pendingRefundCount += 1;
        pendingRefundAmountMinor += refundAmountMinor;
      }

      if (order.refund_status === "failed") {
        failedRefundCount += 1;
        failedRefundAmountMinor += refundAmountMinor;
      }

      if (
        order.status === "pending" ||
        order.status === "cancelled" ||
        order.refund_status !== null
      ) {
        exceptionOrders.push({
          id: order.id,
          createdAt: order.created_at,
          status: order.status,
          paymentMethod,
          totalAmountMinor,
          refundStatus: order.refund_status,
          refundAmountMinor:
            order.refund_amount_minor === null ? null : refundAmountMinor,
        });
      }
    }

    const statusBreakdown = [...statusBuckets.entries()]
      .map(([status, values]) => ({
        status,
        ...values,
      }))
      .sort((first, second) => {
        const firstIndex = STATUS_ORDER.indexOf(first.status);
        const secondIndex = STATUS_ORDER.indexOf(second.status);

        return (
          (firstIndex === -1 ? Number.MAX_SAFE_INTEGER : firstIndex) -
          (secondIndex === -1 ? Number.MAX_SAFE_INTEGER : secondIndex)
        );
      });

    return jsonNoStore({
      generatedAt: new Date().toISOString(),

      range: {
        from,
        to,
        timeZone: TIME_ZONE,
      },

      summary: {
        orderCount: orders.length,
        grossAmountMinor,
        completedRefundAmountMinor,
        netAmountMinor: grossAmountMinor - completedRefundAmountMinor,
      },

      paymentMethods: {
        card: finalizeBucket(paymentBuckets.card),
        mobilepay: finalizeBucket(paymentBuckets.mobilepay),
        other: finalizeBucket(paymentBuckets.other),
      },

      refunds: {
        completed: {
          count: completedRefundCount,
          amountMinor: completedRefundAmountMinor,
        },
        pending: {
          count: pendingRefundCount,
          amountMinor: pendingRefundAmountMinor,
        },
        failed: {
          count: failedRefundCount,
          amountMinor: failedRefundAmountMinor,
        },
      },

      statusBreakdown,
      exceptionOrders,
    });
  } catch (error) {
    console.error("Unexpected accounting report error:", error);

    return jsonNoStore(
      {
        error: "Internal server error",
      },
      500,
    );
  }
}
