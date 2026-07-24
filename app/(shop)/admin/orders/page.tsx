"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

type OrderStatus = "pending" | "accepted" | "ready" | "completed" | "cancelled";

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
  estimated_time: number | null;
  created_at: string;
  order_items: OrderItem[];
}

const statusLabels: Record<OrderStatus, string> = {
  pending: "Afventer",
  accepted: "Accepteret",
  ready: "Klar",
  completed: "Leveret",
  cancelled: "Annulleret",
};

const statusColors: Record<OrderStatus, string> = {
  pending: "#f59e0b",
  accepted: "#3b82f6",
  ready: "#10b981",
  completed: "#6b7280",
  cancelled: "#ef4444",
};

const timeOptions = [15, 20, 30, 45, 60];

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState<string | null>(null);
  const [showTimeOptions, setShowTimeOptions] = useState<number | null>(null);
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

      // ===== Check for new pending orders =====
      if (showNotification && prevOrderCountRef.current > 0) {
        const newPending = newOrders.filter(
          (o: Order) => o.status === "pending",
        );
        const prevPending = prevOrderCountRef.current;
        if (newPending.length > prevPending) {
          const count = newPending.length - prevPending;
          playBeep();
          setNotification(`🛎️ ${count} ny ordre modtaget!`);
          setTimeout(() => setNotification(null), 5000);
        }
      }

      prevOrderCountRef.current = newOrders.filter(
        (o: Order) => o.status === "pending",
      ).length;
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

    fetchOrders(false);

    intervalRef.current = setInterval(() => {
      fetchOrders(true);
    }, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [router]);

  // ===== Accept order (show time options) =====
  const handleAccept = (orderId: number) => {
    setShowTimeOptions(orderId);
  };

  // ===== Confirm accept with time =====
  const handleConfirmAccept = async (orderId: number, minutes: number) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "accepted", estimated_time: minutes }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to accept order");
      }

      setShowTimeOptions(null);
      fetchOrders(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ===== Cancel order =====
  const handleCancel = async (orderId: number) => {
    if (!confirm("Er du sikker på, at du vil annullere denne ordre?")) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel order");
      }

      fetchOrders(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ===== Update status (for ready/completed) =====
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
                  {order.estimated_time && (
                    <p className={styles.estimatedTime}>
                      ⏱️ Forventet tid: {order.estimated_time} min
                    </p>
                  )}
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

              {/* ===== Action Buttons ===== */}
              {order.status === "pending" && (
                <div className={styles.actionButtons}>
                  {showTimeOptions === order.id ? (
                    <div className={styles.timeOptions}>
                      <span>Vælg tid:</span>
                      {timeOptions.map((min) => (
                        <button
                          key={min}
                          className={styles.timeBtn}
                          onClick={() => handleConfirmAccept(order.id, min)}
                        >
                          {min} min
                        </button>
                      ))}
                      <button
                        className={styles.timeBtnCancel}
                        onClick={() => setShowTimeOptions(null)}
                      >
                        Annuller
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        className={styles.acceptBtn}
                        onClick={() => handleAccept(order.id)}
                      >
                        ✅ Acceptér
                      </button>
                      <button
                        className={styles.cancelBtn}
                        onClick={() => handleCancel(order.id)}
                      >
                        ❌ Annuller
                      </button>
                    </>
                  )}
                </div>
              )}

              {order.status === "accepted" && (
                <div className={styles.statusButtons}>
                  <button
                    className={styles.statusBtn}
                    onClick={() => updateStatus(order.id, "ready")}
                  >
                    Markér som klar
                  </button>
                  <button
                    className={styles.statusBtnCancel}
                    onClick={() => updateStatus(order.id, "cancelled")}
                  >
                    Annuller
                  </button>
                </div>
              )}

              {order.status === "ready" && (
                <div className={styles.statusButtons}>
                  <button
                    className={styles.statusBtnComplete}
                    onClick={() => updateStatus(order.id, "completed")}
                  >
                    Markér som leveret
                  </button>
                  <button
                    className={styles.statusBtnCancel}
                    onClick={() => updateStatus(order.id, "cancelled")}
                  >
                    Annuller
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
