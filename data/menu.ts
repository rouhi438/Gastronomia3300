export interface MenuItem {
  id: number;
  name: string;
  description: string;
  category: string;
  mainCategory?: string;
  subCategory?: string;
  prices: {
    normal?: number;
    family?: number;
    fixed?: number;
    children?: number;
  };
  deepPanExtra?: number;
  image?: string;
}

export const menuData: MenuItem[] = [
  // ============================================================
  // 1-26: ALL PIZZAS (mainCategory: "pizza")
  // ============================================================

  // ----- 1: MARGHERITA (Vegetar) -----
  {
    id: 1,
    name: "MARGHERITA",
    description: "Tomat, ost",
    category: "pizza",
    mainCategory: "pizza",
    subCategory: "vegetar",
    prices: { normal: 65, family: 130, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 2: TUNNA -----
  {
    id: 2,
    name: "TUNNA",
    description: "Tomat, ost, tunfisk, løg",
    category: "pizza",
    mainCategory: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 3: PEPPERONI -----
  {
    id: 3,
    name: "PEPPERONI",
    description: "Tomat, ost og pepperoni",
    category: "pizza",
    mainCategory: "pizza",
    prices: { normal: 80, family: 160, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 4: VESUVIO -----
  {
    id: 4,
    name: "VESUVIO",
    description: "Tomat, ost og skinke",
    category: "pizza",
    mainCategory: "pizza",
    prices: { normal: 80, family: 160, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 5: HAWAII -----
  {
    id: 5,
    name: "HAWAII",
    description: "Tomat, ost, skinke og ananas",
    category: "pizza",
    mainCategory: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 6: CAPRICCIOSA -----
  {
    id: 6,
    name: "CAPRICCIOSA",
    description: "Tomat, ost, skinke og champignon",
    category: "pizza",
    mainCategory: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 7: VICHINGA -----
  {
    id: 7,
    name: "VICHINGA",
    description: "Tomat, ost, skinke, pepperoni og bacon",
    category: "pizza",
    mainCategory: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 8: KARRY -----
  {
    id: 8,
    name: "KARRY",
    description: "Tomat, ost, kylling, bacon, rødløg og karry dressing",
    category: "pizza",
    mainCategory: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 9: POLLO E PESTO -----
  {
    id: 9,
    name: "POLLO E PESTO",
    description: "Tomat, ost, kylling, kartofler, peber frugt og pesto",
    category: "pizza",
    mainCategory: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 10: MESSICANO -----
  {
    id: 10,
    name: "MESSICANO",
    description: "Tomat, ost, kylling, peber frugt, jalapenos og hvidløg",
    category: "pizza",
    mainCategory: "pizza",
    prices: { normal: 90, family: 180, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 11: BLOGNESE -----
  {
    id: 11,
    name: "BLOGNESE",
    description: "Tomat, ost, oksekødsauce og løg",
    category: "pizza",
    mainCategory: "pizza",
    prices: { normal: 80, family: 160, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 12: PANCETTA -----
  {
    id: 12,
    name: "PANCETTA",
    description: "Tomat, ost, spinat, kylling, soltørret tomat og bacon",
    category: "pizza",
    mainCategory: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 13: TORINO -----
  {
    id: 13,
    name: "TORINO",
    description: "Tomat, ost, kartofler og bacon",
    category: "pizza",
    mainCategory: "pizza",
    prices: { normal: 80, family: 160, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 14: MIX -----
  {
    id: 14,
    name: "MIX",
    description:
      "Tomat, ost, skinke, kødstrimler, kylling, kebab og bearnaissauce",
    category: "pizza",
    mainCategory: "pizza",
    prices: { normal: 105, family: 210, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 15: MILANO -----
  {
    id: 15,
    name: "MILANO",
    description: "Tomat, ost, kødstrimler, gorgonzola og rødløg",
    category: "pizza",
    mainCategory: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 16: BEARNAISE PIZZA -----
  {
    id: 16,
    name: "BEARNAISE PIZZA",
    description: "Tomat, ost, kebab og bearnaise",
    category: "pizza",
    mainCategory: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 17: PUNJABI PIZZA -----
  {
    id: 17,
    name: "PUNJABI PIZZA",
    description: "Tomat, ost, kødstrimler, paprika, løg, jalapenos, hvidløg",
    category: "pizza",
    mainCategory: "pizza",
    prices: { normal: 95, family: 190, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 18: QUATTRO FORMAGGI (Vegetar) -----
  {
    id: 18,
    name: "QUATTRO FORMAGGI",
    description: "Tomat og 4 forskellige oste",
    category: "pizza",
    mainCategory: "pizza",
    subCategory: "vegetar",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 19: PARMA CON RUCOLA -----
  {
    id: 19,
    name: "PARMA CON RUCOLA",
    description: "Tomat, ost, brasola, parmesan, rucola",
    category: "pizza",
    mainCategory: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 20: PIZZA SALATA -----
  {
    id: 20,
    name: "PIZZA SALATA",
    description:
      "Tomat, ost, vælg mellem kebab/skinke/kylling/kødstrimler, salat og dressing",
    category: "pizza",
    mainCategory: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 21: RUSTICA (Vegetar) -----
  {
    id: 21,
    name: "RUSTICA",
    description:
      "Tomat, ost, aubergine, semidertomat, cherrytomat, parmesan, pesto og rucola",
    category: "pizza",
    mainCategory: "pizza",
    subCategory: "vegetar",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 22: BARI -----
  {
    id: 22,
    name: "BARI",
    description: "Tomat, ost, kalkun, chorizo, cherrytomat, parmesan og rucola",
    category: "pizza",
    mainCategory: "pizza",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 23: PATATE (Vegetar) -----
  {
    id: 23,
    name: "PATATE",
    description:
      "Tomat, ost, kartofler, gorgonzola, cherrytomat, pesto og skinke",
    category: "pizza",
    mainCategory: "pizza",
    subCategory: "vegetar",
    prices: { normal: 85, family: 170, children: 65 },
    deepPanExtra: 25,
    image: "",
  },
  // ----- 24: CALZONA (Indbagt) -----
  {
    id: 24,
    name: "CALZONA",
    description: "Tomatsauce, ost, champignon",
    category: "pizza",
    mainCategory: "pizza",
    subCategory: "indbagt",
    prices: { fixed: 85 },
    image: "",
  },
  // ----- 25: HALV INDBAGT (Indbagt) -----
  {
    id: 25,
    name: "HALV INDBAGT",
    description: "Ost, kebab, champignon, løg, bearnaisesauce og chili",
    category: "pizza",
    mainCategory: "pizza",
    subCategory: "indbagt",
    prices: { fixed: 85 },
    image: "",
  },
  // ----- 26: SANDWICH (Indbagt) -----
  {
    id: 26,
    name: "SANDWICH",
    description:
      "Vælg mellem kebab / kylling / skinke / falafel, salat og dressing",
    category: "pizza",
    mainCategory: "pizza",
    subCategory: "indbagt",
    prices: { fixed: 60 },
    image: "",
  },

  // ============================================================
  // 27-29: ALA CARTE
  // ============================================================
  {
    id: 27,
    name: "PITABRØD",
    description:
      "Vælg mellem kebab / kylling / skinke / falafel, salat og dressing",
    category: "ala-carte",
    prices: { fixed: 60 },
    image: "",
  },
  {
    id: 28,
    name: "DURUM",
    description:
      "Vælg mellem kebab / kylling / skinke / falafel, salat og dressing",
    category: "ala-carte",
    prices: { fixed: 60 },
    image: "",
  },
  {
    id: 29,
    name: "BOX",
    description:
      "Vælg mellem kebab / kylling / skinke / falafel, salat og dressing",
    category: "ala-carte",
    prices: { fixed: 60 },
    image: "",
  },

  // ============================================================
  // 37-39: PASTA
  // ============================================================
  {
    id: 37,
    name: "SPAGHETTI BOLOGNESE",
    description: "Spaghetti med kødsauce, parmesanost",
    category: "pasta",
    prices: { fixed: 80 },
    image: "",
  },
  {
    id: 38,
    name: "PASTA LA FREDERIKSVÆRK",
    description: "Med pastaskruer, kylling, bacon & tomatflødesauce",
    category: "pasta",
    prices: { fixed: 80 },
    image: "",
  },
  {
    id: 39,
    name: "CARBONARA",
    description: "Med spaghetti, bacon, æggeblomme og flødesauce",
    category: "pasta",
    prices: { fixed: 80 },
    image: "",
  },

  // ============================================================
  // 40-42: SALAT
  // ============================================================
  {
    id: 40,
    name: "SALAT kebab/kylling/skinke/tunfisk",
    description: "Med iceberg, tomat, agurk og dressing",
    category: "salad",
    prices: { fixed: 55 },
    image: "",
  },
  {
    id: 41,
    name: "PASTA SALAT",
    description: "Med pasta, kebab, skinke/kylling og dressing",
    category: "salad",
    prices: { fixed: 55 },
    image: "",
  },
  {
    id: 42,
    name: "GRÆSK SALAT",
    description: "Med tomat, agurk, iceberg, fetaost, oliven",
    category: "salad",
    prices: { fixed: 55 },
    image: "",
  },

  // ============================================================
  // 31-36, 46-47: TILBEHØR
  // ============================================================
  {
    id: 31,
    name: "HALV KYLLING",
    description: "Med pommes frites, remoulade, salat og dressing",
    category: "tilbehør",
    prices: { fixed: 90 },
    image: "",
  },
  {
    id: 32,
    name: "KYLLING NUGGETS (10 stk.)",
    description: "Med pommes frites, remoulade, salat og dressing",
    category: "tilbehør",
    prices: { fixed: 85 },
    image: "",
  },
  {
    id: 33,
    name: "FISKEFILET (2 stk.)",
    description: "Med pommes frites, remoulade, salat & dressing",
    category: "tilbehør",
    prices: { fixed: 85 },
    image: "",
  },
  {
    id: 34,
    name: "HVIDLØGSBRØD",
    description: "Med ost & hvidløg",
    category: "tilbehør",
    prices: { fixed: 85 },
    image: "",
  },
  {
    id: 35,
    name: "NACHOS",
    description:
      "Vælg mellem kebab/kylling med ost, oliven, jalapenos og guacamole",
    category: "tilbehør",
    prices: { fixed: 85 },
    image: "",
  },
  {
    id: 36,
    name: "LASAGNE BOLOGNESE",
    description: "Med kødsauce og ost",
    category: "tilbehør",
    prices: { fixed: 85 },
    image: "",
  },
  {
    id: 46,
    name: "POMMES FRITES (Lille pakke)",
    description: "",
    category: "tilbehør",
    prices: { fixed: 30 },
    image: "",
  },
  {
    id: 47,
    name: "POMMES FRITES (Stor pakke)",
    description: "",
    category: "tilbehør",
    prices: { fixed: 35 },
    image: "",
  },

  // ============================================================
  // 48-53: BURGER
  // ============================================================
  {
    id: 48,
    name: "HJEMMELAVET BIG BURGER",
    description: "Med mayonnaise, ketchup, salat, tomat, agurk og løg",
    category: "burger",
    prices: { fixed: 65 },
    image: "",
  },
  {
    id: 49,
    name: "HJEMMELAVET CHEESE BURGER",
    description: "Med mayonnaise, ketchup, salat, tomat, agurk og løg",
    category: "burger",
    prices: { fixed: 70 },
    image: "",
  },
  {
    id: 50,
    name: "HJEMMELAVET BACON BURGER",
    description: "Med mayonnaise, ketchup, salat, tomat, agurk og løg",
    category: "burger",
    prices: { fixed: 70 },
    image: "",
  },
  {
    id: 51,
    name: "HJEMMELAVET BACON CHEESE BURGER",
    description: "Med mayonnaise, ketchup, salat, tomat, agurk og løg",
    category: "burger",
    prices: { fixed: 75 },
    image: "",
  },
  {
    id: 52,
    name: "HJEMMELAVET DOBBELT BACON CHEESE BURGER",
    description: "Med mayonnaise, ketchup, salat, tomat, agurk og løg",
    category: "burger",
    prices: { fixed: 90 },
    image: "",
  },
  {
    id: 53,
    name: "CRISPY CHICKEN",
    description: "Med mayonnaise, ketchup, salat, tomat, agurk og løg",
    category: "burger",
    prices: { fixed: 55 },
    image: "",
  },

  // ============================================================
  // EKSTRA (sauces, toppings) - ID: 999-1002
  // ============================================================
  {
    id: 999,
    name: "EKSTRA TILBEHØRE",
    description: "Chilli, dressing, salat, flød, hvidløg",
    category: "ekstra",
    prices: { fixed: 5 },
    image: "",
  },
  {
    id: 1000,
    name: "POMMESFRIT TILBEHØRE",
    description: "Chilli, mayonaise, remoulade, ketchup, bearnaise, dressing",
    category: "ekstra",
    prices: { fixed: 10 },
    image: "",
  },
  {
    id: 1001,
    name: "EKSTRA TOPPING (grøntsager)",
    description:
      "Æg, ananas, bearnaise, champignon, jalapenos, løg, oliven, kartøffelskiver, paprika, rucola, tomatsauce, gorgonzola",
    category: "ekstra",
    prices: { fixed: 10 },
    image: "",
  },
  {
    id: 1002,
    name: "EKSTRA TOPPING (kød)",
    description:
      "Bacon, kødsauce, kødstrimler, kylling, kebab, skinke, pepperoni",
    category: "ekstra",
    prices: { fixed: 15 },
    image: "",
  },
];
