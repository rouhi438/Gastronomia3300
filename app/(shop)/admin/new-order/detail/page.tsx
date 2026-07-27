"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./detail.module.css";

interface OrderItem {
  id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  size: string;
  extras: string[];
}

interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  total_price: number;
  status: string;
  estimated_time?: number | null;
  created_at: string;
  order_items: OrderItem[];
}

const statusLabels: Record<string, string> = {
  pending: "Afventer",
  accepted: "Accepteret",
  ready: "Klar",
  completed: "Leveret",
  cancelled: "Annulleret",
};

function getSizeLabel(size?: string) {
  if (!size || size === "normal") return null;

  if (size === "family") return "Family";
  if (size === "children") return "Børn";
  if (size === "deepPan") return "Deep Pan";

  return size;
}

export default function OrderDetailPage() {
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLatestPendingOrder = async () => {
      const token = localStorage.getItem("access_token");
      const refreshToken = localStorage.getItem("refresh_token");

      if (!token) {
        router.push("/auth");
        return;
      }

      try {
        const res = await fetch("/api/admin/orders", {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Refresh-Token": refreshToken || "",
          },
        });

        if (res.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          router.push("/auth");
          return;
        }

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch orders");
        }

        const data = await res.json();

        const pendingOrders = data.orders.filter(
          (item: Order) => item.status === "pending",
        );

        if (pendingOrders.length === 0) {
          router.push("/admin/new-order");
          return;
        }

        setOrder(pendingOrders[0]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Kunne ikke hente ordren",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLatestPendingOrder();
  }, [router]);

  if (loading) {
    return <div className={styles.loading}>Indlæser ordre...</div>;
  }

  if (error) {
    return <div className={styles.error}>Fejl: {error}</div>;
  }

  if (!order) {
    return <div className={styles.error}>Ingen ordre fundet.</div>;
  }

  const formattedDate = new Date(order.created_at).toLocaleString("da-DK");

  return (
    <div className={styles.container}>
      <article className={styles.card}>
        <header className={styles.top}>
          <div className={styles.orderHeading}>
            <h2 className={styles.orderId}>Ordre #{order.id}</h2>

            <strong className={styles.totalPrice}>
              {order.total_price} kr.
            </strong>
          </div>

          <div className={styles.customerInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Tlf:</span>

              <a className={styles.phone} href={`tel:${order.customer_phone}`}>
                {order.customer_phone}
              </a>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Kunde:</span>
              <span>{order.customer_name}</span>
            </div>

            {order.customer_address && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Adresse:</span>
                <span>{order.customer_address}</span>
              </div>
            )}
          </div>
        </header>

        <section className={styles.items}>
          {order.order_items.map((item) => {
            const sizeLabel = getSizeLabel(item.size);

            return (
              <div className={styles.item} key={item.id}>
                <div className={styles.itemMain}>
                  <div className={styles.itemTitleRow}>
                    <span className={styles.quantity}>{item.quantity}×</span>

                    <strong className={styles.itemName}>
                      {item.item_name}
                    </strong>

                    {sizeLabel && (
                      <span className={styles.sizeBadge}>{sizeLabel}</span>
                    )}
                  </div>

                  {item.extras && item.extras.length > 0 && (
                    <div className={styles.extras}>
                      {item.extras.map((extra) => (
                        <span className={styles.extra} key={extra}>
                          + {extra}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <strong className={styles.itemPrice}>
                  {item.unit_price * item.quantity} kr.
                </strong>
              </div>
            );
          })}
        </section>

        <footer className={styles.orderFooter}>
          <div className={styles.footerRow}>
            <span className={styles.footerLabel}>Dato:</span>
            <span>{formattedDate}</span>
          </div>

          <div className={styles.footerRow}>
            <span className={styles.footerLabel}>Status:</span>
            <span className={styles.statusBadge}>
              {statusLabels[order.status] || order.status}
            </span>
          </div>

          {order.estimated_time && (
            <div className={styles.footerRow}>
              <span className={styles.footerLabel}>Forventet tid:</span>

              <strong className={styles.estimatedTime}>
                {order.estimated_time} min
              </strong>
            </div>
          )}
        </footer>
      </article>
    </div>
  );
}
