import { extraGroups, menuData, type MenuItem } from "@/data/menu";
import { DELIVERY_FEE } from "@/lib/delivery";
import { getMenuAvailability } from "@/lib/menu/getMenuAvailability";

export type OrderItemRequest = {
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

export type OrderSize = "normal" | "family" | "children" | "deepPan";

export type NormalizedOrderItem = {
  item_name: string;
  quantity: number;
  unit_price: number;
  size: OrderSize;
  extras: string[];
};

export type DeliveryMethod = "pickup" | "delivery";

export type PreparedOrderPricing = {
  items: NormalizedOrderItem[];
  subtotal: number;
  bagFee: number;
  serviceFee: number;
  deliveryFee: number;
  totalPrice: number;
};

export type PrepareOrderPricingResult =
  | {
      ok: true;
      data: PreparedOrderPricing;
    }
  | {
      ok: false;
      error: "Too many order items" | "Invalid order items";
    };

const REQUIRED_RADIO_GROUPS = [
  "proteinChoice",
  "nachosProtein",
  "drinkSizes",
  "cocaColaSizes",
  "faxeKondiSizes",
  "pizzaSaladProteinChoice",
] as const;

const MAX_QUANTITY = 50;
const MAX_ORDER_ITEMS = 50;
const BAG_FEE = 4;
const SERVICE_FEE = 4;

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

export async function prepareOrderPricing(
  items: unknown[],
  bagIncluded: boolean,
  deliveryMethod: DeliveryMethod,
): Promise<PrepareOrderPricingResult> {
  if (items.length > MAX_ORDER_ITEMS) {
    return {
      ok: false,
      error: "Too many order items",
    };
  }

  const menuAvailability = await getMenuAvailability();

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

    if (!menuAvailability.isItemAvailable(menuItem.id)) {
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

    const extrasInput = Array.isArray(orderItem.extras) ? orderItem.extras : [];

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
        typeof orderExtra.groupId === "string" ? orderExtra.groupId.trim() : "";

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

      if (
        (extraGroupId === "drinkSizes" ||
          extraGroupId === "cocaColaSizes" ||
          extraGroupId === "faxeKondiSizes") &&
        !menuAvailability.isOptionAvailable(menuItem.id, matchingExtra.name)
      ) {
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

      const selectedCount = selectedExtraGroupCounts.get(requiredGroupId) ?? 0;

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
    return {
      ok: false,
      error: "Invalid order items",
    };
  }

  const validItems = normalizedItems.filter(
    (item): item is NormalizedOrderItem => item !== null,
  );

  const subtotal = validItems.reduce(
    (total, item) => total + item.unit_price * item.quantity,
    0,
  );

  const bagFee = bagIncluded ? BAG_FEE : 0;
  const serviceFee = SERVICE_FEE;
  const deliveryFee = deliveryMethod === "delivery" ? DELIVERY_FEE : 0;

  return {
    ok: true,
    data: {
      items: validItems,
      subtotal,
      bagFee,
      serviceFee,
      deliveryFee,
      totalPrice: subtotal + bagFee + serviceFee + deliveryFee,
    },
  };
}
