"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

type OrderStatus = "pending" | "accepted" | "ready" | "completed" | "cancelled";

type DateFilter = "today" | "yesterday" | "lastWeek" | "lastMonth";

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
  order_note: string | null;
  requested_time: string;
  total_price: number;
  status: OrderStatus;
  estimated_time: number | null;
  created_at: string;
  delivery_method: "pickup" | "delivery";
  order_items: OrderItem[];
}

const filters: Array<{
  id: DateFilter;
  label: string;
}> = [
  { id: "today", label: "I dag" },
  { id: "yesterday", label: "I går" },
  { id: "lastWeek", label: "Sidste uge" },
  { id: "lastMonth", label: "Sidste måned" },
];

const statusLabels: Record<OrderStatus, string> = {
  pending: "Afventer",
  accepted: "Accepteret",
  ready: "Klar",
  completed: "Leveret",
  cancelled: "Annulleret",
};

function formatRequestedTime(requestedTime: string | null | undefined) {
  if (!requestedTime || requestedTime === "asap") {
    return "Hurtigst muligt";
  }

  return requestedTime;
}

function getStartOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getEndOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function isOrderInFilter(createdAt: string, filter: DateFilter) {
  const orderDate = new Date(createdAt);

  if (Number.isNaN(orderDate.getTime())) {
    return false;
  }

  const now = new Date();

  if (filter === "today") {
    return orderDate >= getStartOfDay(now) && orderDate <= getEndOfDay(now);
  }

  if (filter === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    return (
      orderDate >= getStartOfDay(yesterday) &&
      orderDate <= getEndOfDay(yesterday)
    );
  }

  if (filter === "lastWeek") {
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return (
      orderDate >= getStartOfDay(sevenDaysAgo) && orderDate <= getEndOfDay(now)
    );
  }

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return (
    orderDate >= getStartOfDay(thirtyDaysAgo) && orderDate <= getEndOfDay(now)
  );
}

function formatOrderItems(orderItems: OrderItem[]) {
  const visibleItems = orderItems.slice(0, 2);

  const formattedItems = visibleItems
    .map((item) => `${item.quantity}× ${item.item_name}`)
    .join(", ");

  const remainingItems = orderItems.length - visibleItems.length;

  if (remainingItems > 0) {
    return `${formattedItems} +${remainingItems}`;
  }

  return formattedItems;
}

export default function AdminOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<DateFilter>("today");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/orders", {
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/auth");
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Kunne ikke hente ordrer");
      }

      setOrders(Array.isArray(data?.orders) ? data.orders : []);

      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente ordrer");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchOrders();

    const interval = window.setInterval(fetchOrders, 15_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => isOrderInFilter(order.created_at, activeFilter))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [orders, activeFilter]);

  const filteredTotal = useMemo(() => {
    return filteredOrders.reduce((sum, order) => sum + order.total_price, 0);
  }, [filteredOrders]);

  const openOrder = (orderId: number) => {
    router.push(`/admin/order-accepted/${orderId}?view=1`);
  };

  if (loading) {
    return <div className={styles.loading}>Indlæser ordrer...</div>;
  }

  if (error) {
    return <div className={styles.error}>Fejl: {error}</div>;
  }

  return (
    <main className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Ordrer</h1>

          <p className={styles.subtitle}>{filteredOrders.length} ordrer</p>
        </div>

        <div className={styles.summary}>
          <span className={styles.summaryLabel}>I alt</span>

          <strong className={styles.summaryPrice}>{filteredTotal} kr.</strong>
        </div>
      </div>

      <nav className={styles.tabs} aria-label="Filtrer ordrer efter dato">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`${styles.tab} ${
              activeFilter === filter.id ? styles.activeTab : ""
            }`}
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </nav>

      {filteredOrders.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>✓</span>

          <p>Ingen ordrer i denne periode.</p>
        </div>
      ) : (
        <section className={styles.orderList}>
          {filteredOrders.map((order) => {
            const itemSummary = formatOrderItems(order.order_items);

            const extraItemsCount = Math.max(order.order_items.length - 2, 0);

            return (
              <button
                key={order.id}
                type="button"
                className={styles.orderCard}
                onClick={() => openOrder(order.id)}
              >
                <span
                  className={`${styles.statusIcon} ${
                    styles[`status_${order.status}`]
                  }`}
                  aria-hidden="true"
                >
                  {order.status === "cancelled" ? "×" : "✓"}
                </span>

                <span className={styles.orderContent}>
                  <span className={styles.orderTopRow}>
                    <strong className={styles.orderNumber}>
                      Ordre #{order.id}
                    </strong>

                    <strong className={styles.orderPrice}>
                      {order.total_price} kr.
                    </strong>
                  </span>

                  <span className={styles.orderMeta}>
                    <span>
                      {new Date(order.created_at).toLocaleTimeString("da-DK", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    <span>
                      {new Date(order.created_at).toLocaleDateString("da-DK")}
                    </span>

                    <span
                      className={`${styles.statusBadge} ${
                        styles[`statusBadge_${order.status}`]
                      }`}
                    >
                      {statusLabels[order.status]}
                    </span>
                  </span>

                  <span className={styles.customerName}>
                    {order.customer_name}
                  </span>
                  <span className={styles.itemsSummary}>
                    Ønsket tidspunkt:{" "}
                    {formatRequestedTime(order.requested_time)}
                  </span>

                  {itemSummary && (
                    <span className={styles.itemsSummary}>
                      {itemSummary}

                      {extraItemsCount > 0 && ` +${extraItemsCount}`}
                    </span>
                  )}
                  {order.order_note && (
                    <span className={styles.orderNote}>
                      Kommentar: {order.order_note}
                    </span>
                  )}
                </span>

                <span className={styles.arrow} aria-hidden="true">
                  ›
                </span>
              </button>
            );
          })}
        </section>
      )}
    </main>
  );
}
