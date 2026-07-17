"use client";

import { useState, useMemo } from "react";
import { menuData, type MenuItem } from "@/data/menu";
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
import ItemModal from "@/components/ItemModal";
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
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleCardClick = (item: MenuItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  return (
    <>
      <div className={styles.menuPage}>
        {/* ===== SIDEBAR ===== */}
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
            {filteredItems.map((item) => {
              const price = item.prices.normal ?? item.prices.fixed ?? 0;

              return (
                <div
                  key={item.id}
                  className={styles.card}
                  onClick={() => handleCardClick(item)}
                >
                  <div className={styles.cardContent}>
                    <h3 className={styles.itemName}>{item.name}</h3>
                    <p className={styles.itemDesc}>{item.description}</p>
                    <p className={styles.itemPrice}>{price} kr,-</p>
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
                    <div className={styles.plusIcon}>
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
