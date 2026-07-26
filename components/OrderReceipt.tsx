"use client";

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
    delivery_method: "pickup" | "delivery";
    estimated_time?: number | null;
    total_price: number;
    status: string;
    order_items: OrderItem[];
  };
}

const restaurantInfo = {
  name: "Gastronomia 3300",
  address: "Hillerødvej 38A, 3300 Frederiksværk",
  phone: "+45 40 40 41 83",
  website: "gastronomia3300.dk",
};

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
  const timeLabel = order.estimated_time
    ? `${order.estimated_time} min`
    : "Hurtigst muligt";
  const showAddress =
    order.delivery_method === "delivery" && order.customer_address;

  return (
    <div className={styles.container}>
      {/* ===== HEADER ===== */}
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
          <p>
            <strong>Type:</strong> {deliveryLabel}
          </p>
        </div>
      </div>

      <hr className={styles.divider} />

      {/* ===== ORDER ITEMS ===== */}
      <table className={styles.itemsTable}>
        <thead>
          <tr>
            <th>Antal</th>
            <th>Vare</th>
            <th>Note</th>
            <th style={{ textAlign: "right" }}>Pris</th>
          </tr>
        </thead>
        <tbody>
          {order.order_items.map((item, index) => (
            <tr key={index}>
              <td>{item.quantity}</td>
              <td>{item.name}</td>
              <td>
                {item.size && item.size !== "normal" && (
                  <span className={styles.badge}>{item.size}</span>
                )}
                {item.extras && item.extras.length > 0 && (
                  <span className={`${styles.badge} ${styles.badgeExtras}`}>
                    (+{item.extras.join(", ")})
                  </span>
                )}
              </td>
              <td style={{ textAlign: "right" }}>
                {item.unit_price * item.quantity} kr.
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className={styles.divider} />

      {/* ===== TOTALS ===== */}
      <div className={styles.totals}>
        <div className={styles.totalRow}>
          <span>Subtotal:</span>
          <span>{order.total_price} kr.</span>
        </div>
        <div className={`${styles.totalRow} ${styles.grandTotal}`}>
          <span>
            <strong>I alt:</strong>
          </span>
          <span>
            <strong>{order.total_price} kr.</strong>
          </span>
        </div>
      </div>

      <hr className={styles.divider} />

      {/* ===== CUSTOMER INFO ===== */}
      <div className={styles.customer}>
        <p>
          <strong>Kunde:</strong> {order.customer_name}
        </p>
        <p>
          <strong>Tlf:</strong> {order.customer_phone}
        </p>
        {showAddress && (
          <p>
            <strong>Adresse:</strong> {order.customer_address}
          </p>
        )}
        <p>
          <strong>Ønsket tid:</strong> {timeLabel}
        </p>
        <p>
          <strong>Status:</strong>{" "}
          {order.status === "accepted" ? "Accepteret" : order.status}
        </p>
      </div>

      {/* ===== FOOTER ===== */}
      <div className={styles.footer}>
        <p>Tak for din bestilling!</p>
        <p className={styles.powered}>Powered by Gastronomia 3300</p>
      </div>
    </div>
  );
}
