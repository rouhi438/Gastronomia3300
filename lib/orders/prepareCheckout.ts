import {
  prepareOrderPricing,
  type DeliveryMethod,
  type PreparedOrderPricing,
} from "@/lib/orders/prepareOrder";
import {
  getStoreServiceStatuses,
  type StoreServiceStatus,
} from "@/lib/store/getStoreStatus";

type CreateCheckoutRequest = {
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

export type CheckoutPaymentMethod = "mobilepay" | "card";

export type PreparedCheckout = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;

  customerAddress: string | null;
  customerAddressLine1: string | null;
  customerPostalCode: string | null;
  customerCity: string | null;
  customerFloorDoor: string | null;
  customerPlaceId: string | null;
  customerLatitude: number | null;
  customerLongitude: number | null;

  orderNote: string | null;
  requestedTime: string;

  deliveryMethod: DeliveryMethod;
  paymentMethod: CheckoutPaymentMethod;
  bagIncluded: boolean;

  pricing: PreparedOrderPricing;
};

export type PrepareCheckoutResult =
  | {
      ok: true;
      data: PreparedCheckout;
    }
  | {
      ok: false;
      error: string;
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

export async function prepareCheckout(
  input: unknown,
): Promise<PrepareCheckoutResult> {
  if (!input || typeof input !== "object") {
    return {
      ok: false,
      error: "Invalid request body",
    };
  }

  const body = input as CreateCheckoutRequest;

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

  const deliveryMethodRaw =
    typeof body.delivery_method === "string"
      ? body.delivery_method.trim().toLowerCase()
      : "pickup";

  const paymentMethodRaw =
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

  if (
    !customerName ||
    !customerPhone ||
    !customerEmail ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return {
      ok: false,
      error: "Missing or invalid required fields",
    };
  }

  if (orderNote && orderNote.length > 500) {
    return {
      ok: false,
      error: "Order note is too long",
    };
  }

  if (deliveryMethodRaw !== "pickup" && deliveryMethodRaw !== "delivery") {
    return {
      ok: false,
      error: "Invalid delivery method",
    };
  }

  const deliveryMethod: DeliveryMethod = deliveryMethodRaw;

  if (deliveryMethod === "delivery") {
    if (
      !customerAddressLine1 ||
      !customerPostalCode ||
      !customerCity ||
      !customerPlaceId ||
      !isValidLatitude(customerLatitude) ||
      !isValidLongitude(customerLongitude)
    ) {
      return {
        ok: false,
        error: "Complete delivery address is required",
      };
    }

    if (!/^\d{4}$/.test(customerPostalCode)) {
      return {
        ok: false,
        error: "Invalid postal code",
      };
    }
  }

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

  if (paymentMethodRaw !== "mobilepay" && paymentMethodRaw !== "card") {
    return {
      ok: false,
      error: "Invalid payment method",
    };
  }

  const paymentMethod: CheckoutPaymentMethod = paymentMethodRaw;
  const previewBypassEnabled =
    process.env.VERCEL_ENV === "preview" &&
    process.env.PREVIEW_BYPASS_SERVICE_HOURS === "true";

  if (!previewBypassEnabled) {
    const serviceStatuses = await getStoreServiceStatuses();
    const serviceStatus = serviceStatuses[deliveryMethod];

    const requestedTimeError = validateRequestedTime(
      requestedTime,
      serviceStatus,
    );

    if (requestedTimeError) {
      return {
        ok: false,
        error: requestedTimeError,
      };
    }
  }

  const pricingResult = await prepareOrderPricing(
    items,
    bagIncluded,
    deliveryMethod,
  );

  if (!pricingResult.ok) {
    return {
      ok: false,
      error: pricingResult.error,
    };
  }

  return {
    ok: true,
    data: {
      customerName,
      customerPhone,
      customerEmail,

      customerAddress,
      customerAddressLine1,
      customerPostalCode,
      customerCity,
      customerFloorDoor,
      customerPlaceId,
      customerLatitude,
      customerLongitude,

      orderNote,
      requestedTime: requestedTime as string,

      deliveryMethod,
      paymentMethod,
      bagIncluded,

      pricing: pricingResult.data,
    },
  };
}
