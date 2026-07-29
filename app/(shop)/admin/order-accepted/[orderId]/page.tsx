"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import OrderReceipt from "@/components/OrderReceipt";
import styles from "./order-accepted.module.css";

interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  order_note: string | null;
  total_price: number;
  status: string;
  estimated_time: number | null;
  delivery_method: "pickup" | "delivery";
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
  const isViewMode = searchParams.get("view") === "1";

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
    if (!loading && order && !printed && !isViewMode) {
      const timer = setTimeout(() => {
        window.print();
        setPrinted(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, order, printed, isViewMode]);

  const handlePrint = () => {
    window.print();
  };

  const handleGoBack = () => {
    router.push("/admin/new-order");
  };

  if (loading) return <div className={styles.loading}>Indlæser ordre...</div>;
  if (error) return <div className={styles.error}>Fejl: {error}</div>;
  if (!order) return <div className={styles.error}>Ingen ordre fundet.</div>;

  // ===== OrderReceipt =====
  const receiptOrder = {
    id: order.id,
    created_at: order.created_at,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_address: order.customer_address,
    order_note: order.order_note,
    delivery_method: order.delivery_method || "pickup",
    estimated_time: order.estimated_time || null,
    total_price: order.total_price,
    status: order.status,
    order_items: order.order_items.map((item) => ({
      name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      size: item.size,
      extras: item.extras,
    })),
  };

  return (
    <div className={styles.page}>
      <div className={styles.actionsBar}>
        <button className={styles.printBtn} onClick={handlePrint}>
          🖨️ Print
        </button>
        <button className={styles.doneBtn} onClick={handleGoBack}>
          Tilbage til oversigt
        </button>
      </div>
      <OrderReceipt order={receiptOrder} />
    </div>
  );
}
