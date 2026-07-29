import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        {
          error:
            "Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        },
        { status: 500 },
      );
    }

    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ===== Verify user and admin role =====
    const { data: userData, error: userError } =
      await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const role = userData.user.user_metadata?.role;
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ===== Fetch orders with items =====
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_items (*)
      `,
      )
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Orders fetch error:", ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    return NextResponse.json({ orders }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        {
          error:
            "Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        },
        { status: 500 },
      );
    }

    const token = request.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData, error: userError } =
      await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const role = userData.user.user_metadata?.role;

    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const orderId = Number(body.orderId);
    const status = body.status;
    const cancelReason =
      typeof body.cancelReason === "string" ? body.cancelReason.trim() : null;

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    if (!["accepted", "cancelled"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid order status" },
        { status: 400 },
      );
    }

    if (status === "cancelled" && !cancelReason) {
      return NextResponse.json(
        { error: "Cancellation reason is required" },
        { status: 400 },
      );
    }

    const updateData =
      status === "cancelled"
        ? {
            status: "cancelled",
            cancel_reason: cancelReason,
          }
        : {
            status: "accepted",
            cancel_reason: null,
          };

    const { data: order, error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .eq("status", "pending")
      .select(
        `
        *,
        order_items (*)
      `,
      )
      .single();

    if (updateError) {
      console.error("Order update error:", updateError);

      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ order }, { status: 200 });
  } catch (error) {
    console.error("Unexpected PATCH error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
