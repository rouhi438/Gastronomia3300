import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <p className={styles.brand}>GASTRONOMIA PIZZA</p>
        <p className={styles.info}>HILLERØDVEJ 38A, 3300 FREDERIKSVÆRK</p>
        <p className={styles.info}>📞 Tlf. 4040 4183</p>
        <p className={styles.info}>🕒 Åbningstider: Alle dage 15.00 – 21.00</p>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} Gastronomia 3300 • Brændefyret stenovns
          pizza
        </p>
      </div>
    </footer>
  );
}
