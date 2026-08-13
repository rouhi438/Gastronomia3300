import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendOrderReceivedEmail } from "@/lib/email/orderEmails";
import { prepareOrderPricing } from "@/lib/orders/prepareOrder";
import {
  getStoreServiceStatuses,
  type StoreServiceStatus,
} from "@/lib/store/getStoreStatus";

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

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);

  return hours * 60 + minutes;
}

function getCopenhagenCurrentMinutes(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Copenhagen",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === "hour")?.value);

  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new Error("Could not determine Copenhagen time.");
  }

  return hour * 60 + minute;
}

function validateRequestedTime(
  value: unknown,
  serviceStatus: StoreServiceStatus,
): string | null {
  if (!serviceStatus.canOrder) {
    return serviceStatus.message;
  }

  if (typeof value !== "string") {
    return "Ugyldigt ønsket tidspunkt.";
  }

  if (value === "asap") {
    if (!serviceStatus.canOrderAsap) {
      return serviceStatus.serviceType === "pickup"
        ? "Hurtigst muligt er ikke tilgængelig for afhentning lige nu."
        : "Hurtigst muligt er ikke tilgængelig for levering lige nu.";
    }

    return null;
  }

  if (!serviceStatus.canSchedule) {
    return "Der er ikke flere planlagte tider tilgængelige i dag.";
  }

  const match = value.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    return "Ugyldigt ønsket tidspunkt.";
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return "Ugyldigt ønsket tidspunkt.";
  }

  const requestedMinutes = hours * 60 + minutes;

  const firstScheduledMinutes = timeToMinutes(serviceStatus.firstScheduledTime);

  const lastScheduledMinutes = timeToMinutes(serviceStatus.lastScheduledTime);

  const slotInterval = serviceStatus.slotIntervalMinutes;

  if (
    requestedMinutes < firstScheduledMinutes ||
    requestedMinutes > lastScheduledMinutes
  ) {
    return `Vælg et tidspunkt mellem kl. ${serviceStatus.firstScheduledTime} og ${serviceStatus.lastScheduledTime}.`;
  }

  if ((requestedMinutes - firstScheduledMinutes) % slotInterval !== 0) {
    return `Tidspunktet skal vælges i intervaller på ${slotInterval} minutter.`;
  }

  const currentMinutes = getCopenhagenCurrentMinutes();

  if (requestedMinutes <= currentMinutes) {
    return "Det valgte tidspunkt er ikke længere tilgængeligt.";
  }

  return null;
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

    const serviceStatuses = await getStoreServiceStatuses();

    const serviceStatus = serviceStatuses[deliveryMethod];

    const requestedTimeError = validateRequestedTime(
      requestedTime,
      serviceStatus,
    );

    if (requestedTimeError) {
      return NextResponse.json(
        {
          error: requestedTimeError,
        },
        { status: 400 },
      );
    }

    // ===== Validate items and calculate prices =====

    const preparedOrder = await prepareOrderPricing(
      items,
      bagIncluded,
      deliveryMethod,
    );

    if (!preparedOrder.ok) {
      return NextResponse.json(
        {
          error: preparedOrder.error,
        },
        { status: 400 },
      );
    }

    const {
      items: validItems,
      subtotal,
      bagFee,
      serviceFee,
      deliveryFee,
      totalPrice: serverCalculatedTotalPrice,
    } = preparedOrder.data;

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

    let confirmationEmailSent = false;
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
      confirmationEmailSent = true;

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
        email_sent: confirmationEmailSent,
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
