"use client";

import { useState, useMemo } from "react";
import { menuData } from "@/data/menu";
import {
  Pizza,
  Utensils,
  Salad,
  Coffee,
  Beef,
  Soup,
  Cherry,
  Plus,
} from "lucide-react";
import styles from "./menu.module.css";

const categories = [
  { id: "alle", label: "Alle", icon: <Pizza size={18} /> },
  { id: "pizza", label: "Pizza", icon: <Pizza size={18} /> },
  { id: "vegetar", label: "Vegetar", icon: <Salad size={18} /> },
  { id: "indbagt", label: "Indbagt", icon: <Coffee size={18} /> },
  { id: "ala-carte", label: "Ala Carte", icon: <Utensils size={18} /> },
  { id: "burger", label: "Burger", icon: <Beef size={18} /> },
  { id: "pasta", label: "Pasta", icon: <Soup size={18} /> },
  { id: "salad", label: "Salat", icon: <Salad size={18} /> },
  { id: "tilbehør", label: "Tilbehør", icon: <Cherry size={18} /> },
  { id: "ekstra", label: "Ekstra", icon: <Plus size={18} /> },
];

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState("alle");

  const filteredItems = useMemo(() => {
    if (activeCategory === "alle") return menuData;

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

  return (
    <div className={styles.menuPage}>
      {/* ===== SIDEBAR (Desktop) / HORIZONTAL SCROLL (Mobile) ===== */}
      <aside className={styles.sidebar}>
        <nav className={styles.categoryNav}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.categoryBtn} ${
                activeCategory === cat.id ? styles.active : ""
              }`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ===== CARDS GRID ===== */}
      <section className={styles.cardsSection}>
        <div className={styles.cardsGrid}>
          {filteredItems.map((item) => (
            <div key={item.id} className={styles.card}>
              {/* Image placeholder */}
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
                    <span className={styles.placeholderText}>
                      Billede kommer
                    </span>
                  </div>
                )}
              </div>

              {/* Card content */}
              <div className={styles.cardHeader}>
                <h3 className={styles.itemName}>
                  {item.id}. {item.name}
                </h3>
                {item.prices.normal && (
                  <span className={styles.priceNormal}>
                    {item.prices.normal} kr.
                  </span>
                )}
              </div>

              <p className={styles.description}>{item.description}</p>

              <div className={styles.priceDetails}>
                {item.prices.family && (
                  <span className={styles.priceFamily}>
                    🏠 Fam. {item.prices.family} kr.
                  </span>
                )}
                {item.prices.children && (
                  <span className={styles.priceChildren}>
                    👶 Børn {item.prices.children} kr.
                  </span>
                )}
                {item.deepPanExtra && (
                  <span className={styles.deepPan}>
                    +{item.deepPanExtra} kr. Deep pan
                  </span>
                )}
                {item.prices.fixed && (
                  <span className={styles.priceFixed}>
                    {item.prices.fixed} kr.
                  </span>
                )}
              </div>

              <button
                className="btn-secondary"
                style={{ marginTop: "auto", width: "100%" }}
              >
                Tilføj til kurv
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
