"use client";

import { useLocale, useTranslations } from "next-intl";

import { extraGroups, menuData } from "@/data/menu";
import styles from "./OrderReceipt.module.css";

type MoneyValue = number | string | null | undefined;

interface OrderItem {
  name?: string;
  item_name?: string;
  quantity: number;
  unit_price: MoneyValue;
  size?: string | null;
  extras?: string[] | null;
}

interface OrderReceiptProps {
  order: {
    id: number;
    created_at: string;

    customer_name: string;
    customer_phone: string;
    customer_email?: string | null;

    customer_address?: string | null;
    customer_address_line1?: string | null;
    customer_postal_code?: string | null;
    customer_city?: string | null;
    customer_floor_door?: string | null;

    order_note?: string | null;

    delivery_method: "pickup" | "delivery";
    payment_method?: string | null;

    requested_time?: string | null;
    estimated_time?: number | null;

    subtotal?: MoneyValue;
    bag_included?: boolean | null;
    bag_fee?: MoneyValue;
    service_fee?: MoneyValue;
    delivery_fee?: MoneyValue;
    total_price: MoneyValue;

    status: string;
    order_items: OrderItem[];
  };
  previousOrdersCount?: number | null;
}

interface ReceiptExtra {
  name: string;
  price: number;
}

const restaurantInfo = {
  name: "Gastronomia 3300",
  address: "Hillerødvej 38A, 3300 Frederiksværk",
  phone: "+45 40 40 41 83",
  website: "gastronomia3300.dk",
};

const primaryChoiceGroupIds = [
  "proteinChoice",
  "nachosProtein",
  "drinkSizes",
  "cocaColaSizes",
  "faxeKondiSizes",
  "pizzaSaladProteinChoice",
] as const;

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase("da-DK");
}

function toNumber(value: MoneyValue): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatMoney(value: MoneyValue, locale: string): string {
  const amount = toNumber(value);

  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,

    maximumFractionDigits: 2,
  }).format(amount)} kr.`;
}

function formatPrintMoney(value: MoneyValue): string {
  const amount = toNumber(value);

  return `${new Intl.NumberFormat("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} DKK`;
}

function getPrintSizeLabel(size?: string | null): string | null {
  switch (size) {
    case "normal":
      return "ALM.";

    case "family":
      return "FAM.";

    case "children":
      return "BØRN";

    case "deepPan":
      return "DEEP PAN";

    default:
      return null;
  }
}

function getMenuItemByName(itemName: string) {
  return menuData.find(
    (menuItem) => normalizeName(menuItem.name) === normalizeName(itemName),
  );
}

function getItemGroupIds(itemName: string): string[] {
  const menuItem = getMenuItemByName(itemName);

  if (!menuItem) {
    return [];
  }

  if (menuItem.extraGroupIds && menuItem.extraGroupIds.length > 0) {
    return menuItem.extraGroupIds.map(String);
  }

  return [String(menuItem.extraGroupId)];
}

function getSelectedPrimaryChoices(
  itemName: string,
  selectedExtras: string[] = [],
  size?: string | null,
): ReceiptExtra[] {
  const itemGroupIds = getItemGroupIds(itemName);

  const choices: ReceiptExtra[] = [];
  const addedNames = new Set<string>();

  for (const groupId of primaryChoiceGroupIds) {
    if (!itemGroupIds.includes(groupId)) {
      continue;
    }

    const group = extraGroups[groupId as keyof typeof extraGroups];

    const selectedExtra = selectedExtras.find((extraName) =>
      group.some(
        (availableExtra) =>
          normalizeName(availableExtra.name) === normalizeName(extraName),
      ),
    );

    if (!selectedExtra) {
      continue;
    }

    const normalizedSelectedName = normalizeName(selectedExtra);

    if (addedNames.has(normalizedSelectedName)) {
      continue;
    }

    const matchedExtra = group.find(
      (availableExtra) =>
        normalizeName(availableExtra.name) === normalizedSelectedName,
    );

    const basePrice = matchedExtra?.price ?? 0;

    const finalPrice = size === "family" ? basePrice * 2 : basePrice;

    choices.push({
      name: selectedExtra,
      price: finalPrice,
    });

    addedNames.add(normalizedSelectedName);
  }

  return choices;
}

function getPaidExtras(
  itemName: string,
  selectedExtras: string[] = [],
  size?: string | null,
): ReceiptExtra[] {
  const itemGroupIds = getItemGroupIds(itemName);

  const selectedChoices = getSelectedPrimaryChoices(
    itemName,
    selectedExtras,
    size,
  );

  const selectedChoiceNames = new Set(
    selectedChoices.map((choice) => normalizeName(choice.name)),
  );

  return selectedExtras
    .filter((extraName) => !selectedChoiceNames.has(normalizeName(extraName)))
    .map((extraName) => {
      let matchedPrice = 0;

      for (const groupId of itemGroupIds) {
        if (
          primaryChoiceGroupIds.includes(
            groupId as (typeof primaryChoiceGroupIds)[number],
          )
        ) {
          continue;
        }

        if (!(groupId in extraGroups)) {
          continue;
        }

        const group = extraGroups[groupId as keyof typeof extraGroups];

        const matchedExtra = group.find(
          (extra) => normalizeName(extra.name) === normalizeName(extraName),
        );

        if (matchedExtra) {
          matchedPrice = matchedExtra.price;

          break;
        }
      }

      const finalPrice = size === "family" ? matchedPrice * 2 : matchedPrice;

      return {
        name: extraName,
        price: finalPrice,
      };
    });
}

export default function OrderReceipt({
  order,
  previousOrdersCount,
}: OrderReceiptProps) {
  const locale = useLocale();
  const t = useTranslations("OrderReceipt");
  const menuT = useTranslations("Menu");
  const itemModalT = useTranslations("ItemModal");
  const numberLocale = locale === "en" ? "en-GB" : "da-DK";

  const formatReceiptMoney = (value: MoneyValue) =>
    formatMoney(value, numberLocale);

  const getSizeLabel = (size?: string | null) => {
    switch (size) {
      case "family":
        return t("sizes.family");

      case "children":
        return t("sizes.children");

      case "deepPan":
        return t("sizes.deepPan");

      case "normal":
      case null:
      case undefined:
        return null;

      default:
        return size;
    }
  };

  const getStatusLabel = (status: string) => {
    const key = `statuses.${status}`;

    return t.has(key) ? t(key) : status;
  };

  const getPaymentLabel = (paymentMethod?: string | null) => {
    switch (paymentMethod) {
      case "mobilepay":
        return "MobilePay";

      case "card":
        return t("paymentMethods.card");

      default:
        return paymentMethod || t("paymentMethods.unspecified");
    }
  };

  const getItemDisplayName = (itemName: string) => {
    const menuItem = getMenuItemByName(itemName);

    if (!menuItem) {
      return itemName;
    }

    const key = `items.${menuItem.id}.name`;

    return menuT.has(key) ? menuT(key) : itemName;
  };

  const getExtraDisplayName = (itemName: string, extraName: string) => {
    const itemGroupIds = getItemGroupIds(itemName);

    for (const groupId of itemGroupIds) {
      if (!(groupId in extraGroups)) {
        continue;
      }

      const group = extraGroups[groupId as keyof typeof extraGroups];
      const index = group.findIndex(
        (extra) => normalizeName(extra.name) === normalizeName(extraName),
      );
      const key = `extras.${groupId}.${index}`;

      if (index >= 0 && itemModalT.has(key)) {
        return itemModalT(key);
      }
    }

    return extraName;
  };

  const orderDate = new Date(order.created_at).toLocaleString(numberLocale, {
    timeZone: "Europe/Copenhagen",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const deliveryLabel =
    order.delivery_method === "pickup"
      ? t("deliveryMethods.pickup")
      : t("deliveryMethods.delivery");

  const customerTime =
    !order.requested_time || order.requested_time === "asap"
      ? t("asSoonAsPossible")
      : order.requested_time;

  const statusLabel = getStatusLabel(order.status);

  const paymentLabel = getPaymentLabel(order.payment_method);

  const itemSubtotal = order.order_items.reduce(
    (total, item) => total + toNumber(item.unit_price) * item.quantity,
    0,
  );

  const subtotal =
    order.subtotal !== null && order.subtotal !== undefined
      ? toNumber(order.subtotal)
      : itemSubtotal;

  const bagFee = toNumber(order.bag_fee);

  const serviceFee = toNumber(order.service_fee);

  const deliveryFee = toNumber(order.delivery_fee);

  const structuredAddress = [
    order.customer_address_line1,
    order.customer_floor_door,
    [order.customer_postal_code, order.customer_city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  const customerAddress = structuredAddress || order.customer_address || "";

  return (
    <article className={styles.container}>
      <div className={styles.header}>
        <div className={styles.brand}>
          <h1>{restaurantInfo.name}</h1>

          <p>{restaurantInfo.address}</p>

          <p>
            {t("labels.phone")}: {restaurantInfo.phone}
          </p>

          <p>{restaurantInfo.website}</p>
        </div>

        <div className={styles.orderInfo}>
          <p>
            <strong>{t("labels.orderNumber")}:</strong> #{order.id}
          </p>

          <p>
            <strong>{t("labels.date")}:</strong> {orderDate}
          </p>

          <div className={styles.orderTypeRow}>
            <strong>{t("labels.orderType")}:</strong>

            <span
              className={`${styles.orderTypeBadge} ${
                order.delivery_method === "pickup"
                  ? styles.pickupBadge
                  : styles.deliveryBadge
              }`}
            >
              {deliveryLabel}
            </span>
          </div>
        </div>
      </div>

      <hr className={styles.divider} />

      <table className={styles.itemsTable}>
        <thead>
          <tr>
            <th>{t("table.quantity")}</th>
            <th>{t("table.number")}</th>
            <th>{t("table.item")}</th>
            <th>{t("table.unitPrice")}</th>

            <th className={styles.priceColumn}>{t("table.price")}</th>
          </tr>
        </thead>

        <tbody>
          {order.order_items.map((item, index) => {
            const itemName =
              item.item_name || item.name || t("table.unknownItem");

            const menuItem = getMenuItemByName(itemName);
            const displayItemName = getItemDisplayName(itemName);

            const selectedExtras = Array.isArray(item.extras)
              ? item.extras
              : [];

            const primaryChoices = getSelectedPrimaryChoices(
              itemName,
              selectedExtras,
              item.size,
            );

            const paidExtras = getPaidExtras(
              itemName,
              selectedExtras,
              item.size,
            );

            const sizeLabel = getSizeLabel(item.size);

            const unitPrice = toNumber(item.unit_price);

            const itemTotal = unitPrice * item.quantity;

            return (
              <tr key={`${itemName}-${index}`}>
                <td>{item.quantity}</td>

                <td>{menuItem?.id ?? "–"}</td>

                <td>
                  <div className={styles.itemTitleRow}>
                    <span className={styles.itemName}>{displayItemName}</span>

                    {primaryChoices.map((choice, choiceIndex) => (
                      <span
                        key={`${choice.name}-${choiceIndex}`}
                        className={styles.proteinBadge}
                      >
                        {getExtraDisplayName(itemName, choice.name)}

                        {choice.price > 0 &&
                          ` (+${formatReceiptMoney(choice.price)})`}
                      </span>
                    ))}

                    {sizeLabel && (
                      <span className={styles.badge}>{sizeLabel}</span>
                    )}
                  </div>

                  {paidExtras.length > 0 && (
                    <div className={styles.extrasVertical}>
                      {paidExtras.map((extra, extraIndex) => (
                        <span
                          key={`${extra.name}-${extraIndex}`}
                          className={styles.extraItem}
                        >
                          <span className={styles.extraPlus}>+</span>

                          <span>
                            {getExtraDisplayName(itemName, extra.name)}
                          </span>

                          {extra.price > 0 && (
                            <span className={styles.extraPrice}>
                              ({formatReceiptMoney(extra.price)})
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </td>

                <td>{formatReceiptMoney(unitPrice)}</td>

                <td className={styles.priceColumn}>
                  {formatReceiptMoney(itemTotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className={styles.printItems}>
        {order.order_items.map((item, index) => {
          const itemName =
            item.item_name || item.name || t("table.unknownItem");

          const menuItem = getMenuItemByName(itemName);
          const displayItemName = getItemDisplayName(itemName);

          const selectedExtras = Array.isArray(item.extras) ? item.extras : [];

          const primaryChoices = getSelectedPrimaryChoices(
            itemName,
            selectedExtras,
            item.size,
          );

          const paidExtras = getPaidExtras(itemName, selectedExtras, item.size);

          const printExtras = paidExtras;

          const extrasUnitTotal = paidExtras.reduce(
            (total, extra) => total + extra.price,
            0,
          );

          const unitPrice = toNumber(item.unit_price);
          const baseUnitPrice = Math.max(0, unitPrice - extrasUnitTotal);
          const baseTotal = baseUnitPrice * item.quantity;

          const printSizeLabel =
            menuItem && typeof menuItem.prices.fixed !== "number"
              ? getPrintSizeLabel(item.size)
              : null;

          const printOptionLabels = [
            printSizeLabel,
            ...primaryChoices.map((choice) =>
              getExtraDisplayName(itemName, choice.name),
            ),
          ].filter((label): label is string => Boolean(label));

          const printOptions =
            printOptionLabels.length > 0
              ? ` (${printOptionLabels.join(", ")})`
              : "";

          return (
            <div
              key={`print-${itemName}-${index}`}
              className={styles.printItem}
            >
              <div className={styles.printItemLine}>
                <span className={styles.printItemDescription}>
                  {item.quantity} × Nr. {menuItem?.id ?? "–"} {displayItemName}
                  {printOptions}.
                </span>

                <span className={styles.printPrice}>
                  {formatPrintMoney(baseTotal)}
                </span>
              </div>

              {printExtras.map((extra, extraIndex) => (
                <div
                  key={`${extra.name}-${extraIndex}`}
                  className={styles.printExtraLine}
                >
                  <span className={styles.printExtraName}>
                    + {getExtraDisplayName(itemName, extra.name)}
                  </span>

                  {extra.price > 0 && (
                    <span className={styles.printPrice}>
                      {formatPrintMoney(extra.price * item.quantity)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <hr className={styles.divider} />

      <div className={`${styles.totals} ${styles.screenTotals}`}>
        <div className={styles.totalRow}>
          <span>{t("totals.items")}:</span>

          <span>{formatReceiptMoney(subtotal)}</span>
        </div>

        <div className={styles.totalRow}>
          <span>{t("totals.bag")}:</span>

          <span>{formatReceiptMoney(bagFee)}</span>
        </div>

        <div className={styles.totalRow}>
          <span>{t("totals.serviceFee")}:</span>

          <span>{formatReceiptMoney(serviceFee)}</span>
        </div>

        {order.delivery_method === "delivery" && (
          <div className={styles.totalRow}>
            <span>{t("totals.delivery")}:</span>

            <span>{formatReceiptMoney(deliveryFee)}</span>
          </div>
        )}

        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
          <strong>{t("totals.total")}:</strong>

          <strong>{formatReceiptMoney(order.total_price)}</strong>
        </div>
      </div>

      <div className={`${styles.totals} ${styles.printTotals}`}>
        <div className={styles.totalRow}>
          <span>{t("totals.items")}:</span>
          <span>{formatPrintMoney(subtotal)}</span>
        </div>

        {bagFee > 0 && (
          <div className={styles.totalRow}>
            <span>{t("totals.bag")}:</span>
            <span>{formatPrintMoney(bagFee)}</span>
          </div>
        )}

        <div className={styles.totalRow}>
          <span>{t("totals.serviceFee")}:</span>
          <span>{formatPrintMoney(serviceFee)}</span>
        </div>

        {order.delivery_method === "delivery" && (
          <div className={styles.totalRow}>
            <span>{t("totals.delivery")}:</span>
            <span>{formatPrintMoney(deliveryFee)}</span>
          </div>
        )}

        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
          <strong>{t("totals.total")}:</strong>
          <strong>{formatPrintMoney(order.total_price)}</strong>
        </div>
      </div>

      <hr className={styles.divider} />

      <div className={styles.customer}>
        <p>
          <strong>{t("customer.name")}:</strong> {order.customer_name}
        </p>

        <p>
          <strong>{t("labels.phone")}:</strong> {order.customer_phone}
        </p>

        {typeof previousOrdersCount === "number" && (
          <p className={styles.previousOrders}>
            <strong>{t("customer.previousOrders")}:</strong>{" "}
            {previousOrdersCount}
          </p>
        )}
        {order.customer_email && (
          <p className={styles.customerEmail}>
            <strong>{t("customer.email")}:</strong> {order.customer_email}
          </p>
        )}

        {order.delivery_method === "delivery" && customerAddress && (
          <p>
            <strong>{t("customer.address")}:</strong> {customerAddress}
          </p>
        )}

        <p className={styles.requestedTime}>
          <strong className={styles.requestedTimeLabel}>
            {t("customer.requestedTime")}:
          </strong>{" "}
          {customerTime}
        </p>

        <p className={styles.paymentInfo}>
          <strong>{t("customer.payment")}:</strong> {paymentLabel}
        </p>

        <p className={styles.orderStatus}>
          <strong>{t("customer.status")}:</strong> {statusLabel}
        </p>

        {order.order_note && (
          <p className={styles.orderNote}>
            <strong>{t("customer.note")}:</strong> {order.order_note}
          </p>
        )}
      </div>

      <div className={styles.footer}>
        <p>{t("footer.thanks")}</p>

        <p className={styles.acceptTime}>
          {order.status === "accepted"
            ? order.estimated_time
              ? t("footer.acceptedEstimated", {
                  minutes: order.estimated_time,
                })
              : order.requested_time && order.requested_time !== "asap"
                ? t("footer.acceptedRequested", {
                    time: order.requested_time,
                  })
                : t("footer.accepted")
            : t("footer.received")}
        </p>

        <p className={styles.powered}>{t("footer.poweredBy")}</p>
      </div>
    </article>
  );
}
