"use client";

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

function formatMoney(value: MoneyValue): string {
  const amount = toNumber(value);

  return `${new Intl.NumberFormat("da-DK", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,

    maximumFractionDigits: 2,
  }).format(amount)} kr.`;
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

function getSizeLabel(size?: string | null) {
  switch (size) {
    case "family":
      return "Familie";

    case "children":
      return "Børn";

    case "deepPan":
      return "Deep Pan";

    case "normal":
    case null:
    case undefined:
      return null;

    default:
      return size;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Afventer";

    case "accepted":
      return "Accepteret";

    case "rejected":
      return "Afvist";

    case "cancelled":
      return "Annulleret";

    case "completed":
      return "Færdig";

    default:
      return status;
  }
}

function getPaymentLabel(paymentMethod?: string | null) {
  switch (paymentMethod) {
    case "mobilepay":
      return "MobilePay";

    case "card":
      return "Betalingskort";

    default:
      return paymentMethod || "Ikke angivet";
  }
}

export default function OrderReceipt({
  order,
  previousOrdersCount,
}: OrderReceiptProps) {
  const orderDate = new Date(order.created_at).toLocaleString("da-DK", {
    timeZone: "Europe/Copenhagen",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const deliveryLabel =
    order.delivery_method === "pickup" ? "Afhentning" : "Levering";

  const customerTime =
    !order.requested_time || order.requested_time === "asap"
      ? "Hurtigst muligt"
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

          <p>Tlf: {restaurantInfo.phone}</p>

          <p>{restaurantInfo.website}</p>
        </div>

        <div className={styles.orderInfo}>
          <p>
            <strong>Ordre Nr:</strong> #{order.id}
          </p>

          <p>
            <strong>Dato:</strong> {orderDate}
          </p>

          <div className={styles.orderTypeRow}>
            <strong>Ordretype:</strong>

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
            <th>Antal</th>
            <th>Nr.</th>
            <th>Vare</th>
            <th>Stk. pris</th>

            <th className={styles.priceColumn}>Pris</th>
          </tr>
        </thead>

        <tbody>
          {order.order_items.map((item, index) => {
            const itemName = item.item_name || item.name || "Ukendt vare";

            const menuItem = getMenuItemByName(itemName);

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
                    <span className={styles.itemName}>{itemName}</span>

                    {primaryChoices.map((choice, choiceIndex) => (
                      <span
                        key={`${choice.name}-${choiceIndex}`}
                        className={styles.proteinBadge}
                      >
                        {choice.name}

                        {choice.price > 0 && ` (+${formatMoney(choice.price)})`}
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

                          <span>{extra.name}</span>

                          {extra.price > 0 && (
                            <span className={styles.extraPrice}>
                              ({formatMoney(extra.price)})
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </td>

                <td>{formatMoney(unitPrice)}</td>

                <td className={styles.priceColumn}>{formatMoney(itemTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <hr className={styles.divider} />

      <div className={styles.totals}>
        <div className={styles.totalRow}>
          <span>Varer i alt:</span>

          <span>{formatMoney(subtotal)}</span>
        </div>

        <div className={styles.totalRow}>
          <span>Pose:</span>

          <span>{formatMoney(bagFee)}</span>
        </div>

        <div className={styles.totalRow}>
          <span>Servicegebyr:</span>

          <span>{formatMoney(serviceFee)}</span>
        </div>

        {order.delivery_method === "delivery" && (
          <div className={styles.totalRow}>
            <span>Levering:</span>

            <span>{formatMoney(deliveryFee)}</span>
          </div>
        )}

        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
          <strong>I alt:</strong>

          <strong>{formatMoney(order.total_price)}</strong>
        </div>
      </div>

      <hr className={styles.divider} />

      <div className={styles.customer}>
        <p>
          <strong>Kunde:</strong> {order.customer_name}
        </p>

        <p>
          <strong>Tlf:</strong> {order.customer_phone}
        </p>

        {typeof previousOrdersCount === "number" && (
          <p className={styles.previousOrders}>
            <strong>Tidligere ordrer:</strong> {previousOrdersCount}
          </p>
        )}
        {order.customer_email && (
          <p>
            <strong>E-mail:</strong> {order.customer_email}
          </p>
        )}

        {order.delivery_method === "delivery" && customerAddress && (
          <p>
            <strong>Adresse:</strong> {customerAddress}
          </p>
        )}

        <p>
          <strong>Ønsket tid:</strong> {customerTime}
        </p>

        <p>
          <strong>Betaling:</strong> {paymentLabel}
        </p>

        <p>
          <strong>Status:</strong> {statusLabel}
        </p>

        {order.order_note && (
          <p className={styles.orderNote}>
            <strong>Kommentar:</strong> {order.order_note}
          </p>
        )}
      </div>

      <div className={styles.footer}>
        <p>Tak for din bestilling!</p>

        <p className={styles.acceptTime}>
          {order.status === "accepted"
            ? order.estimated_time
              ? `Ordren er accepteret og forventes klar om cirka ${order.estimated_time} minutter.`
              : order.requested_time && order.requested_time !== "asap"
                ? `Ordren er accepteret til ønsket tid: ${order.requested_time}.`
                : "Ordren er accepteret."
            : "Ordren er modtaget."}
        </p>

        <p className={styles.powered}> Leveret af Gastronomia 3300</p>
      </div>
    </article>
  );
}
