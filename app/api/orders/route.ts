// app/api/orders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

function isValidRequestedTime(value: unknown): value is string {
  if (value === "asap") {
    return true;
  }

  if (typeof value !== "string") {
    return false;
  }

  const match = value.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    return false;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (![0, 15, 30, 45].includes(minutes)) {
    return false;
  }

  const requestedMinutes = hours * 60 + minutes;
  const openingMinutes = 15 * 60 + 30;
  const closingMinutes = 20 * 60 + 30;

  return (
    requestedMinutes >= openingMinutes && requestedMinutes <= closingMinutes
  );
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // ===== 1. Extract data from request =====
    const {
      user_id,
      total_price,
      delivery_method,
      payment_method,
      customer_name,
      customer_phone,
      customer_email,
      customer_address,
      order_note,
      requested_time,
      items,
    } = body;

    // ===== 2. Validate required order fields =====
    if (
      typeof total_price !== "number" ||
      total_price <= 0 ||
      typeof customer_name !== "string" ||
      !customer_name.trim() ||
      typeof customer_phone !== "string" ||
      !customer_phone.trim() ||
      typeof customer_email !== "string" ||
      !customer_email.trim() ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 },
      );
    }

    // ===== 3. Validate requested time =====
    if (!isValidRequestedTime(requested_time)) {
      return NextResponse.json(
        { error: "Invalid requested time" },
        { status: 400 },
      );
    }

    // ===== 4. Validate order items =====
    const hasInvalidItem = items.some((item: unknown) => {
      if (!item || typeof item !== "object") {
        return true;
      }

      const orderItem = item as Record<string, unknown>;

      return (
        typeof orderItem.name !== "string" ||
        !orderItem.name.trim() ||
        typeof orderItem.quantity !== "number" ||
        !Number.isInteger(orderItem.quantity) ||
        orderItem.quantity <= 0 ||
        typeof orderItem.price !== "number" ||
        orderItem.price < 0
      );
    });

    if (hasInvalidItem) {
      return NextResponse.json(
        { error: "Invalid order items" },
        { status: 400 },
      );
    }

    // ===== 5. Insert order =====
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user_id || null,
        total_price,
        delivery_method: delivery_method || "pickup",
        payment_method: payment_method || "mobilepay",
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        customer_email: customer_email.trim(),
        customer_address:
          typeof customer_address === "string" && customer_address.trim()
            ? customer_address.trim()
            : null,
        order_note:
          typeof order_note === "string" && order_note.trim()
            ? order_note.trim()
            : null,
        requested_time,
        status: "pending",
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Order insert error:", orderError);

      return NextResponse.json(
        {
          error: orderError?.message || "Failed to create order",
        },
        { status: 500 },
      );
    }

    // ===== 6. Prepare order items =====
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      item_name: item.name.trim(),
      quantity: item.quantity,
      unit_price: item.price,
      size: item.deepPan
        ? "deepPan"
        : typeof item.size === "string" && item.size
          ? item.size
          : "normal",
      extras: Array.isArray(item.extras) ? item.extras : [],
    }));

    // ===== 7. Insert order items =====
    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Order items insert error:", itemsError);

      // Remove the incomplete order if its items could not be saved.
      const { error: rollbackError } = await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      if (rollbackError) {
        console.error("Order rollback error:", rollbackError);
      }

      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // ===== 8. Return success =====
    return NextResponse.json(
      {
        message: "Order created successfully",
        order_id: order.id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unexpected order creation error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
