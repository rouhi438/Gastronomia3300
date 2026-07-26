"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import styles from "./order-accepted.module.css";

interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  total_price: number;
  status: string;
  estimated_time: number | null;
  created_at: string;
  order_items: {
    id: number;
    item_name: string;
    quantity: number;
    unit_price: number;
    size: string;
    extras: string[];
  }[];
}

export default function OrderAcceptedPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params.orderId as string;
  const estimatedTime = searchParams.get("time") || "30";

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
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
          throw new Error(data.error || "Failed to fetch order");
        }

        const data = await res.json();
        const found = data.orders.find((o: Order) => o.id === Number(orderId));
        if (!found) throw new Error("Order not found");
        setOrder(found);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, router]);

  useEffect(() => {
    if (!loading && order && !printed) {
      const timer = setTimeout(() => {
        window.print();
        setPrinted(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, order, printed]);

  const handlePrint = () => {
    window.print();
  };

  const handleGoBack = () => {
    router.push("/admin/new-order");
  };

  if (loading) return <div className={styles.loading}>Indlæser ordre...</div>;
  if (error) return <div className={styles.error}>Fejl: {error}</div>;
  if (!order) return <div className={styles.error}>Ingen ordre fundet.</div>;

  const acceptedTime = new Date().toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.badge}>✅</div>
        <h1 className={styles.title}>Ordre accepteret</h1>
        <p className={styles.message}>
          Ordre #{order.id} er accepteret og vil være klar om ca.{" "}
          <strong>{estimatedTime} minutter</strong>.
        </p>
        <p className={styles.timeStamp}>Accepteret kl. {acceptedTime}</p>

        <div className={styles.orderSummary}>
          <h3>Ordre detaljer</h3>
          <p>
            <strong>{order.customer_name}</strong>
            {order.customer_address && <span> • {order.customer_address}</span>}
            <span> • {order.customer_phone}</span>
          </p>
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
          <p className={styles.total}>
            I alt: <strong>{order.total_price} kr.</strong>
          </p>
        </div>

        <div className={styles.actions}>
          <button className={styles.printBtn} onClick={handlePrint}>
            🖨️ Print
          </button>
          <button className={styles.doneBtn} onClick={handleGoBack}>
            Tilbage til oversigt
          </button>
        </div>
      </div>
    </div>
  );
}
