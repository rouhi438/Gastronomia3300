"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

import styles from "./accounting-report.module.css";

type PaymentMethod = "card" | "mobilepay" | "other";
type RefundStatus = "pending" | "completed" | "failed";

type FinancialBucket = {
  orderCount: number;
  grossAmountMinor: number;
  completedRefundAmountMinor: number;
  netAmountMinor: number;
};

type AccountingReport = {
  generatedAt: string;

  range: {
    from: string;
    to: string;
    timeZone: string;
  };

  summary: {
    orderCount: number;
    grossAmountMinor: number;
    completedRefundAmountMinor: number;
    netAmountMinor: number;
  };

  paymentMethods: Record<PaymentMethod, FinancialBucket>;

  refunds: Record<
    RefundStatus,
    {
      count: number;
      amountMinor: number;
    }
  >;

  statusBreakdown: Array<{
    status: string;
    orderCount: number;
    grossAmountMinor: number;
  }>;

  exceptionOrders: Array<{
    id: number;
    createdAt: string;
    status: string;
    paymentMethod: PaymentMethod;
    totalAmountMinor: number;
    refundStatus: RefundStatus | null;
    refundAmountMinor: number | null;
  }>;
};

const statusLabels: Record<string, string> = {
  pending: "Afventer",
  accepted: "Accepteret",
  ready: "Klar",
  completed: "Afsluttet",
  cancelled: "Annulleret",
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  card: "Betalingskort",
  mobilepay: "MobilePay",
  other: "Anden betalingsmetode",
};

const refundStatusLabels: Record<RefundStatus, string> = {
  pending: "Afventer",
  completed: "Gennemført",
  failed: "Mislykkedes",
};

const moneyFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("da-DK", {
  timeZone: "Europe/Copenhagen",
  dateStyle: "short",
  timeStyle: "short",
});

function formatMoney(amountMinor: number) {
  return moneyFormatter.format(amountMinor / 100);
}

function formatDateKey(value: string) {
  const [year, month, day] = value.split("-");

  return `${day}.${month}.${year}`;
}

function AccountingReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const hasValidRange =
    /^\d{4}-\d{2}-\d{2}$/.test(from) &&
    /^\d{4}-\d{2}-\d{2}$/.test(to) &&
    from <= to;

  const [report, setReport] = useState<AccountingReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasValidRange) {
      return;
    }

    const controller = new AbortController();

    const fetchReport = async () => {
      try {
        const params = new URLSearchParams({ from, to });

        const response = await fetch(
          `/api/admin/accounting-report?${params.toString()}`,
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

        const payload = (await response.json().catch(() => null)) as
          | AccountingReport
          | { error?: string }
          | null;

        if (!response.ok || !payload || !("summary" in payload)) {
          throw new Error(
            payload && "error" in payload && payload.error
              ? payload.error
              : "Rapporten kunne ikke hentes.",
          );
        }

        if (!controller.signal.aborted) {
          setReport(payload);
          setError("");
        }
      } catch (fetchError: unknown) {
        if (!controller.signal.aborted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Rapporten kunne ikke hentes.",
          );
        }
      }
    };

    void fetchReport();

    return () => {
      controller.abort();
    };
  }, [from, hasValidRange, router, to]);

  if (!hasValidRange) {
    return (
      <main className={styles.page}>
        <div className={styles.stateCard}>
          <h1>Ugyldig periode</h1>
          <p>Vælg en gyldig startdato og slutdato fra ordresiden.</p>

          <Link href="/admin/orders" className={styles.backLink}>
            <ArrowLeft size={18} aria-hidden="true" />
            Tilbage til ordrer
          </Link>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.page}>
        <div className={styles.stateCard}>
          <h1>Rapporten kunne ikke oprettes</h1>
          <p>{error}</p>

          <Link href="/admin/orders" className={styles.backLink}>
            <ArrowLeft size={18} aria-hidden="true" />
            Tilbage til ordrer
          </Link>
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className={styles.page}>
        <div className={styles.stateCard}>Opretter rapport...</div>
      </main>
    );
  }

  const paymentRows = (["card", "mobilepay", "other"] as const).filter(
    (method) => report.paymentMethods[method].orderCount > 0,
  );

  return (
    <main className={styles.page}>
      <div className={`${styles.toolbar} ${styles.noPrint}`}>
        <Link href="/admin/orders" className={styles.backLink}>
          <ArrowLeft size={18} aria-hidden="true" />
          Tilbage til ordrer
        </Link>

        <button
          type="button"
          className={styles.printButton}
          onClick={() => window.print()}
        >
          <Printer size={18} aria-hidden="true" />
          Udskriv / Gem som PDF
        </button>
      </div>

      <article className={styles.report}>
        <header className={styles.reportHeader}>
          <div>
            <p className={styles.eyebrow}>Gastronomia 3300 · Regnskab</p>

            <h1 className={styles.reportTitle}>Omsætningsrapport</h1>

            <p className={styles.reportPeriod}>
              {formatDateKey(report.range.from)} –{" "}
              {formatDateKey(report.range.to)}
            </p>
          </div>

          <div className={styles.generated}>
            <span>Oprettet</span>
            <strong>
              {dateTimeFormatter.format(new Date(report.generatedAt))}
            </strong>
          </div>
        </header>

        <section className={styles.summaryGrid} aria-label="Rapportoversigt">
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Antal ordrer</span>
            <strong className={styles.summaryValue}>
              {report.summary.orderCount}
            </strong>
          </article>

          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Bruttoomsætning</span>
            <strong className={styles.summaryValue}>
              {formatMoney(report.summary.grossAmountMinor)}
            </strong>
          </article>

          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Gennemført refund</span>
            <strong className={`${styles.summaryValue} ${styles.negative}`}>
              − {formatMoney(report.summary.completedRefundAmountMinor)}
            </strong>
          </article>

          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Nettoomsætning</span>
            <strong className={`${styles.summaryValue} ${styles.positive}`}>
              {formatMoney(report.summary.netAmountMinor)}
            </strong>
          </article>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Betalingsmetoder</h2>

          <div className={styles.tableScroll}>
            <table className={`${styles.table} ${styles.wideTable}`}>
              <thead>
                <tr>
                  <th>Betalingsmetode</th>
                  <th>Ordrer</th>
                  <th>Brutto</th>
                  <th>Refund</th>
                  <th>Netto</th>
                </tr>
              </thead>

              <tbody>
                {paymentRows.map((method) => {
                  const values = report.paymentMethods[method];

                  return (
                    <tr key={method}>
                      <td>{paymentMethodLabels[method]}</td>
                      <td>{values.orderCount}</td>
                      <td>{formatMoney(values.grossAmountMinor)}</td>
                      <td>{formatMoney(values.completedRefundAmountMinor)}</td>
                      <td>{formatMoney(values.netAmountMinor)}</td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr>
                  <th>I alt</th>
                  <th>{report.summary.orderCount}</th>
                  <th>{formatMoney(report.summary.grossAmountMinor)}</th>
                  <th>
                    {formatMoney(report.summary.completedRefundAmountMinor)}
                  </th>
                  <th>{formatMoney(report.summary.netAmountMinor)}</th>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Refundoversigt</h2>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Antal</th>
                  <th>Beløb</th>
                </tr>
              </thead>

              <tbody>
                {(["completed", "pending", "failed"] as const).map((status) => (
                  <tr key={status}>
                    <td>{refundStatusLabels[status]}</td>
                    <td>{report.refunds[status].count}</td>
                    <td>{formatMoney(report.refunds[status].amountMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Ordrestatus</h2>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Antal</th>
                  <th>Bruttobeløb</th>
                </tr>
              </thead>

              <tbody>
                {report.statusBreakdown.map((row) => (
                  <tr key={row.status}>
                    <td>{statusLabels[row.status] ?? row.status}</td>
                    <td>{row.orderCount}</td>
                    <td>{formatMoney(row.grossAmountMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {report.exceptionOrders.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Ordrer der kræver opmærksomhed
            </h2>

            <div className={styles.tableScroll}>
              <table className={`${styles.table} ${styles.wideTable}`}>
                <thead>
                  <tr>
                    <th>Ordre</th>
                    <th>Dato</th>
                    <th>Status</th>
                    <th>Betaling</th>
                    <th>Beløb</th>
                    <th>Refund</th>
                  </tr>
                </thead>

                <tbody>
                  {report.exceptionOrders.map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>
                        {dateTimeFormatter.format(new Date(order.createdAt))}
                      </td>
                      <td>{statusLabels[order.status] ?? order.status}</td>
                      <td>{paymentMethodLabels[order.paymentMethod]}</td>
                      <td>{formatMoney(order.totalAmountMinor)}</td>
                      <td>
                        {order.refundStatus
                          ? `${refundStatusLabels[order.refundStatus]} · ${formatMoney(
                              order.refundAmountMinor ?? 0,
                            )}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </article>
    </main>
  );
}

export default function AccountingReportPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <div className={styles.stateCard}>Opretter rapport...</div>
        </main>
      }
    >
      <AccountingReportContent />
    </Suspense>
  );
}
