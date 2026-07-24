"use client";

import { useEffect, useState, useRef } from "react";
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
  const [notification, setNotification] = useState<string | null>(null);
  const prevOrderCountRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ===== Play beep sound =====
  const playBeep = () => {
    try {
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioCtx.currentTime + 0.2,
      );
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (_) {
      // AudioContext not supported – ignore
    }
  };

  // ===== Fetch orders =====
  const fetchOrders = async (showNotification = false) => {
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
      const newOrders = data.orders || [];

      // ===== Check for new orders =====
      if (showNotification && prevOrderCountRef.current > 0) {
        const newCount = newOrders.length;
        if (newCount > prevOrderCountRef.current) {
          const newOrderCount = newCount - prevOrderCountRef.current;
          playBeep();
          setNotification(`🛎️ ${newOrderCount} ny ordre modtaget!`);
          setTimeout(() => setNotification(null), 5000);
        }
      }

      prevOrderCountRef.current = newOrders.length;
      setOrders(newOrders);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== Initial fetch + Polling =====
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/auth");
      return;
    }

    // Initial fetch
    fetchOrders(false);

    // Start polling every 10 seconds
    intervalRef.current = setInterval(() => {
      fetchOrders(true);
    }, 10000);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [router]);

  // ===== Update order status =====
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

      // Refresh orders
      fetchOrders(false);
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
      {/* ===== Notification Banner ===== */}
      {notification && (
        <div className={styles.notification}>{notification}</div>
      )}

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
