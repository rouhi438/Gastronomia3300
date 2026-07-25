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
  created_at: string;
  order_items: OrderItem[];
}

export default function OrderDetailPage() {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchLatestPendingOrder = async () => {
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
        const pending = data.orders.filter(
          (o: Order) => o.status === "pending",
        );
        if (pending.length === 0) {
          router.push("/admin/new-order");
          return;
        }
        setOrder(pending[0]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestPendingOrder();
  }, [router]);

  const handleAccept = () => {
    if (!order) return;
    router.push(`/admin/select-time/${order.id}`);
  };

  const handleCancel = async () => {
    if (!order) return;
    if (!confirm("Er du sikker på, at du vil annullere denne ordre?")) return;

    setProcessing(true);
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/auth");
      return;
    }

    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
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
      router.push("/admin/new-order");
    } catch (err: any) {
      alert(err.message);
      setProcessing(false);
    }
  };

  if (loading) return <div className={styles.loading}>Indlæser ordre...</div>;
  if (error) return <div className={styles.error}>Fejl: {error}</div>;
  if (!order) return <div className={styles.error}>Ingen ordre fundet.</div>;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.orderId}>Ordre #{order.id}</h2>
          <span className={styles.status}>Afventer</span>
        </div>

        <p className={styles.date}>
          {new Date(order.created_at).toLocaleString("da-DK")}
        </p>

        <div className={styles.customer}>
          <p>
            <strong>{order.customer_name}</strong>
            {order.customer_address && <span> • {order.customer_address}</span>}
            <span> • {order.customer_phone}</span>
          </p>
        </div>

        <div className={styles.items}>
          <ul>
            {order.order_items.map((item) => (
              <li key={item.id}>
                {item.quantity}× {item.item_name}
                {item.size && item.size !== "normal" && (
                  <span className={styles.meta}> ({item.size})</span>
                )}
                {item.extras && item.extras.length > 0 && (
                  <span className={styles.meta}>
                    {" "}
                    (+{item.extras.join(", ")})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.total}>
          <span>I alt:</span>
          <strong>{order.total_price} kr.</strong>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.acceptBtn}
            onClick={handleAccept}
            disabled={processing}
          >
            Acceptér
          </button>
          <button
            className={styles.cancelBtn}
            onClick={handleCancel}
            disabled={processing}
          >
            Annuller
          </button>
        </div>
      </div>
    </div>
  );
}
