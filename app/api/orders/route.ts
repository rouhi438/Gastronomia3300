import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type OrderItemRequest = {
  name?: unknown;
  quantity?: unknown;
  price?: unknown;
  size?: unknown;
  deepPan?: unknown;
  extras?: unknown;
};

type CreateOrderRequest = {
  total_price?: unknown;
  delivery_method?: unknown;
  payment_method?: unknown;
  customer_name?: unknown;
  customer_phone?: unknown;
  customer_email?: unknown;
  customer_address?: unknown;
  order_note?: unknown;
  requested_time?: unknown;
  items?: unknown;
};

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

  if (
    !Number.isInteger(hours) ||
    hours < 0 ||
    hours > 23 ||
    ![0, 15, 30, 45].includes(minutes)
  ) {
    return false;
  }

  const requestedMinutes = hours * 60 + minutes;
  const openingMinutes = 15 * 60 + 30;
  const closingMinutes = 20 * 60 + 30;

  return (
    requestedMinutes >= openingMinutes && requestedMinutes <= closingMinutes
  );
}

function getOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue || null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateOrderRequest;

    const totalPrice = body.total_price;
    const customerName = getOptionalString(body.customer_name);
    const customerPhone = getOptionalString(body.customer_phone);
    const customerEmail = getOptionalString(body.customer_email);
    const customerAddress = getOptionalString(body.customer_address);
    const orderNote = getOptionalString(body.order_note);

    const deliveryMethod =
      typeof body.delivery_method === "string"
        ? body.delivery_method.trim().toLowerCase()
        : "pickup";

    const paymentMethod =
      typeof body.payment_method === "string"
        ? body.payment_method.trim().toLowerCase()
        : "mobilepay";

    const requestedTime = body.requested_time;
    const items = body.items;

    // ===== Validate required fields =====
    if (
      typeof totalPrice !== "number" ||
      !Number.isFinite(totalPrice) ||
      totalPrice <= 0 ||
      !customerName ||
      !customerPhone ||
      !customerEmail ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 },
      );
    }

    // ===== Validate delivery method =====
    if (!["pickup", "delivery"].includes(deliveryMethod)) {
      return NextResponse.json(
        { error: "Invalid delivery method" },
        { status: 400 },
      );
    }

    if (deliveryMethod === "delivery" && !customerAddress) {
      return NextResponse.json(
        { error: "Customer address is required for delivery" },
        { status: 400 },
      );
    }

    // ===== Validate payment method =====
    if (!["mobilepay", "cash", "card"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 },
      );
    }

    // ===== Validate requested time =====
    if (!isValidRequestedTime(requestedTime)) {
      return NextResponse.json(
        { error: "Invalid requested time" },
        { status: 400 },
      );
    }

    // ===== Validate order items =====
    const normalizedItems = items.map((item: unknown) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const orderItem = item as OrderItemRequest;

      const name =
        typeof orderItem.name === "string" ? orderItem.name.trim() : "";

      const quantity = orderItem.quantity;
      const price = orderItem.price;

      if (
        !name ||
        typeof quantity !== "number" ||
        !Number.isInteger(quantity) ||
        quantity <= 0 ||
        typeof price !== "number" ||
        !Number.isFinite(price) ||
        price < 0
      ) {
        return null;
      }

      const size =
        orderItem.deepPan === true
          ? "deepPan"
          : typeof orderItem.size === "string" && orderItem.size.trim()
            ? orderItem.size.trim()
            : "normal";

      const extras = Array.isArray(orderItem.extras) ? orderItem.extras : [];

      return {
        item_name: name,
        quantity,
        unit_price: price,
        size,
        extras,
      };
    });

    if (normalizedItems.some((item) => item === null)) {
      return NextResponse.json(
        { error: "Invalid order items" },
        { status: 400 },
      );
    }

    // ===== Get authenticated user, if available =====
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id ?? null;

    // ===== Create order with server-only admin client =====
    const supabaseAdmin = createAdminClient();

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        total_price: totalPrice,
        delivery_method: deliveryMethod,
        payment_method: paymentMethod,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        customer_address:
          deliveryMethod === "delivery" ? customerAddress : null,
        order_note: orderNote,
        requested_time: requestedTime,
        status: "pending",
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Order insert error:", orderError);

      return NextResponse.json(
        {
          error: orderError?.message ?? "Failed to create order",
        },
        { status: 500 },
      );
    }

    // ===== Add order ID to items =====
    const orderItems = normalizedItems.map((item) => ({
      ...item!,
      order_id: order.id,
    }));

    // ===== Insert order items =====
    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Order items insert error:", itemsError);

      // Remove incomplete order
      const { error: rollbackError } = await supabaseAdmin
        .from("orders")
        .delete()
        .eq("id", order.id);

      if (rollbackError) {
        console.error("Order rollback error:", rollbackError);
      }

      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: "Order created successfully",
        order_id: order.id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unexpected order creation error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
