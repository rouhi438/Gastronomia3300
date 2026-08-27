"use client";

import { useEffect, useMemo, useState, useRef } from "react";

import {
  Baby,
  ChefHat,
  CupSoda,
  Hamburger,
  Plus,
  Pizza,
  Salad,
  Star,
  ChevronLeft,
  ChevronRight,
  Soup,
  UtensilsCrossed,
  BadgePercent,
} from "lucide-react";
import { GiFrenchFries, GiDumpling } from "react-icons/gi";
import { TbBowlSpoon } from "react-icons/tb";

import { menuData, type MenuItem } from "@/data/menu";

import ItemModal from "@/components/ItemModal";

import { useLocale, useTranslations } from "next-intl";

import Image from "next/image";

import styles from "./menu.module.css";

type AvailabilityStatus = "active" | "until_next_opening" | "manual_off";

type MenuStatusRecord = {
  menu_item_id: number;
  status: AvailabilityStatus;
  available_again_at: string | null;
  updated_at?: string;
};

type MenuOptionStatusRecord = {
  menu_item_id: number;
  option_key: string;
  status: AvailabilityStatus;
  available_again_at: string | null;
  updated_at?: string;
};

type AvailabilityResponse = {
  statuses?: MenuStatusRecord[];
  optionStatuses?: MenuOptionStatusRecord[];
};

const MOST_ORDERED_ITEM_IDS = [3, 8, 16, 20, 47, 60, 200, 201] as const;

const menuItemsById = new Map(menuData.map((item) => [item.id, item]));

const missingMostOrderedItemIds = MOST_ORDERED_ITEM_IDS.filter(
  (itemId) => !menuItemsById.has(itemId),
);

if (process.env.NODE_ENV !== "production" && missingMostOrderedItemIds.length) {
  console.warn(
    `Most Ordered contains unknown menu item IDs: ${missingMostOrderedItemIds.join(", ")}`,
  );
}

const mostOrderedItems = MOST_ORDERED_ITEM_IDS.map((itemId) =>
  menuItemsById.get(itemId),
).filter((item): item is MenuItem => Boolean(item));

const categories = [
  {
    id: "alle",
    labelKey: "categories.all",
    icon: <ChefHat size={18} />,
  },
  {
    id: "pizza",
    labelKey: "categories.pizza",
    icon: <Pizza size={18} />,
  },
  {
    id: "indbagt",
    labelKey: "categories.calzone",
    icon: <GiDumpling size={18} />,
  },
  {
    id: "ala-carte",
    labelKey: "categories.alaCarte",
    icon: <UtensilsCrossed size={18} />,
  },
  {
    id: "hovedretter",
    labelKey: "categories.mainCourses",
    icon: <ChefHat size={18} />,
  },
  {
    id: "pasta",
    labelKey: "categories.pasta",
    icon: <Soup size={18} />,
  },
  {
    id: "salad",
    labelKey: "categories.salads",
    icon: <Salad size={18} />,
  },
  {
    id: "fries",
    labelKey: "categories.fries",
    icon: <GiFrenchFries size={18} />,
  },
  {
    id: "børn",
    labelKey: "categories.kidsMenu",
    icon: <Baby size={18} />,
  },
  {
    id: "burger",
    labelKey: "categories.burgers",
    icon: <Hamburger size={18} />,
  },
  {
    id: "menuer",
    labelKey: "categories.mealDeals",
    icon: <BadgePercent size={18} />,
  },
  {
    id: "drikke",
    labelKey: "categories.drinks",
    icon: <CupSoda size={18} />,
  },
  {
    id: "dyppelse",
    labelKey: "categories.extraDips",
    icon: <TbBowlSpoon size={18} />,
  },
];

function formatAvailableAgain(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "da-DK", {
    timeZone: "Europe/Copenhagen",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MenuPage() {
  const locale = useLocale();

  const t = useTranslations("Menu");

  const [activeCategory, setActiveCategory] = useState("alle");

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [statuses, setStatuses] = useState<MenuStatusRecord[]>([]);

  const [optionStatuses, setOptionStatuses] = useState<
    MenuOptionStatusRecord[]
  >([]);

  const [availabilityReady, setAvailabilityReady] = useState(false);

  const [isMostOrderedExpanded, setIsMostOrderedExpanded] = useState(false);

  const mostOrderedScrollerRef = useRef<HTMLDivElement>(null);

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
          throw new Error("Kunne ikke hente produkttilgængelighed.");
        }

        return payload;
      })
      .then((payload) => {
        if (controller.signal.aborted) {
          return;
        }

        setStatuses(Array.isArray(payload?.statuses) ? payload.statuses : []);

        setOptionStatuses(
          Array.isArray(payload?.optionStatuses) ? payload.optionStatuses : [],
        );
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Menu availability fetch error:", error);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setAvailabilityReady(true);
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  const statusMap = useMemo(() => {
    return new Map(statuses.map((status) => [status.menu_item_id, status]));
  }, [statuses]);

  const filteredItems = useMemo(() => {
    const catalogItems = menuData.filter((item) => item.category !== "ekstra");

    if (activeCategory === "popular") {
      return mostOrderedItems;
    }

    if (activeCategory === "alle") {
      return catalogItems;
    }

    if (activeCategory === "pizza") {
      return catalogItems.filter(
        (item) => item.mainCategory === "pizza" || item.category === "pizza",
      );
    }

    if (activeCategory === "vegetar" || activeCategory === "indbagt") {
      return catalogItems.filter((item) => item.subCategory === activeCategory);
    }

    return catalogItems.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  function handleCardClick(item: MenuItem) {
    if (!availabilityReady) {
      return;
    }

    const availability = statusMap.get(item.id);

    if (availability) {
      return;
    }

    setSelectedItem(item);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setSelectedItem(null);
  }

  function scrollMostOrdered(direction: -1 | 1) {
    const scroller = mostOrderedScrollerRef.current;

    if (!scroller) {
      return;
    }

    scroller.scrollBy({
      left: direction * Math.max(scroller.clientWidth * 0.8, 280),
      behavior: "smooth",
    });
  }

  function renderMenuItemCard(
    item: MenuItem,
    variant: "default" | "featured" = "default",
  ) {
    const isPopular = MOST_ORDERED_ITEM_IDS.some(
      (itemId) => itemId === item.id,
    );

    const isFeaturedPopular = isPopular && variant === "featured";

    const nameKey = `items.${item.id}.name`;
    const descriptionKey = `items.${item.id}.description`;

    const displayName = t.has(nameKey) ? t(nameKey) : item.name;

    const displayDescription = t.has(descriptionKey)
      ? t(descriptionKey)
      : item.description;

    const price = item.prices.normal ?? item.prices.fixed ?? 0;
    const hidePrice = [60, 61, 62].includes(item.id);

    const availability = statusMap.get(item.id);
    const unavailable = Boolean(availability);
    const temporary = availability?.status === "until_next_opening";

    return (
      <button
        key={item.id}
        type="button"
        className={`${styles.card} ${
          isPopular ? styles.popularCard : ""
        } ${isFeaturedPopular ? styles.featuredPopularCard : ""}`}
        aria-disabled={unavailable || !availabilityReady}
        aria-busy={!availabilityReady}
        onClick={() => handleCardClick(item)}
        style={
          unavailable
            ? {
                opacity: 0.58,
                cursor: "not-allowed",
              }
            : !availabilityReady
              ? {
                  cursor: "progress",
                }
              : undefined
        }
      >
        <span className={styles.cardContent}>
          <span className={styles.itemName}>
            {item.menuNumber ? `${item.menuNumber}. ` : ""}
            {displayName}
          </span>

          <span className={styles.itemDesc}>{displayDescription}</span>

          {unavailable && (
            <span className={styles.availabilityMessage}>
              <strong className={styles.soldOut}>{t("soldOut")}</strong>

              {temporary && availability?.available_again_at && (
                <span className={styles.availableAgain}>
                  {t("availableAgain")}{" "}
                  {formatAvailableAgain(
                    availability.available_again_at,
                    locale,
                  )}
                </span>
              )}
            </span>
          )}

          {!hidePrice && !unavailable && (
            <span className={styles.itemPrice}>{price} kr,-</span>
          )}
        </span>

        <span className={styles.imageWrapper}>
          {isPopular && (
            <span className={styles.popularBadge}>
              {t("mostOrdered.popular")}
            </span>
          )}

          {item.image ? (
            <Image
              src={item.image}
              alt={displayName}
              width={480}
              height={360}
              sizes="(max-width: 680px) 40vw, (max-width: 1200px) 30vw, 240px"
              className={styles.image}
            />
          ) : (
            <span className={styles.placeholder} aria-hidden="true">
              <Pizza size={40} className={styles.placeholderIcon} />
            </span>
          )}

          {!unavailable && (
            <span className={styles.plusIcon} aria-hidden="true">
              <Plus size={20} strokeWidth={3} />
            </span>
          )}
        </span>
      </button>
    );
  }

  return (
    <>
      <div className={styles.menuPage}>
        {/* ===== SIDEBAR ===== */}

        <aside className={styles.sidebar}>
          <nav className={styles.categoryNav}>
            <button
              type="button"
              className={`${styles.categoryBtn} ${
                styles.popularCategoryBtn
              } ${activeCategory === "popular" ? styles.active : ""}`}
              onClick={() => setActiveCategory("popular")}
            >
              <Star size={18} fill="currentColor" aria-hidden="true" />
              <span>{t("mostOrdered.popularCategory")}</span>
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`${styles.categoryBtn} ${
                  activeCategory === cat.id ? styles.active : ""
                }`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.icon}

                <span>{t(cat.labelKey)}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* ===== CARDS GRID ===== */}

        <section className={styles.cardsSection}>
          {activeCategory === "alle" && (
            <section
              className={styles.mostOrderedSection}
              aria-labelledby="most-ordered-title"
            >
              <div className={styles.mostOrderedHeader}>
                <h1 id="most-ordered-title" className={styles.mostOrderedTitle}>
                  {t("mostOrdered.title")}
                </h1>

                <div className={styles.mostOrderedControls}>
                  {!isMostOrderedExpanded && (
                    <div className={styles.scrollControls}>
                      <button
                        type="button"
                        className={styles.scrollButton}
                        aria-label={t("mostOrdered.previous")}
                        onClick={() => scrollMostOrdered(-1)}
                      >
                        <ChevronLeft size={20} aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        className={styles.scrollButton}
                        aria-label={t("mostOrdered.next")}
                        onClick={() => scrollMostOrdered(1)}
                      >
                        <ChevronRight size={20} aria-hidden="true" />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    className={styles.expandButton}
                    aria-expanded={isMostOrderedExpanded}
                    aria-controls="most-ordered-items"
                    onClick={() =>
                      setIsMostOrderedExpanded((isExpanded) => !isExpanded)
                    }
                  >
                    {t(
                      isMostOrderedExpanded
                        ? "mostOrdered.showLess"
                        : "mostOrdered.seeAll",
                    )}
                  </button>
                </div>
              </div>

              <div
                id="most-ordered-items"
                ref={mostOrderedScrollerRef}
                className={
                  isMostOrderedExpanded
                    ? styles.cardsGrid
                    : styles.mostOrderedScroller
                }
              >
                {mostOrderedItems.map((item) =>
                  renderMenuItemCard(item, "featured"),
                )}
              </div>
            </section>
          )}
          <div className={styles.cardsGrid}>
            {filteredItems.map((item) => renderMenuItemCard(item))}
          </div>
        </section>
      </div>

      {/* ===== ITEM MODAL ===== */}

      <ItemModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={closeModal}
        optionStatuses={optionStatuses}
      />
    </>
  );
}
