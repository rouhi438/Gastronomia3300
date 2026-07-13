"use client";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.landing}>
      <Image
        src="/images/logo.png"
        alt="Gastronomia 3300 logo"
        width={450}
        height={225}
        priority
        className={styles.logo}
      />

      <h1 className={styles.title}>
        Velkommen til Gastronomia Pizza Frederiksværk
      </h1>

      <p className={styles.description}>
        Hos os laver vi autentisk italiensk pizza i en ægte stenovn. <br />
        Friskbagt, sprød og fyldt med kærlighed – hver eneste dag.
      </p>

      <p className={styles.subDescription}>
        Prøv vores menu og oplev smagen af Italien – lige her i Frederiksværk.
      </p>

      <Link href="/menu" className="btn-primary">
        Kom i gang
      </Link>
    </main>
  );
}
