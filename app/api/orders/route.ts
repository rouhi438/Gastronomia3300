// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!supabase) {
      return NextResponse.json(
        {
          error:
            "Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        },
        { status: 500 },
      );
    }

    // ===== 1. Extract data from request =====
    const {
      user_id,
      total_price,
      delivery_method,
      payment_method,
      customer_name,
      customer_phone,
      customer_address,
      items,
    } = body;

    // ===== 2. Validate required fields =====
    if (!total_price || !customer_name || !customer_phone || !items) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // ===== 3. Insert order =====
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user_id || null,
        total_price,
        delivery_method: delivery_method || "pickup",
        payment_method: payment_method || "mobilepay",
        customer_name,
        customer_phone,
        customer_address: customer_address || null,
        status: "modtaget",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order insert error:", orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // ===== 4. Insert order items =====
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      item_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      size: item.size || "normal",
      extras: item.extras || [],
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Order items insert error:", itemsError);
      // Optionally delete the order if items fail? For now, just return error
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // ===== 5. Return success =====
    return NextResponse.json(
      { message: "Order created successfully", order_id: order.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
