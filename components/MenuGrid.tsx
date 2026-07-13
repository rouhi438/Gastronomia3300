import { menuData } from "@/data/menu";

export function MenuGrid() {
  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ color: "#009246" }}>Our Pizzas</h2>
      <p>Total pizzas: {menuData.length}</p>
      <ul>
        {menuData.map((item) => (
          <li key={item.id}>
            {item.id}. {item.name} -{" "}
            {item.prices.normal
              ? `Alm. ${item.prices.normal} DKK / Fam. ${item.prices.family} DKK`
              : `Fixed: ${item.prices.fixed} DKK`}
          </li>
        ))}
      </ul>
    </div>
  );
}
