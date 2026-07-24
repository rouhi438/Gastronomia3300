"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

type OrderStatus = "modtaget" | "in_progress" | "ready" | "completed";

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
  status: OrderStatus;
  created_at: string;
  order_items: OrderItem[];
}

const statusLabels: Record<OrderStatus, string> = {
  modtaget: "Modtaget",
  in_progress: "I gang",
  ready: "Klar",
  completed: "Leveret",
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);
  // showing error page  users other than Admin
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const user = localStorage.getItem("user");

    if (!token || !user) {
      router.push("/auth");
      return;
    }

    try {
      const parsed = JSON.parse(user);
      if (parsed.user_metadata?.role !== "admin") {
        router.push("/");
      }
    } catch {
      router.push("/");
    }
  }, [router]);

  const fetchOrders = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/auth");
      return;
    }

    try {
      const res = await fetch("/api/admin/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch orders");
      }

      const data = await res.json();
      setOrders(data.orders);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: number, newStatus: OrderStatus) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      fetchOrders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Indlæser ordrer...</div>;
  }

  if (error) {
    return <div className={styles.error}>Fejl: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Ordreoversigt</h1>

      {orders.length === 0 ? (
        <p className={styles.empty}>Ingen ordrer endnu.</p>
      ) : (
        <div className={styles.orderList}>
          {orders.map((order) => (
            <div key={order.id} className={styles.orderCard}>
              <div className={styles.orderHeader}>
                <div className={styles.orderLeft}>
                  <h3 className={styles.orderId}>Ordre #{order.id}</h3>
                  <p className={styles.orderDate}>
                    {new Date(order.created_at).toLocaleString("da-DK")}
                  </p>
                  <p className={styles.orderCustomer}>
                    <strong>{order.customer_name}</strong>
                    {order.customer_address && (
                      <span>• {order.customer_address}</span>
                    )}
                    <span>• {order.customer_phone}</span>
                  </p>
                </div>

                <div className={styles.orderRight}>
                  <span
                    className={`${styles.statusBadge} ${styles[order.status]}`}
                  >
                    {statusLabels[order.status]}
                  </span>
                  <p className={styles.orderTotal}>{order.total_price} kr.</p>
                </div>
              </div>

              <div className={styles.orderItems}>
                <ul className={styles.orderItemsList}>
                  {order.order_items.map((item) => (
                    <li key={item.id}>
                      {item.quantity}× {item.item_name}
                      {item.size && item.size !== "normal" && (
                        <span className={styles.itemSize}>({item.size})</span>
                      )}
                      {item.extras && item.extras.length > 0 && (
                        <span className={styles.itemExtras}>
                          (+{item.extras.join(", ")})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles.statusButtons}>
                {(
                  [
                    "modtaget",
                    "in_progress",
                    "ready",
                    "completed",
                  ] as OrderStatus[]
                ).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateStatus(order.id, status)}
                    disabled={order.status === status}
                    className={styles.statusBtn}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
