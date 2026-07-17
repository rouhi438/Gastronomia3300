import { menuData } from "@/data/menu";
import styles from "./MenuGrid.module.css";
import { Pizza } from "lucide-react";

export default function MenuGrid() {
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
    "vegetar",
    "indbagt",
    "ala-Carte",
    "burger",
    "pasta",
    "salad",
    "tilbehør",
    "ekstra",
  ];

  const categoryTitles: Record<string, string> = {
    pizza: "Pizza",
    Vegetarian: "Vegetar Pizza",
    indbagt: "Indbagt Pizza",
    "ala-Carte": "Ala Carte",
    burger: "Burger",
    pasta: "Pasta",
    salad: "Salat",
    tilbehør: "Tilbehør",
    ekstra: "Ekstra",
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
              {items.map((item) => (
                <div key={item.id} className={styles.card}>
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

                  {/* ===== CARD CONTENT ===== */}
                  <div className={styles.cardHeader}>
                    <h3 className={styles.itemName}>{item.name}</h3>
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

                  <button className="btn-secondary">Tilføj til kurv</button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
