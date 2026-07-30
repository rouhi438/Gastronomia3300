"use client";

import { extraGroups, menuData } from "@/data/menu";
import styles from "./OrderReceipt.module.css";

interface OrderItem {
  name: string;
  quantity: number;
  unit_price: number;
  size?: string;
  extras?: string[];
}

interface OrderReceiptProps {
  order: {
    id: number;
    created_at: string;
    customer_name: string;
    customer_phone: string;
    customer_address?: string | null;
    order_note?: string | null;
    delivery_method: "pickup" | "delivery";
    requested_time?: string | null;
    estimated_time?: number | null;
    total_price: number;
    status: string;
    order_items: OrderItem[];
  };
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

const proteinGroupIds = ["proteinChoice", "nachosProtein"] as const;

function getMenuItemByName(itemName: string) {
  return menuData.find(
    (menuItem) =>
      menuItem.name.trim().toLocaleLowerCase("da-DK") ===
      itemName.trim().toLocaleLowerCase("da-DK"),
  );
}

function getItemGroupIds(itemName: string) {
  const menuItem = getMenuItemByName(itemName);

  if (!menuItem) {
    return [];
  }

  return menuItem.extraGroupIds?.length
    ? menuItem.extraGroupIds
    : [menuItem.extraGroupId];
}

function getProteinChoice(
  itemName: string,
  selectedExtras: string[] = [],
): string | null {
  const itemGroupIds = getItemGroupIds(itemName);

  const applicableProteinGroups = proteinGroupIds.filter((groupId) =>
    itemGroupIds.includes(groupId),
  );

  for (const groupId of applicableProteinGroups) {
    const proteinNames = new Set(
      extraGroups[groupId].map((extra) =>
        extra.name.trim().toLocaleLowerCase("da-DK"),
      ),
    );

    const selectedProtein = selectedExtras.find((extraName) =>
      proteinNames.has(extraName.trim().toLocaleLowerCase("da-DK")),
    );

    if (selectedProtein) {
      return selectedProtein;
    }
  }

  return null;
}

function getPaidExtras(
  itemName: string,
  selectedExtras: string[] = [],
  size?: string,
): ReceiptExtra[] {
  const itemGroupIds = getItemGroupIds(itemName);
  const proteinChoice = getProteinChoice(itemName, selectedExtras);

  return selectedExtras
    .filter((extraName) => extraName !== proteinChoice)
    .map((extraName) => {
      let matchedPrice = 0;

      for (const groupId of itemGroupIds) {
        if (groupId === "proteinChoice" || groupId === "nachosProtein") {
          continue;
        }

        const matchedExtra = extraGroups[groupId].find(
          (extra) =>
            extra.name.trim().toLocaleLowerCase("da-DK") ===
            extraName.trim().toLocaleLowerCase("da-DK"),
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

function getSizeLabel(size?: string) {
  switch (size) {
    case "family":
      return "Familie";

    case "children":
      return "Børn";

    case "deepPan":
      return "Deep Pan";

    case "normal":
    case undefined:
      return null;

    default:
      return size;
  }
}

export default function OrderReceipt({ order }: OrderReceiptProps) {
  const orderDate = new Date(order.created_at).toLocaleString("da-DK", {
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

  // const showAddress =
  //   order.delivery_method === "delivery" && Boolean(order.customer_address);

  const status = order.status === "accepted" ? "Accepteret" : order.status;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.brand}>
          <h1>{restaurantInfo.name}</h1>
          <p>{restaurantInfo.address}</p>
          <p>Tlf: {restaurantInfo.phone}</p>
        </div>

        <div className={styles.orderInfo}>
          <p>
            <strong>Ordre Nr:</strong> #{order.id}
          </p>

          <p>
            <strong>Dato:</strong> {orderDate}
          </p>

          <div className={styles.orderTypeRow}>
            <strong>Type:</strong>

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
            <th>Vare</th>
            <th>Note</th>
            <th className={styles.priceColumn}>Pris</th>
          </tr>
        </thead>

        <tbody>
          {order.order_items.map((item, index) => {
            const proteinChoice = getProteinChoice(item.name, item.extras);

            const paidExtras = getPaidExtras(item.name, item.extras, item.size);

            const sizeLabel = getSizeLabel(item.size);

            return (
              <tr key={`${item.name}-${index}`}>
                <td>{item.quantity}</td>

                <td>
                  <div className={styles.itemTitleRow}>
                    <span className={styles.itemName}>{item.name}</span>

                    {proteinChoice && (
                      <span className={styles.proteinBadge}>
                        {proteinChoice}
                      </span>
                    )}

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
                              ({extra.price} kr.)
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </td>

                <td />

                <td className={styles.priceColumn}>
                  {item.unit_price * item.quantity} kr.
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <hr className={styles.divider} />

      <div className={styles.totals}>
        <div className={styles.totalRow}>
          <span>Subtotal:</span>
          <span>{order.total_price} kr.</span>
        </div>

        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
          <strong>I alt:</strong>
          <strong>{order.total_price} kr.</strong>
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

        {order.delivery_method === "delivery" && order.customer_address && (
          <p>
            <strong>Adresse:</strong> {order.customer_address}
          </p>
        )}

        {order.order_note && (
          <p className={styles.orderNote}>
            <strong>Kommentar:</strong> {order.order_note}
          </p>
        )}

        <p>
          <strong>Ønsket tid:</strong> {customerTime}
        </p>

        <p>
          <strong>Status:</strong> {status}
        </p>
      </div>

      <div className={styles.footer}>
        <p>Tak for din bestilling!</p>

        <p className={styles.acceptTime}>
          {order.status === "accepted" && order.estimated_time
            ? `Din ordre er accepteret og forventes klar om cirka ${order.estimated_time} minutter.`
            : "Din ordre er modtaget."}
        </p>

        <p className={styles.powered}>Powered by Gastronomia 3300</p>
      </div>
    </div>
  );
}
