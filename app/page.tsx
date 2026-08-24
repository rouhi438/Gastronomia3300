import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import styles from "./page.module.css";

export default async function Home() {
  const t = await getTranslations("Home");

  return (
    <main className={styles.landing}>
      <Image
        src="/images/logo.png"
        alt={t("logoAlt")}
        width={450}
        height={225}
        priority
        className={styles.logo}
      />

      <h1 className={styles.title}>{t("title")}</h1>

      <p className={styles.description}>
        {t("descriptionFirst")}
        <br />
        {t("descriptionSecond")}
      </p>

      <p className={styles.subDescription}>{t("subDescription")}</p>

      <Link href="/menu" className="btn-primary">
        {t("cta")}
      </Link>
    </main>
  );
}
