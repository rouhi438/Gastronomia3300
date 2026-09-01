import { menuData, type MenuItem } from "./menu";

export const MOST_ORDERED_ITEM_IDS = [3, 8, 16, 20, 47, 60, 200, 201] as const;

const menuItemsById = new Map(menuData.map((item) => [item.id, item]));

const missingMostOrderedItemIds = MOST_ORDERED_ITEM_IDS.filter(
  (itemId) => !menuItemsById.has(itemId),
);

if (process.env.NODE_ENV !== "production" && missingMostOrderedItemIds.length) {
  console.warn(
    `Most Ordered contains unknown menu item IDs: ${missingMostOrderedItemIds.join(
      ", ",
    )}`,
  );
}

export const mostOrderedItems = MOST_ORDERED_ITEM_IDS.map((itemId) =>
  menuItemsById.get(itemId),
).filter((item): item is MenuItem => Boolean(item));
