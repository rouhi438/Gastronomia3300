"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./new-order.module.css";

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
  created_at: string;
  order_items: OrderItem[];
}

export default function NewOrderPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const playBeep = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContextRef.current.currentTime + 0.2,
      );
      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + 0.2);
    } catch (_) {}
  };

  const fetchPendingOrders = async () => {
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
      const pending = data.orders.filter((o: Order) => o.status === "pending");
      setOrders(pending);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingOrders();
    intervalRef.current = setInterval(() => fetchPendingOrders(), 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [router]);

  useEffect(() => {
    const pendingOrders = orders.filter((o) => o.status === "pending");
    if (pendingOrders.length > 0 && processing === null) {
      const alarmInterval = setInterval(() => playBeep(), 3000);
      return () => clearInterval(alarmInterval);
    }
  }, [orders, processing]);

  const handleAccept = (orderId: number) => {
    setProcessing(orderId);
    router.push(`/admin/select-time/${orderId}`);
  };

  const handleCancel = async (orderId: number) => {
    if (!confirm("Er du sikker på, at du vil annullere denne ordre?")) return;
    setProcessing(orderId);
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
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (res.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        router.push("/auth");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel order");
      }

      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setProcessing(null);
    } catch (err: any) {
      alert(err.message);
      setProcessing(null);
    }
  };

  if (loading) return <div className={styles.loading}>Indlæser ordrer...</div>;
  if (error) return <div className={styles.error}>Fejl: {error}</div>;

  if (orders.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <h1 className={styles.emptyTitle}>🎉 Ingen nye ordrer</h1>
        <p className={styles.emptySub}>Vent på næste bestilling.</p>
        <button
          className={styles.backBtn}
          onClick={() => router.push("/admin/orders")}
        >
          Gå til ordreoversigt
        </button>
      </div>
    );
  }

  const order = orders.find((o) => o.status === "pending");
  if (!order) {
    return (
      <div className={styles.emptyContainer}>
        <h1>Ingen nye ordrer</h1>
        <button onClick={() => router.push("/admin/orders")}>
          Gå til ordreoversigt
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.notification}>
        <span className={styles.bell}>🛎️</span>
        <h1 className={styles.title}>Ny ordre modtaget!</h1>
      </div>

      <div className={styles.orderCard}>
        <div className={styles.orderHeader}>
          <div className={styles.orderLeft}>
            <h2 className={styles.orderId}>Ordre #{order.id}</h2>
            <p className={styles.orderDate}>
              {new Date(order.created_at).toLocaleString("da-DK")}
            </p>
            <p className={styles.orderCustomer}>
              <strong>{order.customer_name}</strong>
              {order.customer_address && (
                <span> • {order.customer_address}</span>
              )}
              <span> • {order.customer_phone}</span>
            </p>
          </div>
          <div className={styles.orderRight}>
            <span className={styles.orderTotal}>{order.total_price} kr.</span>
          </div>
        </div>

        <div className={styles.orderItems}>
          <ul>
            {order.order_items.map((item) => (
              <li key={item.id}>
                {item.quantity}× {item.item_name}
                {item.size && item.size !== "normal" && (
                  <span> ({item.size})</span>
                )}
                {item.extras && item.extras.length > 0 && (
                  <span> (+{item.extras.join(", ")})</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.acceptBtn}
            onClick={() => handleAccept(order.id)}
            disabled={processing === order.id}
          >
            ✅ Acceptér
          </button>
          <button
            className={styles.cancelBtn}
            onClick={() => handleCancel(order.id)}
            disabled={processing === order.id}
          >
            ❌ Annuller
          </button>
        </div>
      </div>
    </div>
  );
}
