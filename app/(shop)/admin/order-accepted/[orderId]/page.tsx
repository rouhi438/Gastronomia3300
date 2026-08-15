"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import OrderReceipt from "@/components/OrderReceipt";

import styles from "./order-accepted.module.css";

type MoneyValue = number | string | null | undefined;

interface OrderItem {
  id: number;
  item_name: string;
  quantity: number;
  unit_price: MoneyValue;
  size: string | null;
  extras: string[] | null;
}

interface Order {
  id: number;
  created_at: string;

  customer_name: string;
  customer_phone: string;
  customer_email: string | null;

  customer_address: string | null;
  customer_address_line1: string | null;
  customer_postal_code: string | null;
  customer_city: string | null;
  customer_floor_door: string | null;

  order_note: string | null;

  delivery_method: "pickup" | "delivery";
  payment_method: "mobilepay" | "card";

  requested_time: string | null;
  estimated_time: number | null;

  subtotal: MoneyValue;
  bag_included: boolean;
  bag_fee: MoneyValue;
  service_fee: MoneyValue;
  delivery_fee: MoneyValue;
  total_price: MoneyValue;

  status: string;
  order_items: OrderItem[];
  previous_orders_count: number | null;
}

interface OrdersResponse {
  orders?: Order[];
  error?: string;
}

export default function OrderAcceptedPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const orderId = String(params.orderId);
  const isViewMode = searchParams.get("view") === "1";

  const [order, setOrder] = useState<Order | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchOrder = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/admin/orders", {
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          router.replace(
            `/auth?redirect=${encodeURIComponent(
              `/admin/order-accepted/${orderId}`,
            )}`,
          );

          return;
        }

        const data = (await response.json()) as OrdersResponse;

        if (!response.ok) {
          throw new Error(data.error || "Kunne ikke hente ordren.");
        }

        const numericOrderId = Number(orderId);

        if (!Number.isInteger(numericOrderId) || numericOrderId <= 0) {
          throw new Error("Ugyldigt ordrenummer.");
        }

        const foundOrder = data.orders?.find(
          (currentOrder) => currentOrder.id === numericOrderId,
        );

        if (!foundOrder) {
          throw new Error("Ordren blev ikke fundet.");
        }

        if (!cancelled) {
          setOrder(foundOrder);
        }
      } catch (fetchError: unknown) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Kunne ikke hente ordren.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId, router]);

  useEffect(() => {
    if (loading || !order || printed || isViewMode) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.print();
      setPrinted(true);
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loading, order, printed, isViewMode]);

  const handlePrint = () => {
    window.print();
  };

  const handleGoBack = () => {
    router.push("/admin/new-order");
  };

  if (loading) {
    return <div className={styles.loading}>Indlæser ordre...</div>;
  }

  if (error) {
    return <div className={styles.error}>Fejl: {error}</div>;
  }

  if (!order) {
    return <div className={styles.error}>Ingen ordre fundet.</div>;
  }

  const receiptOrder = {
    id: order.id,
    created_at: order.created_at,

    customer_name: order.customer_name,

    customer_phone: order.customer_phone,

    customer_email: order.customer_email,

    customer_address: order.customer_address,

    customer_address_line1: order.customer_address_line1,

    customer_postal_code: order.customer_postal_code,

    customer_city: order.customer_city,

    customer_floor_door: order.customer_floor_door,

    order_note: order.order_note,

    delivery_method: order.delivery_method,

    payment_method: order.payment_method,

    requested_time: order.requested_time,

    estimated_time: order.estimated_time,

    subtotal: order.subtotal,

    bag_included: order.bag_included,

    bag_fee: order.bag_fee,

    service_fee: order.service_fee,

    delivery_fee: order.delivery_fee,

    total_price: order.total_price,

    status: order.status,

    order_items: order.order_items.map((item) => ({
      item_name: item.item_name,

      quantity: item.quantity,

      unit_price: item.unit_price,

      size: item.size,

      extras: item.extras ?? [],
    })),
  };

  return (
    <div className={styles.page}>
      <div className={`${styles.actionsBar} noPrint`}>
        <button type="button" className={styles.printBtn} onClick={handlePrint}>
          🖨️ Print
        </button>

        <button type="button" className={styles.doneBtn} onClick={handleGoBack}>
          Tilbage til oversigt
        </button>
      </div>

      <OrderReceipt
        order={receiptOrder}
        previousOrdersCount={order.previous_orders_count}
      />
    </div>
  );
}
