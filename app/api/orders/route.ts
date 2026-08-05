import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DELIVERY_FEE } from "@/lib/delivery";
import { extraGroups, menuData, type MenuItem } from "@/data/menu";
import { sendOrderReceivedEmail } from "@/lib/email/orderEmails";
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
  customer_address_line1?: unknown;
  customer_postal_code?: unknown;
  customer_city?: unknown;
  customer_floor_door?: unknown;
  customer_place_id?: unknown;
  customer_latitude?: unknown;
  customer_longitude?: unknown;

  order_note?: unknown;
  requested_time?: unknown;
  items?: unknown;
};

type OrderSize = "normal" | "family" | "children" | "deepPan";

type NormalizedOrderItem = {
  item_name: string;
  quantity: number;
  unit_price: number;
  size: OrderSize;
  extras: string[];
};

const REQUIRED_RADIO_GROUPS = [
  "proteinChoice",
  "nachosProtein",
  "drinkSizes",
  "pizzaSaladProteinChoice",
] as const;

const MAX_QUANTITY = 50;
const MAX_ORDER_ITEMS = 50;
const BAG_FEE = 4;
const SERVICE_FEE = 4;

function getOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue || null;
}

function getOptionalNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function isValidLatitude(value: number | null): value is number {
  return value !== null && value >= -90 && value <= 90;
}

function isValidLongitude(value: number | null): value is number {
  return value !== null && value >= -180 && value <= 180;
}

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

function normalizeRequestedSize(orderItem: OrderItemRequest): OrderSize | null {
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

function isValidSizeSelection(menuItem: MenuItem, size: OrderSize): boolean {
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

function getBasePriceForSize(menuItem: MenuItem, size: OrderSize): number {
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateOrderRequest;

    const customerName = getOptionalString(body.customer_name);

    const customerPhone = getOptionalString(body.customer_phone);

    const customerEmail = getOptionalString(body.customer_email);

    const orderNote = getOptionalString(body.order_note);

    const customerAddressLine1 = getOptionalString(body.customer_address_line1);

    const customerPostalCode = getOptionalString(body.customer_postal_code);

    const customerCity = getOptionalString(body.customer_city);

    const customerFloorDoor = getOptionalString(body.customer_floor_door);

    const customerPlaceId = getOptionalString(body.customer_place_id);

    const customerLatitude = getOptionalNumber(body.customer_latitude);

    const customerLongitude = getOptionalNumber(body.customer_longitude);

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

    // ===== Required customer fields =====

    if (
      !customerName ||
      !customerPhone ||
      !customerEmail ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        {
          error: "Missing or invalid required fields",
        },
        { status: 400 },
      );
    }

    if (orderNote && orderNote.length > 500) {
      return NextResponse.json(
        {
          error: "Order note is too long",
        },
        { status: 400 },
      );
    }

    // ===== Delivery method =====

    if (deliveryMethod !== "pickup" && deliveryMethod !== "delivery") {
      return NextResponse.json(
        {
          error: "Invalid delivery method",
        },
        { status: 400 },
      );
    }

    if (deliveryMethod === "delivery") {
      if (
        !customerAddressLine1 ||
        !customerPostalCode ||
        !customerCity ||
        !customerPlaceId ||
        !isValidLatitude(customerLatitude) ||
        !isValidLongitude(customerLongitude)
      ) {
        return NextResponse.json(
          {
            error: "Complete delivery address is required",
          },
          { status: 400 },
        );
      }

      if (!/^\d{4}$/.test(customerPostalCode)) {
        return NextResponse.json(
          {
            error: "Invalid postal code",
          },
          { status: 400 },
        );
      }
    }

    // Construct the canonical address
    // on the server rather than trusting
    // one free-text frontend field.

    const customerAddress =
      deliveryMethod === "delivery"
        ? [
            customerAddressLine1,
            customerFloorDoor,
            [customerPostalCode, customerCity].filter(Boolean).join(" "),
          ]
            .filter(Boolean)
            .join(", ")
        : null;

    // ===== Payment method =====

    if (paymentMethod !== "mobilepay" && paymentMethod !== "card") {
      return NextResponse.json(
        {
          error: "Invalid payment method",
        },
        { status: 400 },
      );
    }

    // ===== Requested time =====

    if (!isValidRequestedTime(requestedTime)) {
      return NextResponse.json(
        {
          error: "Invalid requested time",
        },
        { status: 400 },
      );
    }

    // ===== Order item limits =====

    if (items.length > MAX_ORDER_ITEMS) {
      return NextResponse.json(
        {
          error: "Too many order items",
        },
        { status: 400 },
      );
    }

    // ===== Validate and price items =====

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

      const isDisabled = (
        menuItem as MenuItem & {
          disabled?: boolean;
        }
      ).disabled;

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

      const normalizedExtras: Array<{
        name: string;
        price: number;
      }> = [];

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
        {
          error: "Invalid order items",
        },
        { status: 400 },
      );
    }

    const validItems = normalizedItems.filter(
      (item): item is NormalizedOrderItem => item !== null,
    );

    // ===== Server-calculated totals =====

    const subtotal = validItems.reduce(
      (total, item) => total + item.unit_price * item.quantity,
      0,
    );

    const bagFee = bagIncluded ? BAG_FEE : 0;

    const serviceFee = SERVICE_FEE;

    const deliveryFee = deliveryMethod === "delivery" ? DELIVERY_FEE : 0;

    const serverCalculatedTotalPrice =
      subtotal + bagFee + serviceFee + deliveryFee;

    // ===== Authenticated user =====

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id ?? null;

    // ===== Create order =====

    const supabaseAdmin = createAdminClient();

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,

        subtotal,
        bag_included: bagIncluded,
        bag_fee: bagFee,
        service_fee: serviceFee,
        delivery_fee: deliveryFee,
        total_price: serverCalculatedTotalPrice,

        delivery_method: deliveryMethod,
        payment_method: paymentMethod,

        customer_name: customerName,
        customer_phone: customerPhone,
        customer_email: customerEmail,

        customer_address: customerAddress,

        customer_address_line1:
          deliveryMethod === "delivery" ? customerAddressLine1 : null,

        customer_postal_code:
          deliveryMethod === "delivery" ? customerPostalCode : null,

        customer_city: deliveryMethod === "delivery" ? customerCity : null,

        customer_floor_door:
          deliveryMethod === "delivery" ? customerFloorDoor : null,

        customer_place_id:
          deliveryMethod === "delivery" ? customerPlaceId : null,

        customer_latitude:
          deliveryMethod === "delivery" ? customerLatitude : null,

        customer_longitude:
          deliveryMethod === "delivery" ? customerLongitude : null,

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

    // ===== Create order items =====

    const orderItems = validItems.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Order items insert error:", itemsError);

      // Roll back incomplete order.

      const { error: rollbackError } = await supabaseAdmin
        .from("orders")
        .delete()
        .eq("id", order.id);

      if (rollbackError) {
        console.error("Order rollback error:", rollbackError);
      }

      return NextResponse.json(
        {
          error: itemsError.message,
        },
        { status: 500 },
      );
    }

    try {
      const origin = (
        process.env.SITE_URL ?? new URL(request.url).origin
      ).replace(/\/+$/, "");

      const receiptUrl = `${origin}/order/${encodeURIComponent(
        String(order.public_token),
      )}`;

      await sendOrderReceivedEmail({
        to: customerEmail,
        customerName,
        orderId: order.id,
        receiptUrl,
      });

      const { error: emailTimestampError } = await supabaseAdmin
        .from("orders")
        .update({
          confirmation_email_sent_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (emailTimestampError) {
        console.error(
          "Confirmation email timestamp update failed:",
          emailTimestampError,
        );
      }
    } catch (emailError: unknown) {
      console.error("Order confirmation email failed:", emailError);
    }

    return NextResponse.json(
      {
        message: "Ordren blev oprettet",
        order_id: order.id,
        public_token: order.public_token,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Unexpected order creation error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "Invalid request body",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
