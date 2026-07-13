import { menuData } from "@/data/menu";
import styles from "./MenuGrid.module.css";

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
    "Vegetarian",
    "Indbagt Pizza",
    "AlaCarte",
    "burger",
    "pasta",
    "salad",
    "sides",
    "extras",
  ];

  const categoryTitles: Record<string, string> = {
    pizza: "Pizza",
    Vegetarian: "Vegetar Pizza",
    "Indbagt Pizza": "Indbagt Pizza",
    AlaCarte: "Ala Carte",
    burger: "Burger",
    pasta: "Pasta",
    salad: "Salat",
    sides: "Tilbehør",
    extras: "Ekstra",
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
                    style={{ marginTop: "1rem", width: "100%" }}
                  >
                    Tilføj til kurv
                  </button>{" "}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
