import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCopenhagenDateRange } from "@/lib/time/copenhagenDateRange";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 20;
const BATCH_SIZE = 1000;

type DateFilter = "today" | "yesterday" | "lastWeek" | "lastMonth" | "all";

const validFilters: DateFilter[] = [
  "today",
  "yesterday",
  "lastWeek",
  "lastMonth",
  "all",
];

function dateKeyInCopenhagen(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function shiftDateKey(key: string, days: number): string {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getFilterRange(filter: DateFilter) {
  if (filter === "all") return null;

  const today = dateKeyInCopenhagen(new Date());

  if (filter === "today") {
    return getCopenhagenDateRange(today, today);
  }

  if (filter === "yesterday") {
    const yesterday = shiftDateKey(today, -1);
    return getCopenhagenDateRange(yesterday, yesterday);
  }

  if (filter === "lastWeek") {
    return getCopenhagenDateRange(shiftDateKey(today, -7), today);
  }

  return getCopenhagenDateRange(shiftDateKey(today, -30), today);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.app_metadata?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const filterParam = request.nextUrl.searchParams.get("filter") ?? "today";

    if (!validFilters.includes(filterParam as DateFilter)) {
      return NextResponse.json({ error: "Invalid filter" }, { status: 400 });
    }

    const filter = filterParam as DateFilter;
    const pageParam = request.nextUrl.searchParams.get("page") ?? "1";

    if (!/^[1-9]\d*$/.test(pageParam)) {
      return NextResponse.json({ error: "Invalid page" }, { status: 400 });
    }

    const page = Number(pageParam);

    if (!Number.isSafeInteger(page)) {
      return NextResponse.json({ error: "Invalid page" }, { status: 400 });
    }

    const range = getFilterRange(filter);
    const admin = createAdminClient();

    function applyDateFilter<
      T extends {
        gte: (column: string, value: string) => T;
        lt: (column: string, value: string) => T;
      },
    >(query: T): T {
      if (!range) return query;

      return query
        .gte("created_at", range.startUtc.toISOString())
        .lt("created_at", range.endExclusiveUtc.toISOString());
    }

    // Financial totals include every matching order,
    // not just the current visible page.
    let totalCount = 0;
    let totalAmountMinor = 0;
    let offset = 0;

    while (true) {
      const { data, error } = await applyDateFilter(
        admin.from("orders").select("id, total_price"),
      )
        .order("id", { ascending: true })
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) throw error;

      const batch = data ?? [];

      for (const order of batch) {
        const amount = Number(order.total_price);

        if (!Number.isFinite(amount)) {
          throw new Error("Invalid order total");
        }

        totalAmountMinor += Math.round(amount * 100);
      }

      totalCount += batch.length;

      if (batch.length < BATCH_SIZE) break;

      offset += BATCH_SIZE;
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    const safePage = Math.min(page, totalPages);
    const pageOffset = (safePage - 1) * PAGE_SIZE;

    const { data: orders, error: ordersError } = await applyDateFilter(
      admin.from("orders").select("*, order_items (*)"),
    )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(pageOffset, pageOffset + PAGE_SIZE - 1);

    if (ordersError) throw ordersError;

    const orderIds = (orders ?? []).map((order) => order.id);

    const feedbackByOrderId = new Map<
      number,
      {
        rating: number;
        admin_seen_at: string | null;
        admin_replied_at: string | null;
        created_at: string;
      }
    >();

    if (orderIds.length > 0) {
      const { data: feedback, error: feedbackError } = await admin
        .from("order_feedback")
        .select("order_id, rating, admin_seen_at, admin_replied_at, created_at")
        .in("order_id", orderIds);

      if (feedbackError) throw feedbackError;

      for (const item of feedback ?? []) {
        feedbackByOrderId.set(item.order_id, {
          rating: item.rating,
          admin_seen_at: item.admin_seen_at,
          admin_replied_at: item.admin_replied_at,
          created_at: item.created_at,
        });
      }
    }

    const ordersWithFeedback = (orders ?? []).map((order) => ({
      ...order,
      feedback_summary: feedbackByOrderId.get(order.id) ?? null,
    }));

    return NextResponse.json(
      {
        orders: ordersWithFeedback,
        filter,
        page: safePage,
        pageSize: PAGE_SIZE,
        totalCount,
        totalPages,
        totalAmount: totalAmountMinor / 100,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Paginated admin orders error:", error);

    return NextResponse.json(
      { error: "Could not load orders" },
      { status: 500 },
    );
  }
}
