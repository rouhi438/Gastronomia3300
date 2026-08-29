"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BadgeCheck } from "lucide-react";
import RatingStar from "@/components/RatingStar";

import styles from "./PublicRating.module.css";

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

type PublicRatingEntry = {
  firstName: string;
  rating: number;
};

type PublicRatingResponse = {
  available?: boolean;
  averageRating?: number;
  totalRatings?: number;
  minimumRatings?: number;
  entries?: PublicRatingEntry[];
  error?: string;
};

type PublicRatingProps = {
  variant?: "full" | "compact";
};

function getStarFill(averageRating: number, starValue: number): number {
  return Math.max(0, Math.min(100, (averageRating - (starValue - 1)) * 100));
}

export default function PublicRating({ variant = "full" }: PublicRatingProps) {
  const locale = useLocale();
  const t = useTranslations("PublicRating");

  const [ratingData, setRatingData] = useState<PublicRatingResponse | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();

    const fetchRating = async () => {
      try {
        const response = await fetch("/api/ratings", {
          method: "GET",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        const payload = (await response
          .json()
          .catch(() => null)) as PublicRatingResponse | null;

        if (!response.ok || !payload) {
          throw new Error(payload?.error || "Public rating request failed.");
        }

        if (!controller.signal.aborted) {
          setRatingData(payload);
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          console.error("Public rating request failed:", error);
        }
      }
    };

    void fetchRating();

    return () => {
      controller.abort();
    };
  }, []);

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === "en" ? "en-GB" : "da-DK", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    [locale],
  );

  if (
    !ratingData?.available ||
    typeof ratingData.averageRating !== "number" ||
    typeof ratingData.totalRatings !== "number"
  ) {
    return null;
  }

  const averageRating = ratingData.averageRating;
  const totalRatings = ratingData.totalRatings;
  const entries = ratingData.entries ?? [];
  const starSize = variant === "compact" ? 16 : 24;

  const stars = (
    <span
      className={styles.stars}
      aria-label={t("ratingAria", {
        average: numberFormatter.format(averageRating),
      })}
    >
      {STAR_VALUES.map((starValue) => (
        <span key={starValue} className={styles.starBox}>
          <RatingStar size={starSize} className={styles.starIcon} />

          <span
            className={styles.starFill}
            style={{
              width: `${getStarFill(averageRating, starValue)}%`,
            }}
          >
            <RatingStar size={starSize} className={styles.starIcon} />
          </span>
        </span>
      ))}
    </span>
  );

  if (variant === "compact") {
    return (
      <aside className={styles.compact} aria-label={t("compactAria")}>
        {stars}

        <span className={styles.compactText}>
          <strong>{numberFormatter.format(averageRating)}</strong>
          {" · "}
          {t("ratingCount", {
            count: totalRatings,
          })}
        </span>
      </aside>
    );
  }

  return (
    <section className={styles.full} aria-labelledby="public-rating-title">
      <div className={styles.fullHeader}>
        <div>
          <p className={styles.eyebrow}>{t("eyebrow")}</p>

          <h2 id="public-rating-title" className={styles.title}>
            {t("title")}
          </h2>

          <p className={styles.description}>{t("description")}</p>
        </div>

        <span className={styles.verifiedBadge}>
          <BadgeCheck size={16} aria-hidden="true" />
          {t("verifiedOrders")}
        </span>
      </div>

      <div className={styles.summary}>
        <strong className={styles.average}>
          {numberFormatter.format(averageRating)}
        </strong>

        {stars}

        <span className={styles.count}>
          {t("ratingCount", {
            count: totalRatings,
          })}
        </span>
      </div>

      {entries.length > 0 && (
        <div className={styles.entries}>
          {entries.map((entry, index) => (
            <div
              key={`${entry.firstName}-${entry.rating}-${index}`}
              className={styles.entry}
            >
              <span className={styles.entryName}>{entry.firstName}</span>
              <span className={styles.entryRating}>
                <RatingStar size={13} />
                {entry.rating}/5
              </span>{" "}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
