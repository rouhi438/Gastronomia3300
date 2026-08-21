"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Baby,
  ChefHat,
  Cherry,
  CupSoda,
  Hamburger,
  Plus,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  UtensilsCrossed,
} from "lucide-react";

import { menuData, type MenuItem } from "@/data/menu";

import ItemModal from "@/components/ItemModal";

import { useLocale, useTranslations } from "next-intl";

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
    icon: <Pizza size={18} />,
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
    icon: <Sandwich size={18} />,
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
    icon: <Sandwich size={18} />,
  },
  {
    id: "drikke",
    labelKey: "categories.drinks",
    icon: <CupSoda size={18} />,
  },
  {
    id: "dyppelse",
    labelKey: "categories.extraDips",
    icon: <Cherry size={18} />,
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

  return (
    <>
      <div className={styles.menuPage}>
        {/* ===== SIDEBAR ===== */}

        <aside className={styles.sidebar}>
          <nav className={styles.categoryNav}>
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
          <div className={styles.cardsGrid}>
            {filteredItems.map((item) => {
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
                <div
                  key={item.id}
                  className={styles.card}
                  aria-disabled={unavailable}
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
                  <div className={styles.cardContent}>
                    <h3 className={styles.itemName}>
                      {item.menuNumber ? `${item.menuNumber}. ` : ""}

                      {displayName}
                    </h3>

                    <p className={styles.itemDesc}>{displayDescription}</p>

                    {unavailable && (
                      <div
                        style={{
                          display: "grid",
                          gap: "0.15rem",
                          marginTop: "0.25rem",
                        }}
                      >
                        <strong
                          style={{
                            color: "var(--red)",
                            fontSize: "0.8rem",
                          }}
                        >
                          {t("soldOut")}
                        </strong>

                        {temporary && availability?.available_again_at && (
                          <span
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.68rem",
                            }}
                          >
                            {t("availableAgain")}{" "}
                            {formatAvailableAgain(
                              availability.available_again_at,
                              locale,
                            )}
                          </span>
                        )}
                      </div>
                    )}

                    {!hidePrice && !unavailable && (
                      <p className={styles.itemPrice}>{price} kr,-</p>
                    )}
                  </div>

                  <div className={styles.imageWrapper}>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={displayName}
                        className={styles.image}
                      />
                    ) : (
                      <div className={styles.placeholder}>
                        <Pizza size={40} className={styles.placeholderIcon} />
                      </div>
                    )}

                    {!unavailable && (
                      <div className={styles.plusIcon}>
                        <Plus size={20} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
