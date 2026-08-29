"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ReceiptText } from "lucide-react";

import AdminOrderFeedback from "@/components/AdminOrderFeedback";

import styles from "./feedback.module.css";

export default function AdminFeedbackPage() {
  const params = useParams();

  const rawOrderId = params.orderId;
  const normalizedOrderId = Array.isArray(rawOrderId)
    ? rawOrderId[0]
    : rawOrderId;

  const orderId = Number(normalizedOrderId);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return (
      <main className={styles.page}>
        <p className={styles.error}>Ugyldigt ordrenummer.</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.actions} aria-label="Feedbacknavigation">
          <Link href="/admin/orders" className={styles.backLink}>
            <ArrowLeft size={17} aria-hidden="true" />
            Tilbage til oversigt
          </Link>

          <Link
            href={`/admin/order-accepted/${orderId}?view=1`}
            className={styles.viewOrderLink}
          >
            <ReceiptText size={17} aria-hidden="true" />
            Se ordre
          </Link>
        </nav>

        <AdminOrderFeedback orderId={orderId} />
      </div>
    </main>
  );
}
