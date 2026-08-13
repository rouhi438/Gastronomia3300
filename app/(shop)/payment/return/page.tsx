import Link from "next/link";

import styles from "../payment-result.module.css";

export default function PaymentReturnPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.icon}>✓</div>

        <h1>Betalingen behandles</h1>

        <p>
          Tak. Vi kontrollerer betalingen. Din ordre bliver først oprettet, når
          betalingen er bekræftet.
        </p>

        <p className={styles.muted}>
          Hvis betalingen er gennemført, bliver ordren automatisk sendt videre
          til restauranten.
        </p>

        <Link href="/" className={styles.button}>
          Tilbage til menuen
        </Link>
      </section>
    </main>
  );
}
