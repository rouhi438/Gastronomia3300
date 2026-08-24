"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { useCart } from "@/context/CartContext";

import styles from "../payment-result.module.css";

type PaymentStatusResponse = {
  status?: "pending" | "completed" | "failed" | "cancelled";
  public_token?: string;
  error?: string;
};

type PaymentMessageKey = "checking" | "stillProcessing" | "checkFailed";

export default function PaymentReturnPage() {
  const { clearCart } = useCart();
  const t = useTranslations("PaymentReturn");

  const [messageKey, setMessageKey] = useState<PaymentMessageKey>("checking");

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get(
      "session",
    );

    if (!sessionId) {
      window.location.replace("/payment/cancelled");
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const checkStatus = async () => {
      if (cancelled) {
        return;
      }

      attempts += 1;

      try {
        const response = await fetch(
          `/api/payments/status?session=${encodeURIComponent(sessionId)}`,
          {
            cache: "no-store",
          },
        );

        const result = (await response.json()) as PaymentStatusResponse;

        if (!response.ok) {
          throw new Error(result.error || t("statusCheckError"));
        }

        if (
          result.status === "completed" &&
          typeof result.public_token === "string" &&
          result.public_token.trim() !== ""
        ) {
          clearCart();

          localStorage.removeItem("checkout-customer");
          localStorage.removeItem("checkout-customer-details");
          localStorage.removeItem("checkout-order-note");

          window.location.replace(
            `/order/${encodeURIComponent(result.public_token.trim())}`,
          );

          return;
        }

        if (result.status === "failed" || result.status === "cancelled") {
          window.location.replace("/payment/cancelled");
          return;
        }

        if (attempts >= 30) {
          setMessageKey("stillProcessing");
          return;
        }

        window.setTimeout(checkStatus, 2000);
      } catch (error: unknown) {
        console.error("Payment status check failed:", error);

        if (attempts >= 30) {
          setMessageKey("checkFailed");
          return;
        }

        window.setTimeout(checkStatus, 2000);
      }
    };

    void checkStatus();

    return () => {
      cancelled = true;
    };
  }, [clearCart, t]);

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.icon}>✓</div>

        <h1>{t("title")}</h1>

        <p>{t(messageKey)}</p>

        <p className={styles.muted}>{t("automaticRedirect")}</p>

        <Link href="/" className={styles.button}>
          {t("backToMenu")}
        </Link>
      </section>
    </main>
  );
}
