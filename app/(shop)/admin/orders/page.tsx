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

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState<string | null>(null);
  const prevPendingCountRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
    } catch (_) {}
  };

  const fetchOrders = async (showNotification = false) => {
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
      const newOrders = data.orders || [];

      if (showNotification && prevPendingCountRef.current > 0) {
        const newPending = newOrders.filter(
          (o: Order) => o.status === "pending",
        );
        const prevPending = prevPendingCountRef.current;
        if (newPending.length > prevPending) {
          const count = newPending.length - prevPending;
          playBeep();
          setNotification(`🛎️ ${count} ny ordre modtaget!`);
          setTimeout(() => setNotification(null), 5000);
        }
      }

      prevPendingCountRef.current = newOrders.filter(
        (o: Order) => o.status === "pending",
      ).length;
      setOrders(newOrders);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/auth");
      return;
    }

    fetchOrders(false);
    intervalRef.current = setInterval(() => fetchOrders(true), 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [router]);

  const updateStatus = async (orderId: number, newStatus: OrderStatus) => {
    const token = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Refresh-Token": refreshToken || "",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        router.push("/auth");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      fetchOrders(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const printReceipt = (order: Order) => {
    const printContent = `
      <html>
        <head>
          <title>Køkkenbon #${order.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 2rem; max-width: 400px; margin: 0 auto; }
            h1 { font-size: 1.5rem; text-align: center; border-bottom: 2px solid #000; padding-bottom: 0.5rem; }
            .meta { font-size: 0.9rem; color: #555; margin-bottom: 1rem; }
            .meta span { display: block; }
            ul { list-style: none; padding: 0; }
            li { padding: 0.3rem 0; border-bottom: 1px solid #eee; }
            .item-extras { font-size: 0.8rem; color: #666; margin-left: 0.5rem; }
            .footer { margin-top: 1.5rem; text-align: center; font-size: 0.8rem; color: #888; border-top: 1px solid #ddd; padding-top: 0.5rem; }
            @media print { body { margin: 0; padding: 1rem; } }
          </style>
        </head>
        <body>
          <h1>🧾 Køkkenbon #${order.id}</h1>
          <div class="meta">
            <span>📅 ${new Date(order.created_at).toLocaleString("da-DK")}</span>
            <span>👤 ${order.customer_name}</span>
          </div>
          <ul>
            ${order.order_items
              .map(
                (item) => `
              <li>
                ${item.quantity}× ${item.item_name}
                ${item.size && item.size !== "normal" ? `<span style="font-size:0.8rem;color:#666;"> (${item.size})</span>` : ""}
                ${item.extras && item.extras.length > 0 ? `<span class="item-extras">(+${item.extras.join(", ")})</span>` : ""}
              </li>
            `,
              )
              .join("")}
          </ul>
          <div class="footer">
            📍 Gastronomia 3300 — ${new Date().toLocaleDateString("da-DK")}
          </div>
          <script>
            window.print();
          <\/script>
        </body>
      </html>
    `;

    const win = window.open("", "_blank", "width=400,height=600");
    if (win) {
      win.document.write(printContent);
      win.document.close();
    } else {
      alert("Pop-up blokeret. Tillad pop-ups for at udskrive.");
    }
  };

  if (loading) return <div className={styles.loading}>Indlæser ordrer...</div>;
  if (error) return <div className={styles.error}>Fejl: {error}</div>;

  return (
    <div className={styles.container}>
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

              <div className={styles.orderActions}>
                <button
                  className={styles.printBtn}
                  onClick={() => printReceipt(order)}
                >
                  🖨️ Køkkenbon
                </button>

                {(
                  [
                    "pending",
                    "accepted",
                    "ready",
                    "completed",
                    "cancelled",
                  ] as OrderStatus[]
                ).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateStatus(order.id, status)}
                    disabled={
                      order.status === status || order.status === "cancelled"
                    }
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
