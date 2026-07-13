export interface PizzaItem {
  id: number;
  name: string;
  description: string;
  category:
    | "pizza"
    | "Vegetarian"
    | "Indbagt Pizza"
    | "sandwich"
    | "burger"
    | "pasta"
    | "salad"
    | "sides"
    | "extras";
  prices: {
    normal?: number; // for pizzas 1-23
    family?: number; // for pizzas 1-23
    fixed?: number; // for special pizzas and other items
    children?: number; // for pizzas 1-23 (fixed 65 DKK)
  };
  deepPanExtra?: number; // for pizzas 1-23 (25 DKK extra)
}

export const menuData: PizzaItem[] = [
  // ========== PIZZAS 1-23 ==========
  {
    id: 1,
    name: "MARGHERITA",
    description: "Tomat, ost",
    category: "Vegetarian",
    prices: { normal: 65, family: 130, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 2,
    name: "TUNNA",
    description: "Tomat, ost, tunfisk, løg",
    category: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 3,
    name: "PEPPERONI",
    description: "Tomat, ost og pepperoni",
    category: "pizza",
    prices: { normal: 80, family: 160, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 4,
    name: "VESUVIO",
    description: "Tomat, ost og skinke",
    category: "pizza",
    prices: { normal: 80, family: 160, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 5,
    name: "HAWAII",
    description: "Tomat, ost, skinke og ananas",
    category: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 6,
    name: "CAPRICCIOSA",
    description: "Tomat, ost, skinke og champignon",
    category: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 7,
    name: "VICHINGA",
    description: "Tomat, ost, skinke, pepperoni og bacon",
    category: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 8,
    name: "KARRY",
    description: "Tomat, ost, kylling, bacon, rødløg og karry dressing",
    category: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 9,
    name: "POLLO E PESTO",
    description: "Tomat, ost, kylling, kartofler, peber frugt og pesto",
    category: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 10,
    name: "MESSICANO",
    description: "Tomat, ost, kylling, peber frugt, jalapenos og hvidløg",
    category: "pizza",
    prices: { normal: 90, family: 180, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 11,
    name: "BLOGNESE",
    description: "Tomat, ost, oksekødsauce og løg",
    category: "pizza",
    prices: { normal: 80, family: 160, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 12,
    name: "PANCETTA",
    description: "Tomat, ost, spinat, kylling, soltørret tomat og bacon",
    category: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 13,
    name: "TORINO",
    description: "Tomat, ost, kartofler og bacon",
    category: "pizza",
    prices: { normal: 80, family: 160, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 14,
    name: "MIX",
    description:
      "Tomat, ost, skinke, kødstrimler, kylling, kebab og bearnaissauce",
    category: "pizza",
    prices: { normal: 105, family: 210, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 15,
    name: "MILANO",
    description: "Tomat, ost, kødstrimler, gorgonzola og rødløg",
    category: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 16,
    name: "BEARNAISE PIZZA",
    description: "Tomat, ost, kebab og bearnaise",
    category: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 17,
    name: "PUNJABI PIZZA",
    description: "Tomat, ost, kødstrimler, paprika, løg, jalapenos, hvidløg",
    category: "pizza",
    prices: { normal: 95, family: 190, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 18,
    name: "QUATTRO FORMAGGI",
    description: "Tomat og 4 forskellige oste",
    category: "Vegetarian",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 19,
    name: "PARMA CON RUCOLA",
    description: "Tomat, ost, brasola, parmesan, rucola",
    category: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 20,
    name: "PIZZA SALATA",
    description:
      "Tomat, ost, vælg mellem kebab/skinke/kylling/kødstrimler, salat og dressing",
    category: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 21,
    name: "RUSTICA",
    description:
      "Tomat, ost, aubergine, semidertomat, cherrytomat, parmesan, pesto og rucola",
    category: "Vegetarian",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 22,
    name: "BARI",
    description: "Tomat, ost, kalkun, chorizo, cherrytomat, parmesan og rucola",
    category: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
  },
  {
    id: 23,
    name: "PATATE",
    description:
      "Tomat, ost, kartofler, gorgonzola, cherrytomat, pesto og skinke",
    category: "Vegetarian",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
  },

  // ========== SPECIAL PIZZAS (only fixed price, no size options) ==========
  {
    id: 24,
    name: "CALZONA",
    description: "Tomatsauce, ost, champignon",
    category: "special-pizza",
    prices: { fixed: 85 },
  },
  {
    id: 25,
    name: "HALV INDBAGT",
    description: "Ost, kebab, champignon, løg, bearnaisesauce og chili",
    category: "special-pizza",
    prices: { fixed: 85 },
  },
];
