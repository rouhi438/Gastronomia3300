// "use client";

// import { useState, useMemo } from "react";
// import { menuData, type MenuItem } from "@/data/menu";
// import {
//   Pizza,
//   UtensilsCrossed,
//   Salad,
//   CupSoda,
//   Sandwich,
//   Hamburger,
//   Soup,
//   Cherry,
//   Plus,
//   Baby,
//   ChefHat,
// } from "lucide-react";
// import ItemModal from "@/components/ItemModal";
// import styles from "./menu.module.css";

// const categories = [
//   { id: "alle", label: "Alle", icon: <Pizza size={18} /> },
//   { id: "pizza", label: "Pizza", icon: <Pizza size={18} /> },
//   { id: "indbagt", label: "Indbagt Pizza", icon: <Pizza size={18} /> },
//   { id: "ala-carte", label: "Ala Carte", icon: <Sandwich size={18} /> },
//   {
//     id: "hovedretter",
//     label: "Hovedretter",
//     icon: <ChefHat size={18} />,
//   },
//   { id: "pasta", label: "Pasta", icon: <Soup size={18} /> },
//   { id: "salad", label: "Salat", icon: <Salad size={18} /> },
//   { id: "fries", label: "Pommes Frites", icon: <Cherry size={18} /> },
//   { id: "børn", label: "Børn menu", icon: <Baby size={18} /> },
//   { id: "burger", label: "Burger", icon: <Hamburger size={18} /> },
//   { id: "menuer", label: "Menuer", icon: <UtensilsCrossed size={18} /> },
//   { id: "drikke", label: "Drikkevarer", icon: <CupSoda size={18} /> },
//   { id: "dyppelse", label: "Ekstra dyppelse", icon: <Plus size={18} /> },
// ];

// export default function MenuPage() {
//   const [activeCategory, setActiveCategory] = useState("alle");
//   const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);

//   const filteredItems = useMemo(() => {
//     if (activeCategory === "alle") return menuData;

//     if (activeCategory === "pizza") {
//       return menuData.filter(
//         (item) => item.mainCategory === "pizza" || item.category === "pizza",
//       );
//     }

//     if (activeCategory === "vegetar" || activeCategory === "indbagt") {
//       return menuData.filter((item) => item.subCategory === activeCategory);
//     }

//     return menuData.filter((item) => item.category === activeCategory);
//   }, [activeCategory, menuData]);

//   const handleCardClick = (item: MenuItem) => {
//     setSelectedItem(item);
//     setIsModalOpen(true);
//   };

//   const closeModal = () => {
//     setIsModalOpen(false);
//     setSelectedItem(null);
//   };

//   return (
//     <>
//       <div className={styles.menuPage}>
//         {/* ===== SIDEBAR ===== */}
//         <aside className={styles.sidebar}>
//           <nav className={styles.categoryNav}>
//             {categories.map((cat) => (
//               <button
//                 key={cat.id}
//                 className={`${styles.categoryBtn} ${
//                   activeCategory === cat.id ? styles.active : ""
//                 }`}
//                 onClick={() => setActiveCategory(cat.id)}
//               >
//                 {cat.icon}
//                 <span>{cat.label}</span>
//               </button>
//             ))}
//           </nav>
//         </aside>

//         {/* ===== CARDS GRID ===== */}
//         <section className={styles.cardsSection}>
//           <div className={styles.cardsGrid}>
//             {filteredItems.map((item) => {
//               const price = item.prices.normal ?? item.prices.fixed ?? 0;
//               const hidePrice = [60, 61, 62].includes(item.id);
//               return (
//                 <div
//                   key={item.id}
//                   className={styles.card}
//                   onClick={() => handleCardClick(item)}
//                 >
//                   <div className={styles.cardContent}>
//                     <h3 className={styles.itemName}>
//                       {item.menuNumber ? `${item.menuNumber}. ` : ""}
//                       {item.name}
//                     </h3>
//                     <p className={styles.itemDesc}>{item.description}</p>
//                     {!hidePrice && (
//                       <p className={styles.itemPrice}>{price} kr,-</p>
//                     )}
//                   </div>
//                   <div className={styles.imageWrapper}>
//                     {item.image ? (
//                       <img
//                         src={item.image}
//                         alt={item.name}
//                         className={styles.image}
//                       />
//                     ) : (
//                       <div className={styles.placeholder}>
//                         <Pizza size={40} className={styles.placeholderIcon} />
//                       </div>
//                     )}
//                     <div className={styles.plusIcon}>
//                       <Plus size={20} strokeWidth={3} />
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </section>
//       </div>

//       {/* ===== ITEM MODAL ===== */}
//       <ItemModal
//         item={selectedItem}
//         isOpen={isModalOpen}
//         onClose={closeModal}
//       />
//     </>
//   );
// }

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

import styles from "./menu.module.css";

type AvailabilityStatus = "active" | "until_next_opening" | "manual_off";

type MenuStatusRecord = {
  menu_item_id: number;
  status: AvailabilityStatus;
  available_again_at: string | null;
  updated_at?: string;
};

type AvailabilityResponse = {
  statuses?: MenuStatusRecord[];
};

const categories = [
  {
    id: "alle",
    label: "Alle",
    icon: <ChefHat size={18} />,
  },
  {
    id: "pizza",
    label: "Pizza",
    icon: <Pizza size={18} />,
  },
  {
    id: "indbagt",
    label: "Indbagt Pizza",
    icon: <Pizza size={18} />,
  },
  {
    id: "ala-carte",
    label: "Ala Carte",
    icon: <UtensilsCrossed size={18} />,
  },
  {
    id: "hovedretter",
    label: "Hovedretter",
    icon: <ChefHat size={18} />,
  },
  {
    id: "pasta",
    label: "Pasta",
    icon: <Soup size={18} />,
  },
  {
    id: "salad",
    label: "Salat",
    icon: <Salad size={18} />,
  },
  {
    id: "fries",
    label: "Pommes Frites",
    icon: <Sandwich size={18} />,
  },
  {
    id: "børn",
    label: "Børn menu",
    icon: <Baby size={18} />,
  },
  {
    id: "burger",
    label: "Burger",
    icon: <Hamburger size={18} />,
  },
  {
    id: "menuer",
    label: "Menuer",
    icon: <Sandwich size={18} />,
  },
  {
    id: "drikke",
    label: "Drikkevarer",
    icon: <CupSoda size={18} />,
  },
  {
    id: "dyppelse",
    label: "Ekstra dyppelse",
    icon: <Cherry size={18} />,
  },
];

function formatAvailableAgain(value: string) {
  return new Intl.DateTimeFormat("da-DK", {
    timeZone: "Europe/Copenhagen",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("alle");

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [statuses, setStatuses] = useState<MenuStatusRecord[]>([]);

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
    if (activeCategory === "alle") {
      return menuData;
    }

    if (activeCategory === "pizza") {
      return menuData.filter(
        (item) => item.mainCategory === "pizza" || item.category === "pizza",
      );
    }

    if (activeCategory === "vegetar" || activeCategory === "indbagt") {
      return menuData.filter((item) => item.subCategory === activeCategory);
    }

    return menuData.filter((item) => item.category === activeCategory);
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
      <div className={styles.menuLayout}>
        {/* ===== SIDEBAR ===== */}

        <aside className={styles.sidebar}>
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
              {cat.label}
            </button>
          ))}
        </aside>

        {/* ===== CARDS GRID ===== */}

        <section className={styles.cardsSection}>
          <div className={styles.cardsGrid}>
            {filteredItems.map((item) => {
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

                      {item.name}
                    </h3>

                    <p className={styles.itemDesc}>{item.description}</p>

                    {unavailable && (
                      <div
                        style={{
                          display: "grid",
                          gap: "0.2rem",
                          marginTop: "0.45rem",
                        }}
                      >
                        <strong
                          style={{
                            color: "var(--red)",
                            fontSize: "0.82rem",
                          }}
                        >
                          Udsolgt
                        </strong>

                        {temporary && availability?.available_again_at && (
                          <span
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.72rem",
                            }}
                          >
                            Tilgængelig igen{" "}
                            {formatAvailableAgain(
                              availability.available_again_at,
                            )}
                          </span>
                        )}
                      </div>
                    )}

                    {!hidePrice && (
                      <p className={styles.itemPrice}>{price} kr,-</p>
                    )}
                  </div>

                  <div className={styles.imageWrapper}>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className={styles.image}
                      />
                    ) : (
                      <div className={styles.placeholder}>
                        <Pizza size={40} className={styles.placeholderIcon} />
                      </div>
                    )}

                    <div
                      className={styles.plusIcon}
                      style={
                        unavailable
                          ? {
                              opacity: 0.35,
                              pointerEvents: "none",
                            }
                          : undefined
                      }
                    >
                      <Plus size={20} strokeWidth={3} />
                    </div>
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
      />
    </>
  );
}
