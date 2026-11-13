"use client";

import { useEffect, useId, useRef, useState } from "react";
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

function A4Header({ order }: { order: Order }) {
  return (
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
  );
}

function A4Items({ items }: { items: OrderItem[] }) {
  return (
    <section className={styles.itemsSection} data-a4-items>
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
          {items.map((item) => (
            <tr key={item.id} data-a4-item-row>
              <td>
                <strong>{item.item_name}</strong>

                {item.size && item.size !== "normal" && <div>{item.size}</div>}

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
  );
}

function A4Footer() {
  const flagId = useId();
  return (
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
          <clipPath id={flagId}>
            <path d="M2 7 Q28 -1 52 6 T101 7 T148 6 L148 25 Q123 33 99 25 T50 25 T2 25 Z" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${flagId})`}>
          <rect width="50" height="32" fill="#159447" />
          <rect x="50" width="50" height="32" fill="#ffffff" />
          <rect x="100" width="50" height="32" fill="#CE293D" />
        </g>
      </svg>
    </footer>
  );
}

function A4Totals({ order }: { order: Order }) {
  const discount = Number(order.discount_amount ?? 0);

  return (
    <section className={styles.totalsSection} data-a4-totals>
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
  );
}

type A4SheetProps = {
  order: Order;
  items: OrderItem[];
  showCustomer: boolean;
  showTotals: boolean;
  measureRef?: React.Ref<HTMLDivElement>;
};

function A4Sheet({
  order,
  items,
  showCustomer,
  showTotals,
  measureRef,
}: A4SheetProps) {
  const paymentLabel =
    order.payment_method === "mobilepay"
      ? "MobilePay"
      : order.payment_method === "card"
        ? "Betalingskort"
        : "Anden betalingsmetode";

  return (
    <article className={styles.documentPage}>
      <A4Header order={order} />

      <div className={styles.pageContent} ref={measureRef}>
        {showCustomer && (
          <section className={styles.customerSection} data-a4-customer>
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
        )}

        <A4Items items={items} />

        {showTotals && <A4Totals order={order} />}
      </div>

      <div className={styles.pageFooter}>
        <A4Footer />
      </div>
    </article>
  );
}

export default function OrderA4Page() {
  const params = useParams();
  const router = useRouter();
  const measurementRef = useRef<HTMLDivElement>(null);
  const orderId = String(params.orderId);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sheets, setSheets] = useState<OrderItem[][]>([]);

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

  useEffect(() => {
    if (loading || !order || !measurementRef.current) return;

    const container = measurementRef.current;

    const getElement = (selector: string) =>
      container.querySelector<HTMLElement>(selector);

    const getHeight = (selector: string) =>
      getElement(selector)?.getBoundingClientRect().height ?? 0;

    const getVerticalMargins = (selector: string) => {
      const element = getElement(selector);
      if (!element) return 0;

      const style = window.getComputedStyle(element);

      return (
        parseFloat(style.marginTop || "0") +
        parseFloat(style.marginBottom || "0")
      );
    };

    const rows = Array.from(
      container.querySelectorAll<HTMLElement>("[data-a4-item-row]"),
    );

    if (rows.length !== order.order_items.length) return;

    const rowHeights = rows.map((row) =>
      Math.ceil(row.getBoundingClientRect().height),
    );

    const sumRows = rowHeights.reduce((sum, height) => sum + height, 0);

    const sheetHeight = getHeight(`.${styles.documentPage}`);
    const headerHeight = getHeight(`.${styles.documentHeader}`);
    const footerHeight = getHeight(`.${styles.pageFooter}`);

    const customerHeight =
      getHeight("[data-a4-customer]") +
      getVerticalMargins("[data-a4-customer]");

    const totalsHeight =
      getHeight("[data-a4-totals]") + getVerticalMargins("[data-a4-totals]");

    const itemsOverhead =
      getHeight("[data-a4-items]") -
      sumRows +
      getVerticalMargins("[data-a4-items]");

    // Small safety allowance for browser rounding and print rendering.
    const safetySpace = 24;

    const usableHeight =
      sheetHeight - headerHeight - footerHeight - safetySpace;

    const nextSheets: OrderItem[][] = [];
    let index = 0;

    while (index < order.order_items.length) {
      const isFirstPage = nextSheets.length === 0;

      const availableHeight =
        usableHeight - itemsOverhead - (isFirstPage ? customerHeight : 0);

      const remainingHeight = rowHeights
        .slice(index)
        .reduce((sum, height) => sum + height, 0);

      // If all remaining items and totals fit, this is the last page.
      if (remainingHeight + totalsHeight <= availableHeight) {
        nextSheets.push(order.order_items.slice(index));
        index = order.order_items.length;
        break;
      }

      let usedHeight = 0;
      const start = index;

      // Reserve at least one item for a subsequent page.
      while (index < order.order_items.length) {
        const rowHeight = rowHeights[index];

        if (usedHeight + rowHeight > availableHeight) break;

        usedHeight += rowHeight;
        index++;
      }

      // Prevent an endless loop if one item is unusually tall.
      if (index === start) index++;

      nextSheets.push(order.order_items.slice(start, index));
    }

    if (nextSheets.length === 0) {
      nextSheets.push([]);
    }

    setSheets(nextSheets);
  }, [order, loading]);

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

      <div
        ref={measurementRef}
        className={styles.measurementArea}
        aria-hidden="true"
      >
        <A4Sheet
          order={order}
          items={order.order_items}
          showCustomer={true}
          showTotals={true}
        />
      </div>

      {sheets.length > 0 &&
        sheets.map((items, index) => (
          <A4Sheet
            key={index}
            order={order}
            items={items}
            showCustomer={index === 0}
            showTotals={index === sheets.length - 1}
          />
        ))}
    </main>
  );
}
