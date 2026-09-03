"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import OrderCountdown from "@/components/OrderCountdown";
import RatingStar from "@/components/RatingStar";
import styles from "./admin.module.css";

type OrderStatus = "pending" | "accepted" | "ready" | "completed" | "cancelled";

type RefundStatus = "pending" | "completed" | "failed";

type DateFilter = "today" | "yesterday" | "lastWeek" | "lastMonth";
interface OrderFeedbackSummary {
  rating: number;
  admin_seen_at: string | null;
  admin_replied_at: string | null;
  created_at: string;
}

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
  refund_status: RefundStatus | null;
  refund_amount_minor: number | null;
  nets_charge_id: string | null;
  estimated_time: number | null;
  created_at: string;
  delivery_method: "pickup" | "delivery";
  order_items: OrderItem[];
  accepted_at: string | null;
  fulfillment_due_at: string | null;
  completed_at: string | null;
  feedback_summary: OrderFeedbackSummary | null;
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

const refundStatusLabels: Record<RefundStatus, string> = {
  pending: "Refund afventer",
  completed: "Refund gennemført",
  failed: "Refund mislykkedes",
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

export default function AdminOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<DateFilter>("today");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [completingOrderId, setCompletingOrderId] = useState<number | null>(
    null,
  );
  const [actionError, setActionError] = useState("");

  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [reportError, setReportError] = useState("");

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
    const initialFetch = window.setTimeout(() => {
      void fetchOrders();
    }, 0);

    const interval = window.setInterval(() => {
      void fetchOrders();
    }, 15_000);

    return () => {
      window.clearTimeout(initialFetch);
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

  const handleCompleteOrder = async (order: Order) => {
    if (
      completingOrderId !== null ||
      (order.status !== "accepted" && order.status !== "ready")
    ) {
      return;
    }

    const completionLabel =
      order.delivery_method === "delivery" ? "leveret" : "afhentet";

    if (!window.confirm(`Bekræft, at ordren er ${completionLabel}.`)) {
      return;
    }

    setCompletingOrderId(order.id);
    setActionError("");

    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "completed",
        }),
      });

      if (response.status === 401) {
        router.replace(`/auth?redirect=${encodeURIComponent("/admin/orders")}`);
        return;
      }

      const data = (await response.json().catch(() => null)) as {
        order?: Order;
        error?: string;
      } | null;

      if (!response.ok || !data?.order) {
        throw new Error(data?.error || "Ordren kunne ikke afsluttes.");
      }

      const updatedOrder = data.order;

      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === updatedOrder.id ? updatedOrder : currentOrder,
        ),
      );
    } catch (completeError: unknown) {
      setActionError(
        completeError instanceof Error
          ? completeError.message
          : "Ordren kunne ikke afsluttes.",
      );
    } finally {
      setCompletingOrderId(null);
    }
  };

  const openAccountingReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!reportFrom || !reportTo) {
      setReportError("Vælg både startdato og slutdato.");
      return;
    }

    if (reportFrom > reportTo) {
      setReportError("Startdatoen skal være før eller lig med slutdatoen.");
      return;
    }

    setReportError("");

    const searchParams = new URLSearchParams({
      from: reportFrom,
      to: reportTo,
    });

    router.push(`/admin/accounting-report?${searchParams.toString()}`);
  };

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

      <section
        className={styles.accountingPanel}
        aria-labelledby="accounting-report-title"
      >
        <div className={styles.accountingIntro}>
          <span className={styles.accountingEyebrow}>Regnskab</span>

          <h2 id="accounting-report-title" className={styles.accountingTitle}>
            Omsætningsrapport
          </h2>

          <p className={styles.accountingDescription}>
            Vælg en periode og opret en samlet rapport over betalte ordrer.
          </p>
        </div>

        <form className={styles.accountingForm} onSubmit={openAccountingReport}>
          <label className={styles.accountingField}>
            <span>Fra dato</span>

            <input
              type="date"
              value={reportFrom}
              max={reportTo || undefined}
              required
              className={styles.accountingInput}
              onChange={(event) => {
                setReportFrom(event.target.value);
                setReportError("");
              }}
            />
          </label>

          <label className={styles.accountingField}>
            <span>Til dato</span>

            <input
              type="date"
              value={reportTo}
              min={reportFrom || undefined}
              required
              className={styles.accountingInput}
              onChange={(event) => {
                setReportTo(event.target.value);
                setReportError("");
              }}
            />
          </label>

          <button type="submit" className={styles.accountingButton}>
            Opret rapport
          </button>
        </form>

        {reportError && (
          <p className={styles.accountingError} role="alert">
            {reportError}
          </p>
        )}
      </section>

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

      {actionError && (
        <div className={styles.actionError} role="alert">
          {actionError}
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>✓</span>

          <p>Ingen ordrer i denne periode.</p>
        </div>
      ) : (
        <section className={styles.orderList}>
          {filteredOrders.map((order) => {
            return (
              <article
                key={order.id}
                className={`${styles.orderCard} ${
                  order.feedback_summary ? styles.orderCardWithFeedback : ""
                }`}
              >
                {" "}
                <button
                  type="button"
                  className={styles.orderCardMain}
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
                        {new Date(order.created_at).toLocaleTimeString(
                          "da-DK",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </span>

                      <span>
                        {new Date(order.created_at).toLocaleDateString("da-DK")}
                      </span>

                      <span
                        className={`${styles.statusBadge} ${
                          styles[`statusBadge_${order.status}`]
                        }`}
                      >
                        {order.status === "completed"
                          ? order.delivery_method === "delivery"
                            ? "Leveret"
                            : "Afhentet"
                          : statusLabels[order.status]}
                      </span>

                      {order.refund_status && (
                        <span
                          className={`${styles.statusBadge} ${
                            order.refund_status === "completed"
                              ? styles.statusBadge_accepted
                              : order.refund_status === "failed"
                                ? styles.statusBadge_cancelled
                                : styles.statusBadge_pending
                          }`}
                        >
                          {refundStatusLabels[order.refund_status]}

                          {typeof order.refund_amount_minor === "number"
                            ? ` · ${(
                                order.refund_amount_minor / 100
                              ).toLocaleString("da-DK", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} kr.`
                            : ""}
                        </span>
                      )}

                      {order.status === "cancelled" &&
                        order.nets_charge_id &&
                        !order.refund_status && (
                          <span
                            className={`${styles.statusBadge} ${styles.statusBadge_cancelled}`}
                          >
                            Refund mangler
                          </span>
                        )}
                    </span>

                    <span className={styles.customerName}>
                      {order.customer_name}
                    </span>

                    <span className={styles.itemsSummary}>
                      Ønsket tidspunkt:{" "}
                      {formatRequestedTime(order.requested_time)}
                    </span>

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
                {order.feedback_summary && (
                  <button
                    type="button"
                    className={`${styles.feedbackAction} ${
                      order.feedback_summary.admin_seen_at
                        ? ""
                        : styles.feedbackActionNew
                    }`}
                    onClick={() => router.push(`/admin/feedback/${order.id}`)}
                  >
                    <RatingStar size={15} />

                    <span>
                      {!order.feedback_summary.admin_seen_at
                        ? "Ny feedback"
                        : order.feedback_summary.admin_replied_at
                          ? "Feedback besvaret"
                          : "Se feedback"}
                    </span>

                    <strong>{order.feedback_summary.rating}/5</strong>
                  </button>
                )}
                {(order.status === "accepted" || order.status === "ready") &&
                  order.accepted_at !== null &&
                  order.fulfillment_due_at !== null && (
                    <div className={styles.fulfillmentActions}>
                      <OrderCountdown
                        acceptedAt={order.accepted_at}
                        fulfillmentDueAt={order.fulfillment_due_at}
                      />

                      <button
                        type="button"
                        className={styles.completeOrderButton}
                        disabled={completingOrderId === order.id}
                        onClick={() => void handleCompleteOrder(order)}
                      >
                        {completingOrderId === order.id
                          ? "Gemmer..."
                          : order.delivery_method === "delivery"
                            ? "Leveret"
                            : "Afhentet"}
                      </button>
                    </div>
                  )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
