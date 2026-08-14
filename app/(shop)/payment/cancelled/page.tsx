import Link from "next/link";

import styles from "../payment-result.module.css";

export default function PaymentCancelledPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.icon}>×</div>

        <h1>Betalingen blev afbrudt</h1>

        <p>
          Betalingen blev ikke gennemført, og der er ikke oprettet nogen ordre.
        </p>

        <p className={styles.muted}>
          Du kan gå tilbage til menuen og prøve igen.
        </p>

        <Link href="/" className={styles.button}>
          Tilbage til menuen
        </Link>
      </section>
    </main>
  );
}
