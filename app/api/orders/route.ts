import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extraGroups, menuData, type MenuItem } from "@/data/menu";
import { DELIVERY_FEE } from "@/lib/delivery";

type OrderItemRequest = {
  id?: unknown;
  quantity?: unknown;
  size?: unknown;
  deepPan?: unknown;
  extras?: unknown;
};

type OrderExtraRequest = {
  name?: unknown;
  groupId?: unknown;
};

type CreateOrderRequest = {
  delivery_method?: unknown;
  payment_method?: unknown;
  bag_included?: unknown;
  bagIncluded?: unknown;
  customer_name?: unknown;
  customer_phone?: unknown;
  customer_email?: unknown;
  customer_address?: unknown;
  order_note?: unknown;
  requested_time?: unknown;
  items?: unknown;
};

type NormalizedOrderItem = {
  item_name: string;
  quantity: number;
  unit_price: number;
  size: "normal" | "family" | "children" | "deepPan";
  extras: string[];
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

function normalizeRequestedSize(
  orderItem: OrderItemRequest,
): "normal" | "family" | "children" | "deepPan" | null {
  if (orderItem.deepPan === true) {
    return "deepPan";
  }

  if (typeof orderItem.size !== "string") {
    return null;
  }

  const sizeValue = orderItem.size.trim();

  if (
    sizeValue === "normal" ||
    sizeValue === "family" ||
    sizeValue === "children" ||
    sizeValue === "deepPan"
  ) {
    return sizeValue;
  }

  return null;
}

function isValidSizeSelection(
  menuItem: MenuItem,
  size: "normal" | "family" | "children" | "deepPan",
): boolean {
  if (size === "family") {
    return typeof menuItem.prices.family === "number";
  }

  if (size === "children") {
    return typeof menuItem.prices.children === "number";
  }

  if (size === "deepPan") {
    return (
      typeof menuItem.prices.normal === "number" &&
      (menuItem.deepPanExtra ?? 0) > 0
    );
  }

  return (
    typeof menuItem.prices.normal === "number" ||
    typeof menuItem.prices.fixed === "number"
  );
}

function getBasePriceForSize(
  menuItem: MenuItem,
  size: "normal" | "family" | "children" | "deepPan",
) {
  if (size === "family") {
    return menuItem.prices.family ?? 0;
  }

  if (size === "children") {
    return menuItem.prices.children ?? 0;
  }

  if (size === "deepPan") {
    return (menuItem.prices.normal ?? 0) + (menuItem.deepPanExtra ?? 0);
  }

  return menuItem.prices.normal ?? menuItem.prices.fixed ?? 0;
}

function getAllowedExtraGroupIds(menuItem: MenuItem): string[] {
  if (menuItem.extraGroupIds && menuItem.extraGroupIds.length > 0) {
    return menuItem.extraGroupIds.map((groupId) => groupId.toString());
  }

  return [menuItem.extraGroupId.toString()];
}

const REQUIRED_RADIO_GROUPS = [
  "proteinChoice",
  "nachosProtein",
  "drinkSizes",
  "pizzaSaladProteinChoice",
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateOrderRequest;

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
    const bagIncluded =
      typeof body.bag_included === "boolean"
        ? body.bag_included
        : typeof body.bagIncluded === "boolean"
          ? body.bagIncluded
          : true;

    // ===== Validate required fields =====
    if (
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
    if (!["mobilepay", "card"].includes(paymentMethod)) {
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
    const MAX_QUANTITY = 50;
    const MAX_ORDER_ITEMS = 50;

    if (items.length > MAX_ORDER_ITEMS) {
      return NextResponse.json(
        { error: "Too many order items" },
        { status: 400 },
      );
    }

    const normalizedItems = items.map((item: unknown) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const orderItem = item as OrderItemRequest;
      const itemId = orderItem.id;
      const quantity = orderItem.quantity;

      if (
        typeof itemId !== "number" ||
        !Number.isInteger(itemId) ||
        itemId <= 0 ||
        typeof quantity !== "number" ||
        !Number.isInteger(quantity) ||
        quantity <= 0 ||
        quantity > MAX_QUANTITY
      ) {
        return null;
      }

      const menuItem = menuData.find((entry) => entry.id === itemId);

      if (!menuItem) {
        return null;
      }

      const isDisabled = (menuItem as MenuItem & { disabled?: boolean })
        .disabled;

      if (isDisabled === true) {
        return null;
      }

      const requestedSize = normalizeRequestedSize(orderItem);

      if (!requestedSize || !isValidSizeSelection(menuItem, requestedSize)) {
        return null;
      }

      const extrasInput = Array.isArray(orderItem.extras)
        ? orderItem.extras
        : [];
      const allowedExtraGroupIds = getAllowedExtraGroupIds(menuItem);
      const normalizedExtras: Array<{ name: string; price: number }> = [];
      const selectedExtraGroupCounts = new Map<string, number>();

      for (const extra of extrasInput) {
        if (!extra || typeof extra !== "object") {
          return null;
        }

        const orderExtra = extra as OrderExtraRequest;
        const extraName =
          typeof orderExtra.name === "string" ? orderExtra.name.trim() : "";
        const extraGroupId =
          typeof orderExtra.groupId === "string"
            ? orderExtra.groupId.trim()
            : "";

        if (!extraName || !extraGroupId) {
          return null;
        }

        if (!allowedExtraGroupIds.includes(extraGroupId)) {
          return null;
        }

        if (!(extraGroupId in extraGroups)) {
          return null;
        }

        const group = extraGroups[extraGroupId as keyof typeof extraGroups];
        const matchingExtra = group.find(
          (availableExtra) => availableExtra.name === extraName,
        );

        if (!matchingExtra) {
          return null;
        }

        const currentCount = selectedExtraGroupCounts.get(extraGroupId) ?? 0;
        selectedExtraGroupCounts.set(extraGroupId, currentCount + 1);

        normalizedExtras.push({
          name: extraName,
          price: matchingExtra.price,
        });
      }

      for (const requiredGroupId of REQUIRED_RADIO_GROUPS) {
        if (!allowedExtraGroupIds.includes(requiredGroupId)) {
          continue;
        }

        const selectedCount =
          selectedExtraGroupCounts.get(requiredGroupId) ?? 0;

        if (selectedCount !== 1) {
          return null;
        }
      }

      const basePrice = getBasePriceForSize(menuItem, requestedSize);
      const extrasTotal = normalizedExtras.reduce((total, extra) => {
        const extraPrice =
          requestedSize === "family" ? extra.price * 2 : extra.price;

        return total + extraPrice;
      }, 0);

      const unitPrice = basePrice + extrasTotal;

      return {
        item_name: menuItem.name,
        quantity,
        unit_price: unitPrice,
        size: requestedSize,
        extras: normalizedExtras.map((extra) => extra.name),
      } satisfies NormalizedOrderItem;
    });

    if (normalizedItems.some((item) => item === null)) {
      return NextResponse.json(
        { error: "Invalid order items" },
        { status: 400 },
      );
    }

    const validItems = normalizedItems.filter(
      (item): item is NormalizedOrderItem => item !== null,
    );

    const subtotal = validItems.reduce(
      (total, item) => total + item.unit_price * item.quantity,
      0,
    );

    const bagFee = bagIncluded ? 4 : 0;
    const serviceFee = 4;
    const deliveryFee = deliveryMethod === "delivery" ? DELIVERY_FEE : 0;
    const serverCalculatedTotalPrice =
      subtotal + bagFee + serviceFee + deliveryFee;

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
        total_price: serverCalculatedTotalPrice,
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
    const orderItems = validItems.map((item) => ({
      ...item,
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
