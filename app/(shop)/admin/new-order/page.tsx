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
  const [processing, setProcessing] = useState<number | null>(null); // order id being processed
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ===== Play beep sound =====
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
    } catch (_) {
      // Silently ignore if audio not supported
    }
  };

  // ===== Fetch pending orders =====
  const fetchPendingOrders = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/auth");
      return;
    }

    try {
      const res = await fetch("/api/admin/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  // ===== Initial fetch and polling =====
  useEffect(() => {
    fetchPendingOrders();

    // Poll every 5 seconds to check for new pending orders
    intervalRef.current = setInterval(() => {
      fetchPendingOrders();
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [router]);

  // ===== Alarm: beep when there are pending orders =====
  useEffect(() => {
    const pendingOrders = orders.filter((o) => o.status === "pending");
    if (pendingOrders.length > 0 && processing === null) {
      // Start beeping every 3 seconds
      const alarmInterval = setInterval(() => {
        playBeep();
      }, 3000);
      return () => clearInterval(alarmInterval);
    } else {
      // Stop beeping when no pending orders or processing
      // We'll clear any existing interval by returning a cleanup that does nothing
      // Actually we handle it by returning a cleanup that clears interval if we store it
    }
  }, [orders, processing]);

  // ===== Accept order =====
  const handleAccept = (orderId: number) => {
    setProcessing(orderId);
    // Redirect to a time selection page or show time options inline? For now, we'll navigate to a new page.
    // But we can also show a modal or inline options. Since user requested "صفحه زمان‌ها با چک باکس انتخاب ظاهر بشن عمودی و در یک صفحه کامل",
    // we should navigate to a time selection page. We'll create a new page /admin/select-time/[orderId] later.
    // For now, we can just set processing and maybe show a temporary message.
    router.push(`/admin/select-time/${orderId}`);
  };

  // ===== Cancel order =====
  const handleCancel = async (orderId: number) => {
    if (!confirm("Er du sikker på, at du vil annullere denne ordre?")) return;
    setProcessing(orderId);
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
      // Remove this order from the list
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setProcessing(null);
      // Optionally, we could show a success message
    } catch (err: any) {
      alert(err.message);
      setProcessing(null);
    }
  };

  if (loading) return <div className={styles.loading}>Indlæser ordrer...</div>;
  if (error) return <div className={styles.error}>Fejl: {error}</div>;

  // If no pending orders, show a message
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

  // Show the first pending order (should only be one at a time for simplicity)
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
