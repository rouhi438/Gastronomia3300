"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import RatingStar from "@/components/RatingStar";

import styles from "./HomePopularCarousel.module.css";

const VISIBLE_ITEM_COUNT = 3;
const ROTATION_INTERVAL_MS = 5000;

export type HomePopularItem = {
  id: number;
  menuNumber?: number;
  name: string;
  description: string;
  prices: {
    normal?: number;
    fixed?: number;
  };
  image?: string;
};

type HomePopularCarouselProps = {
  items: HomePopularItem[];
};

type AvailabilityResponse = {
  statuses?: Array<{
    menu_item_id: number;
  }>;
};

function shuffleItems<T>(items: T[]): T[] {
  const shuffledItems = [...items];

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));

    [shuffledItems[index], shuffledItems[randomIndex]] = [
      shuffledItems[randomIndex],
      shuffledItems[index],
    ];
  }

  return shuffledItems;
}

function selectNextItems(
  availableItems: HomePopularItem[],
  currentItems: HomePopularItem[],
): HomePopularItem[] {
  if (availableItems.length <= VISIBLE_ITEM_COUNT) {
    return availableItems.slice(0, VISIBLE_ITEM_COUNT);
  }

  const currentItemIds = new Set(currentItems.map((item) => item.id));

  const unseenItems = shuffleItems(
    availableItems.filter((item) => !currentItemIds.has(item.id)),
  );

  const nextItems = unseenItems.slice(0, VISIBLE_ITEM_COUNT);

  if (nextItems.length < VISIBLE_ITEM_COUNT) {
    const selectedItemIds = new Set(nextItems.map((item) => item.id));

    const remainingItems = shuffleItems(
      availableItems.filter((item) => !selectedItemIds.has(item.id)),
    ).slice(0, VISIBLE_ITEM_COUNT - nextItems.length);

    nextItems.push(...remainingItems);
  }

  return nextItems;
}

export default function HomePopularCarousel({
  items,
}: HomePopularCarouselProps) {
  const t = useTranslations("Home");
  const menuT = useTranslations("Menu");

  const [unavailableItemIds, setUnavailableItemIds] = useState<Set<number>>(
    new Set(),
  );

  const [visibleItems, setVisibleItems] = useState<HomePopularItem[]>(() =>
    items.slice(0, VISIBLE_ITEM_COUNT),
  );

  const [cycle, setCycle] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/menu/availability", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response
          .json()
          .catch(() => null)) as AvailabilityResponse | null;

        if (!response.ok) {
          throw new Error("Popular menu availability request failed.");
        }

        return payload;
      })
      .then((payload) => {
        if (controller.signal.aborted) {
          return;
        }

        const unavailableIds = Array.isArray(payload?.statuses)
          ? payload.statuses.map((status) => status.menu_item_id)
          : [];

        setUnavailableItemIds(new Set(unavailableIds));
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.error("Popular menu availability request failed:", error);
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  const availableItems = useMemo(
    () => items.filter((item) => !unavailableItemIds.has(item.id)),
    [items, unavailableItemIds],
  );

  const displayedItems = useMemo(() => {
    const availableItemIds = new Set(availableItems.map((item) => item.id));

    const retainedItems = visibleItems.filter((item) =>
      availableItemIds.has(item.id),
    );

    const retainedItemIds = new Set(retainedItems.map((item) => item.id));

    const replacementItems = availableItems.filter(
      (item) => !retainedItemIds.has(item.id),
    );

    return [...retainedItems, ...replacementItems].slice(0, VISIBLE_ITEM_COUNT);
  }, [availableItems, visibleItems]);

  const rotateItems = useCallback(() => {
    setVisibleItems(selectNextItems(availableItems, displayedItems));

    setCycle((currentCycle) => currentCycle + 1);
  }, [availableItems, displayedItems]);

  useEffect(() => {
    if (
      isPaused ||
      availableItems.length <= VISIBLE_ITEM_COUNT ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const intervalId = window.setInterval(rotateItems, ROTATION_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [availableItems.length, isPaused, rotateItems]);

  if (displayedItems.length === 0) {
    return null;
  }

  return (
    <section
      className={styles.section}
      aria-labelledby="home-popular-title"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        const nextFocusedElement = event.relatedTarget as Node | null;

        if (!event.currentTarget.contains(nextFocusedElement)) {
          setIsPaused(false);
        }
      }}
    >
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{t("popular.eyebrow")}</p>

          <h2 id="home-popular-title" className={styles.title}>
            {t("popular.title")}
          </h2>

          <p className={styles.description}>{t("popular.description")}</p>
        </div>

        <div className={styles.actions}>
          {availableItems.length > VISIBLE_ITEM_COUNT && (
            <button
              type="button"
              className={styles.nextButton}
              aria-label={t("popular.next")}
              onClick={rotateItems}
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          )}

          <Link href="/menu" className={styles.menuLink}>
            {t("popular.seeMenu")}
            <ChevronRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div key={cycle} className={styles.grid} aria-live="off">
        {displayedItems.map((item) => {
          const nameKey = `items.${item.id}.name`;
          const descriptionKey = `items.${item.id}.description`;

          const displayName = menuT.has(nameKey) ? menuT(nameKey) : item.name;

          const displayDescription = menuT.has(descriptionKey)
            ? menuT(descriptionKey)
            : item.description;

          const price = item.prices.normal ?? item.prices.fixed;

          return (
            <Link
              key={item.id}
              href="/menu#most-ordered-items"
              className={styles.card}
            >
              <span className={styles.imageWrapper}>
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={displayName}
                    fill
                    sizes="(max-width: 680px) 88vw, (max-width: 1100px) 44vw, 28vw"
                    className={styles.image}
                  />
                ) : (
                  <span
                    className={styles.imagePlaceholder}
                    aria-hidden="true"
                  />
                )}

                <span className={styles.badge}>
                  <RatingStar size={13} />
                  {t("popular.badge")}
                </span>
              </span>

              <span className={styles.cardContent}>
                <strong className={styles.itemName}>
                  {item.menuNumber
                    ? `${item.menuNumber}. ${displayName}`
                    : displayName}
                </strong>

                <span className={styles.itemDescription}>
                  {displayDescription}
                </span>

                <span className={styles.cardFooter}>
                  <strong className={styles.price}>
                    {typeof price === "number" && price > 0
                      ? t("popular.fromPrice", { price })
                      : t("popular.chooseOptions")}
                  </strong>

                  <span className={styles.cardArrow} aria-hidden="true">
                    <Plus size={18} strokeWidth={2.5} />
                  </span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
