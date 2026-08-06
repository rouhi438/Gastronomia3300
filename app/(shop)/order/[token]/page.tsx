"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  MailCheck,
  MailWarning,
  RefreshCw,
  XCircle,
} from "lucide-react";

import OrderReceipt from "@/components/OrderReceipt";

import styles from "./order.module.css";

type MoneyValue = number | string | null | undefined;

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

function getStatusContent(order: PublicOrder) {
  if (order.status === "accepted") {
    return {
      icon: CheckCircle2,
      title: "Din ordre er accepteret",
      description:
        order.estimated_time && order.estimated_time > 0
          ? `Restauranten forventer, at ordren er klar om cirka ${order.estimated_time} minutter.`
          : "Restauranten er begyndt at behandle din ordre.",
      className: styles.accepted,
    };
  }

  if (order.status === "cancelled" || order.status === "rejected") {
    return {
      icon: XCircle,
      title: "Din ordre kunne ikke accepteres",
      description:
        order.cancel_reason || "Kontakt restauranten, hvis du har spørgsmål.",
      className: styles.cancelled,
    };
  }

  return {
    icon: Clock3,
    title: "Vi har modtaget din ordre",
    description:
      "Restauranten gennemgår din ordre. Siden opdateres automatisk.",
    className: styles.pending,
  };
}

export default function CustomerOrderPage() {
  const params = useParams();

  const searchParams = useSearchParams();

  const emailStatus = searchParams.get("email");

  const rawToken = params.token;

  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  const [order, setOrder] = useState<PublicOrder | null>(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const fetchOrder = useCallback(
    async (background = false) => {
      if (!token) {
        setError("Linket til ordren er ugyldigt.");
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
          throw new Error(result.error || "Ordren kunne ikke hentes.");
        }

        if (!result.order) {
          throw new Error("Ordren blev ikke fundet.");
        }

        setOrder(result.order);
        setError("");
      } catch (fetchError: unknown) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Ordren kunne ikke hentes.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void fetchOrder();
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

        <h1>Henter din ordre</h1>

        <p>Vent et øjeblik, mens vi finder din kvittering.</p>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className={styles.statePage}>
        <XCircle className={styles.errorIcon} size={42} />

        <h1>Ordren kunne ikke vises</h1>

        <p>{error || "Ordren blev ikke fundet."}</p>
      </main>
    );
  }

  const statusContent = getStatusContent(order);

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
          <p className={styles.orderNumber}>Ordre #{order.id}</p>

          <h1>{statusContent.title}</h1>

          <p>{statusContent.description}</p>
        </div>

        {refreshing && (
          <RefreshCw
            className={styles.refreshingIcon}
            size={20}
            aria-label="Opdaterer ordrestatus"
          />
        )}
      </section>

      {emailStatus === "sent" && (
        <section className={`${styles.emailNotice} ${styles.emailSuccess}`}>
          <MailCheck size={28} aria-hidden="true" />

          <div>
            <h2>Tak! Din ordre er sendt</h2>

            <p>
              Din ordre #{order.id} er registreret og sendt til Gastronomia
              3300.
            </p>

            <p>
              Tjek din indbakke og eventuelt din spam-mappe. Du modtager en ny
              e-mail, når restauranten har accepteret ordren og bekræftet
              tidspunktet.
            </p>
          </div>
        </section>
      )}

      {emailStatus === "failed" && (
        <section className={`${styles.emailNotice} ${styles.emailWarning}`}>
          <MailWarning size={28} aria-hidden="true" />

          <div>
            <h2>Din ordre er registreret</h2>

            <p>
              Bekræftelsesmailen kunne ikke sendes, men ordren er stadig sendt
              til Gastronomia 3300.
            </p>

            <p>Du kan følge ordrestatus direkte på denne side.</p>
          </div>
        </section>
      )}

      <OrderReceipt order={order} />

      {order.status === "pending" && (
        <p className={styles.autoUpdate}>
          Ordrestatus opdateres automatisk hvert 5. sekund.
        </p>
      )}
    </main>
  );
}
