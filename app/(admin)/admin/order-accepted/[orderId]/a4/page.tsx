"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./a4.module.css";

type Money = number | string;

type OrderItem = {
  id: number;
  item_name: string;
  quantity: number;
  unit_price: Money;
  size: string | null;
  extras: string[] | null;
};

type Order = {
  id: number;
  created_at: string;
  customer_name: string;
  customer_address: string | null;
  customer_email: string | null;
  delivery_method: "pickup" | "delivery";
  payment_method: string;
  subtotal: Money;
  discount_percent: number | null;
  discount_amount: Money | null;
  bag_fee: Money;
  service_fee: Money;
  delivery_fee: Money;
  total_price: Money;
  order_items: OrderItem[];
};

const money = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
});

const dateTime = new Intl.DateTimeFormat("da-DK", {
  timeZone: "Europe/Copenhagen",
  dateStyle: "long",
  timeStyle: "short",
});

function formatMoney(value: Money | null | undefined) {
  return money.format(Number(value ?? 0));
}

export default function OrderA4Page() {
  const params = useParams();
  const router = useRouter();
  const orderId = String(params.orderId);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrder() {
      try {
        const response = await fetch(
          `/api/admin/orders/${encodeURIComponent(orderId)}`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (response.status === 401) {
          router.replace("/auth");
          return;
        }

        if (!response.ok) {
          throw new Error("Ordren kunne ikke hentes.");
        }

        const payload = (await response.json()) as {
          order: Order;
        };

        if (!controller.signal.aborted) {
          setOrder(payload.order);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Der opstod en fejl.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadOrder();

    return () => controller.abort();
  }, [orderId, router]);

  if (loading) {
    return <main className={styles.page}>Indlæser dokument...</main>;
  }

  if (error || !order) {
    return (
      <main className={styles.page}>
        <p>{error || "Ordren blev ikke fundet."}</p>
      </main>
    );
  }

  const paymentLabel =
    order.payment_method === "mobilepay"
      ? "MobilePay"
      : order.payment_method === "card"
        ? "Betalingskort"
        : "Anden betalingsmetode";

  const discount = Number(order.discount_amount ?? 0);

  return (
    <main className={styles.page} data-a4-print>
      <div className={styles.toolbar}>
        <Link
          href={`/admin/order-accepted/${order.id}?view=1`}
          className={styles.backButton}
        >
          ← Tilbage til ordre
        </Link>

        <button
          type="button"
          className={styles.printButton}
          onClick={() => window.print()}
        >
          Print A4 / Gem som PDF
        </button>
      </div>

      <article className={styles.document}>
        <header className={styles.documentHeader}>
          <div className={styles.headerGrid}>
            <div className={styles.restaurantInfo}>
              <h1 className={styles.restaurantName}>Gastronomia 3300</h1>
              <p>Hillerødvej 38A, 3300 Frederiksværk</p>
              <p>Tlf: +45 40 40 41 83</p>
            </div>

            <div className={styles.orderInfo}>
              <h2 className={styles.documentTitle}>Ordrebekræftelse</h2>
              <strong>Ordre #{order.id}</strong>
              <p>{dateTime.format(new Date(order.created_at))}</p>
            </div>
          </div>

          <div className={styles.italianDivider} aria-hidden="true" />
        </header>

        <section className={styles.customerSection}>
          <div className={styles.customerGrid}>
            <div className={styles.customerIdentity}>
              <strong>{order.customer_name}</strong>
              {order.customer_address && <p>{order.customer_address}</p>}
            </div>

            <div className={styles.customerMeta}>
              <span>
                {order.delivery_method === "delivery"
                  ? "Levering"
                  : "Afhentning"}
              </span>
              <span>{paymentLabel}</span>
            </div>
          </div>
        </section>

        <section className={styles.itemsSection}>
          <h3>Bestilling</h3>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th align="left">Vare</th>
                <th align="right">Antal</th>
                <th align="right">Stk. pris</th>
                <th align="right">Beløb</th>
              </tr>
            </thead>
            <tbody>
              {order.order_items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.item_name}</strong>
                    {item.size && item.size !== "normal" && (
                      <div>{item.size}</div>
                    )}
                    {item.extras?.map((extra, index) => (
                      <div key={`${item.id}-${index}`}>+ {extra}</div>
                    ))}
                  </td>
                  <td align="right">{item.quantity}</td>
                  <td align="right">{formatMoney(item.unit_price)}</td>
                  <td align="right">
                    {formatMoney(Number(item.unit_price) * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.totalsSection}>
          <h3>Betalingsoversigt</h3>
          <table className={styles.totalsTable}>
            <tbody>
              <tr>
                <td>Varer i alt</td>
                <td align="right">{formatMoney(order.subtotal)}</td>
              </tr>
              {discount > 0 && (
                <tr>
                  <td>
                    Rabat
                    {order.discount_percent != null
                      ? ` (${order.discount_percent}%)`
                      : ""}
                  </td>
                  <td align="right">−{formatMoney(discount)}</td>
                </tr>
              )}
              {Number(order.bag_fee) > 0 && (
                <tr>
                  <td>Pose</td>
                  <td align="right">{formatMoney(order.bag_fee)}</td>
                </tr>
              )}
              <tr>
                <td>Servicegebyr</td>
                <td align="right">{formatMoney(order.service_fee)}</td>
              </tr>
              {order.delivery_method === "delivery" && (
                <tr>
                  <td>Levering</td>
                  <td align="right">{formatMoney(order.delivery_fee)}</td>
                </tr>
              )}
              <tr>
                <th align="left">I alt</th>
                <th align="right">{formatMoney(order.total_price)}</th>
              </tr>
            </tbody>
          </table>
        </section>

        <footer className={styles.documentFooter}>
          <div className={styles.footerText}>
            <strong>Tak for din bestilling!</strong>
            <span>https://gastronomia3300.dk</span>
          </div>

          <svg
            className={styles.italianFlag}
            viewBox="0 0 150 32"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Italiensk flag"
            role="img"
          >
            <defs>
              <clipPath id="a4FlagWave">
                <path d="M2 7 Q28 -1 52 6 T101 7 T148 6 L148 25 Q123 33 99 25 T50 25 T2 25 Z" />
              </clipPath>
            </defs>

            <g clipPath="url(#a4FlagWave)">
              <rect width="50" height="32" fill="#159447" />
              <rect x="50" width="50" height="32" fill="#ffffff" />
              <rect x="100" width="50" height="32" fill="#CE293D" />
            </g>
          </svg>
        </footer>
      </article>
    </main>
  );
}
