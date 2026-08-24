import Link from "next/link";
import { getTranslations } from "next-intl/server";
import styles from "../payment-result.module.css";

export default async function PaymentCancelledPage() {
  const t = await getTranslations("PaymentCancelled");

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.icon}>×</div>

        <h1>{t("title")}</h1>

        <p>{t("message")}</p>

        <p className={styles.muted}>{t("hint")}</p>

        <Link href="/" className={styles.button}>
          {t("backToMenu")}
        </Link>
      </section>
    </main>
  );
}
