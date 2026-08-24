"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Clock3, RefreshCw, XCircle } from "lucide-react";

import OrderReceipt from "@/components/OrderReceipt";

import styles from "./order.module.css";

type MoneyValue = number | string | null | undefined;

type OrderErrorKey = "invalidLink" | "fetchFailed" | "notFound";

interface PublicOrderItem {
  id: number;
  item_name: string;
  quantity: number;
  unit_price: MoneyValue;
  size: string | null;
  extras: string[] | null;
}

interface PublicOrder {
  id: number;
  created_at: string;
  updated_at: string;
  status: string;
  estimated_time: number | null;
  requested_time: string | null;
  delivery_method: "pickup" | "delivery";
  payment_method: "mobilepay" | "card";
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string | null;
  customer_address_line1: string | null;
  customer_postal_code: string | null;
  customer_city: string | null;
  customer_floor_door: string | null;
  order_note: string | null;
  cancel_reason: string | null;
  subtotal: MoneyValue;
  bag_included: boolean;
  bag_fee: MoneyValue;
  service_fee: MoneyValue;
  delivery_fee: MoneyValue;
  total_price: MoneyValue;
  order_items: PublicOrderItem[];
}

interface PublicOrderResponse {
  order?: PublicOrder;
  error?: string;
}

export default function CustomerOrderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const t = useTranslations("OrderStatus");

  const emailStatus = searchParams.get("email");
  const rawToken = params.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorKey, setErrorKey] = useState<OrderErrorKey | null>(null);

  const fetchOrder = useCallback(
    async (background = false) => {
      if (!token) {
        setErrorKey("invalidLink");
        setLoading(false);
        return;
      }

      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await fetch(
          `/api/orders/public/${encodeURIComponent(token)}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          },
        );

        const result = (await response.json()) as PublicOrderResponse;

        if (!response.ok) {
          console.error("Public order request failed:", result.error);
          throw new Error("fetchFailed");
        }

        if (!result.order) {
          throw new Error("notFound");
        }

        setOrder(result.order);
        setErrorKey(null);
      } catch (fetchError: unknown) {
        setErrorKey(
          fetchError instanceof Error && fetchError.message === "notFound"
            ? "notFound"
            : "fetchFailed",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    const initialFetchId = window.setTimeout(() => {
      void fetchOrder();
    }, 0);

    return () => {
      window.clearTimeout(initialFetchId);
    };
  }, [fetchOrder]);

  useEffect(() => {
    if (!order || order.status !== "pending") {
      return;
    }

    const intervalId = window.setInterval(() => {
      void fetchOrder(true);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [order, fetchOrder]);

  if (loading) {
    return (
      <main className={styles.statePage}>
        <RefreshCw className={styles.spinner} size={36} />

        <h1>{t("loading.title")}</h1>

        <p>{t("loading.description")}</p>
      </main>
    );
  }

  if (errorKey || !order) {
    const errorMessage =
      errorKey === "invalidLink"
        ? t("errors.invalidLink")
        : errorKey === "fetchFailed"
          ? t("errors.fetchFailed")
          : t("errors.notFound");

    return (
      <main className={styles.statePage}>
        <XCircle className={styles.errorIcon} size={42} />

        <h1>{t("errors.title")}</h1>

        <p>{errorMessage}</p>
      </main>
    );
  }

  const statusContent = (() => {
    if (order.status === "accepted") {
      const description =
        order.estimated_time && order.estimated_time > 0
          ? order.delivery_method === "delivery"
            ? t("accepted.estimatedDelivery", {
                minutes: order.estimated_time,
              })
            : t("accepted.estimatedPickup", {
                minutes: order.estimated_time,
              })
          : order.requested_time && order.requested_time !== "asap"
            ? order.delivery_method === "delivery"
              ? t("accepted.requestedDelivery", {
                  time: order.requested_time.replace(":", "."),
                })
              : t("accepted.requestedPickup", {
                  time: order.requested_time.replace(":", "."),
                })
            : t("accepted.processing");

      return {
        icon: CheckCircle2,
        title: t("accepted.title"),
        description,
        className: styles.accepted,
      };
    }

    if (order.status === "cancelled" || order.status === "rejected") {
      return {
        icon: XCircle,
        title: t("cancelled.title"),
        description: order.cancel_reason || t("cancelled.description"),
        className: styles.cancelled,
      };
    }

    if (emailStatus === "sent") {
      return {
        icon: Clock3,
        title: t("pending.sentTitle"),
        description: t("pending.emailSent"),
        className: styles.pending,
      };
    }

    if (emailStatus === "failed") {
      return {
        icon: Clock3,
        title: t("pending.registeredTitle"),
        description: t("pending.emailFailed"),
        className: styles.pending,
      };
    }

    return {
      icon: Clock3,
      title: t("pending.sentTitle"),
      description: t("pending.reviewing"),
      className: styles.pending,
    };
  })();

  const StatusIcon = statusContent.icon;

  return (
    <main className={styles.page}>
      <section
        className={`${styles.statusCard} ${statusContent.className}`}
        aria-live="polite"
      >
        <div className={styles.statusIcon} aria-hidden="true">
          <StatusIcon size={34} />
        </div>

        <div className={styles.statusText}>
          <p className={styles.orderNumber}>
            {t("orderNumber", { id: order.id })}
          </p>

          <h1>{statusContent.title}</h1>

          <p>{statusContent.description}</p>
        </div>

        {refreshing && (
          <RefreshCw
            className={styles.refreshingIcon}
            size={20}
            aria-label={t("refreshingAria")}
          />
        )}
      </section>

      <OrderReceipt order={order} />

      {order.status === "accepted" && (
        <div className={styles.orderActions}>
          <Link
            href="/menu"
            className={`btn-primary ${styles.backToMenuButton}`}
          >
            {t("backToMenu")}
          </Link>
        </div>
      )}

      {order.status === "pending" && (
        <p className={styles.autoUpdate}>{t("autoUpdate")}</p>
      )}
    </main>
  );
}
