"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ReceiptText } from "lucide-react";

import OrderFeedback from "@/components/OrderFeedback";

import styles from "./feedback.module.css";

export default function CustomerFeedbackPage() {
  const params = useParams();
  const t = useTranslations("OrderFeedback");

  const rawToken = params.token;
  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  if (!token) {
    return null;
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.actions}>
          <Link
            href={`/order/${encodeURIComponent(token)}`}
            className={styles.viewOrderLink}
          >
            <ReceiptText size={17} aria-hidden="true" />
            {t("viewOrder")}
          </Link>
        </div>

        <OrderFeedback token={token} />
      </div>
    </main>
  );
}
