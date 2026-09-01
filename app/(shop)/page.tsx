import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bike, Flame, Leaf, Pizza } from "lucide-react";
import { getTranslations } from "next-intl/server";

import HomePopularCarousel from "@/components/HomePopularCarousel";
import PublicRating from "@/components/PublicRating";
import { mostOrderedItems } from "@/data/mostOrdered";

import styles from "./page.module.css";

export default async function Home() {
  const t = await getTranslations("Home");

  return (
    <main className={styles.landing}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <Image
            src="/homepageImages/homepage-italian-landscape.webp"
            alt=""
            width={1535}
            height={1024}
            aria-hidden="true"
            className={styles.landscape}
          />

          <p className={styles.location}>
            <span className={styles.italianFlag} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>

            <span>{t("hero.location")}</span>
          </p>

          <h1 className={styles.title}>
            <span>{t("hero.titleLead")}</span>
            <span className={styles.titleAccent}>{t("hero.titleAccent")}</span>
          </h1>

          <p className={styles.heroDescription}>{t("hero.description")}</p>

          <div className={styles.heroActions}>
            <Link href="/menu" className={styles.primaryAction}>
              <span>{t("hero.viewMenu")}</span>
              <ArrowRight size={19} aria-hidden="true" />
            </Link>

            <Link href="/menu" className={styles.secondaryAction}>
              <span>{t("hero.orderNow")}</span>
              <Pizza size={20} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <Image
            src="/homepageImages/homepage-hero-stone-oven.webp"
            alt={t("hero.imageAlt")}
            fill
            priority
            sizes="(max-width: 800px) 100vw, 50vw"
            className={styles.heroImage}
          />
        </div>
      </section>

      <section className={styles.trustBar}>
        <article className={styles.trustItem}>
          <span className={styles.trustIcon}>
            <Leaf size={23} aria-hidden="true" />
          </span>

          <span>
            <strong>{t("trust.ingredientsTitle")}</strong>
            <small>{t("trust.ingredientsText")}</small>
          </span>
        </article>

        <article className={styles.trustItem}>
          <span className={styles.trustIcon}>
            <Flame size={23} aria-hidden="true" />
          </span>

          <span>
            <strong>{t("trust.ovenTitle")}</strong>
            <small>{t("trust.ovenText")}</small>
          </span>
        </article>

        <article className={styles.trustItem}>
          <span className={styles.trustIcon}>
            <Bike size={23} aria-hidden="true" />
          </span>

          <span>
            <strong>{t("trust.orderingTitle")}</strong>
            <small>{t("trust.orderingText")}</small>
          </span>
        </article>
      </section>

      <section className={styles.showcase}>
        <div className={styles.ratingColumn}>
          <PublicRating />
        </div>

        <div className={styles.popularColumn}>
          <HomePopularCarousel items={mostOrderedItems} />
        </div>
      </section>
    </main>
  );
}
