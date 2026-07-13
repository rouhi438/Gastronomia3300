import { menuData } from "@/data/menu";

export function MenuGrid() {
  // Group items by category
  const grouped = menuData.reduce(
    (acc, item) => {
      const cat = item.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    },
    {} as Record<string, typeof menuData>,
  );

  // Define display order of categories
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

  // Category titles in Danish
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
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1rem" }}>
      {categoryOrder.map((category) => {
        const items = grouped[category] || [];
        if (items.length === 0) return null;

        return (
          <div key={category} style={{ marginBottom: "3rem" }}>
            <h2
              style={{
                color: "#009246",
                borderBottom: "3px solid #CE2B37",
                paddingBottom: "0.5rem",
                marginBottom: "1.5rem",
                fontSize: "2rem",
                fontWeight: "bold",
              }}
            >
              {categoryTitles[category] || category}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    borderTop: "4px solid #009246",
                    padding: "1.2rem",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 0.2s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "scale(1.02)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: "bold",
                        color: "#1a1a1a",
                      }}
                    >
                      {item.id}. {item.name}
                    </h3>
                    {item.prices.normal && (
                      <span
                        style={{
                          color: "#CE2B37",
                          fontWeight: "bold",
                          fontSize: "1.1rem",
                        }}
                      >
                        {item.prices.normal} kr.
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: "#555",
                      marginTop: "0.3rem",
                    }}
                  >
                    {item.description}
                  </p>

                  <div
                    style={{
                      marginTop: "0.8rem",
                      fontSize: "0.85rem",
                      color: "#333",
                    }}
                  >
                    {item.prices.family && (
                      <span style={{ marginRight: "1rem" }}>
                        🏠 Fam. {item.prices.family} kr.
                      </span>
                    )}
                    {item.prices.children && (
                      <span style={{ marginRight: "1rem" }}>
                        👶 Børn {item.prices.children} kr.
                      </span>
                    )}
                    {item.deepPanExtra && (
                      <span style={{ color: "#009246", fontWeight: "bold" }}>
                        +{item.deepPanExtra} kr. Deep pan
                      </span>
                    )}
                    {item.prices.fixed && (
                      <span style={{ fontWeight: "bold", color: "#CE2B37" }}>
                        {item.prices.fixed} kr.
                      </span>
                    )}
                  </div>

                  <button
                    style={{
                      marginTop: "1rem",
                      backgroundColor: "#CE2B37",
                      color: "#ffffff",
                      border: "none",
                      padding: "0.6rem",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.opacity = "0.85")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    Tilføj til kurv
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
