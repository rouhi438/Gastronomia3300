"use client";

import { menuData } from "@/data/menu";
import { Pizza } from "lucide-react";
import styles from "./MenuGrid.module.css";

interface MenuGridProps {
  onCardClick: (item: any) => void;
}

export default function MenuGrid({ onCardClick }: MenuGridProps) {
  const grouped = menuData.reduce(
    (acc, item) => {
      const cat = item.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {} as Record<string, typeof menuData>,
  );

  const categoryOrder = [
    "pizza",
    "indbagt pizza",
    "ala-carte",
    "hovedretter",
    "pasta",
    "salad",
    "fries",
    "børn",
    "burger",
    "menuer",
    "drikke",
    "dyppelse",
  ];

  const categoryTitles: Record<string, string> = {
    pizza: "Pizza",
    "indbagt pizza": "Indbagt Pizza",
    "ala-carte": "Ala Carte",
    hovedretter: "Hovedretter",
    pasta: "Pasta",
    salad: "Salat",
    fries: "Pommes Frites",
    børn: "Børn menu",
    burger: "Burger",
    menuer: "Menuer",
    drikke: "Drikkevarer",
    dyppelse: "Pommes Tilbehøre",
  };

  return (
    <div className={styles.menuContainer}>
      {categoryOrder.map((category) => {
        const items = grouped[category] || [];
        if (items.length === 0) return null;

        return (
          <div key={category} style={{ marginBottom: "3rem" }}>
            <h2 className={styles.categoryTitle}>
              {categoryTitles[category] || category}
            </h2>

            <div className={styles.grid}>
              {items.map((item) => {
                const price = item.prices.normal ?? item.prices.fixed ?? 0;

                return (
                  <div
                    key={item.id}
                    className={styles.card}
                    onClick={() => onCardClick(item)}
                  >
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

                    <div className={styles.cardContent}>
                      <h3 className={styles.itemName}>{item.name}</h3>
                      <p className={styles.itemPrice}>{price} kr.</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
