"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import type { Extra } from "@/data/menu";

export interface CartItem {
  cartId: string; 
  id: number;
  name: string;
  price: number;
  quantity: number;
  size?: "normal" | "family" | "children";
  deepPan?: boolean;
  image?: string;
  extras?: Extra[];
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity" | "cartId">) => void;
  updateItem: (
    cartId: string,
    item: Omit<CartItem, "quantity" | "cartId">,
  ) => void; 
  removeItem: (cartId: string) => void; 
  updateQuantity: (cartId: string, quantity: number) => void; 
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("cart");
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch {
        setItems([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  const addItem = (newItem: Omit<CartItem, "quantity" | "cartId">) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.id === newItem.id &&
          item.size === newItem.size &&
          item.deepPan === newItem.deepPan &&
          JSON.stringify(item.extras) === JSON.stringify(newItem.extras),
      );

      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }

      const cartId = crypto.randomUUID();
      return [...prev, { ...newItem, quantity: 1, cartId }];
    });
  };

  const updateItem = (
    cartId: string,
    updatedItem: Omit<CartItem, "quantity" | "cartId">,
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.cartId === cartId
          ? { ...updatedItem, quantity: item.quantity, cartId: item.cartId }
          : item,
      ),
    );
  };

  const removeItem = (cartId: string) => {
    setItems((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const updateQuantity = (cartId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.cartId !== cartId));
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.cartId === cartId ? { ...item, quantity } : item,
      ),
    );
  };

  const clearCart = () => setItems([]);

  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalPrice,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
