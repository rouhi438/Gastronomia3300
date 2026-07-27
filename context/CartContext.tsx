"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DELIVERY_FEE } from "@/lib/delivery";
import type { Extra } from "@/data/menu";

export type DeliveryMethod = "pickup" | "delivery";

export interface DeliveryAddress {
  addressLine1: string;
  postalCode: string;
  city: string;
  floorDoor: string;
  placeId: string;
  latitude: number | null;
  longitude: number | null;
  formattedAddress: string;
}

export interface CartItem {
  cartId: string;
  id: number;
  name: string;
  price: number;
  quantity: number;
  size?: "normal" | "family" | "children" | "deepPan";
  deepPan?: boolean;
  image?: string;
  extras?: Extra[];
}

interface CartContextType {
  items: CartItem[];

  addItem: (item: Omit<CartItem, "cartId">) => void;

  updateItem: (
    cartId: string,
    item: Omit<CartItem, "cartId" | "quantity">,
  ) => void;

  removeItem: (cartId: string) => void;
  updateQuantity: (cartId: string, quantity: number) => void;
  clearCart: () => void;

  deliveryMethod: DeliveryMethod;
  setDeliveryMethod: (method: DeliveryMethod) => void;

  deliveryAddress: DeliveryAddress;
  setDeliveryAddress: (address: DeliveryAddress) => void;
  clearDeliveryAddress: () => void;

  bagIncluded: boolean;
  setBagIncluded: (included: boolean) => void;

  subtotal: number;
  bagFee: number;
  serviceFee: number;
  deliveryFee: number;
  totalPrice: number;
  totalItems: number;
}

interface StoredCartState {
  items?: CartItem[];
  deliveryMethod?: DeliveryMethod;
  deliveryAddress?: Partial<DeliveryAddress>;
  bagIncluded?: boolean;
}

const BAG_FEE = 4;
const SERVICE_FEE = 4;

const emptyDeliveryAddress: DeliveryAddress = {
  addressLine1: "",
  postalCode: "",
  city: "",
  floorDoor: "",
  placeId: "",
  latitude: null,
  longitude: null,
  formattedAddress: "",
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const [deliveryMethod, setDeliveryMethodState] =
    useState<DeliveryMethod>("pickup");

  const [deliveryAddress, setDeliveryAddressState] =
    useState<DeliveryAddress>(emptyDeliveryAddress);

  const [bagIncluded, setBagIncluded] = useState(true);

  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  useEffect(() => {
    const savedCart = localStorage.getItem("cart");

    if (!savedCart) {
      setHasLoadedStorage(true);
      return;
    }

    try {
      const parsed: CartItem[] | StoredCartState = JSON.parse(savedCart);

      if (Array.isArray(parsed)) {
        setItems(parsed);
        setHasLoadedStorage(true);
        return;
      }

      setItems(Array.isArray(parsed.items) ? parsed.items : []);

      setDeliveryMethodState(
        parsed.deliveryMethod === "delivery" ? "delivery" : "pickup",
      );

      setDeliveryAddressState({
        ...emptyDeliveryAddress,
        ...parsed.deliveryAddress,
      });

      setBagIncluded(parsed.bagIncluded !== false);
    } catch {
      setItems([]);
      setDeliveryMethodState("pickup");
      setDeliveryAddressState(emptyDeliveryAddress);
      setBagIncluded(true);
    } finally {
      setHasLoadedStorage(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;

    const state: StoredCartState = {
      items,
      deliveryMethod,
      deliveryAddress,
      bagIncluded,
    };

    localStorage.setItem("cart", JSON.stringify(state));
  }, [items, deliveryMethod, deliveryAddress, bagIncluded, hasLoadedStorage]);

  const addItem = (newItem: Omit<CartItem, "cartId">) => {
    setItems((previousItems) => {
      const existingIndex = previousItems.findIndex(
        (item) =>
          item.id === newItem.id &&
          item.size === newItem.size &&
          item.deepPan === newItem.deepPan &&
          JSON.stringify(item.extras ?? []) ===
            JSON.stringify(newItem.extras ?? []),
      );

      if (existingIndex !== -1) {
        const updatedItems = [...previousItems];

        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity:
            updatedItems[existingIndex].quantity + (newItem.quantity || 1),
        };

        return updatedItems;
      }

      return [
        ...previousItems,
        {
          ...newItem,
          quantity: newItem.quantity || 1,
          cartId: crypto.randomUUID(),
        },
      ];
    });
  };

  const updateItem = (
    cartId: string,
    updatedItem: Omit<CartItem, "cartId" | "quantity">,
  ) => {
    setItems((previousItems) =>
      previousItems.map((item) =>
        item.cartId === cartId
          ? {
              ...updatedItem,
              quantity: item.quantity,
              cartId: item.cartId,
            }
          : item,
      ),
    );
  };

  const removeItem = (cartId: string) => {
    setItems((previousItems) =>
      previousItems.filter((item) => item.cartId !== cartId),
    );
  };

  const updateQuantity = (cartId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartId);
      return;
    }

    setItems((previousItems) =>
      previousItems.map((item) =>
        item.cartId === cartId ? { ...item, quantity } : item,
      ),
    );
  };

  const setDeliveryMethod = (method: DeliveryMethod) => {
    setDeliveryMethodState(method);
  };

  const setDeliveryAddress = (address: DeliveryAddress) => {
    setDeliveryAddressState(address);
  };

  const clearDeliveryAddress = () => {
    setDeliveryAddressState(emptyDeliveryAddress);
  };

  const clearCart = () => {
    setItems([]);
    setDeliveryMethodState("pickup");
    setDeliveryAddressState(emptyDeliveryAddress);
    setBagIncluded(true);
    localStorage.removeItem("cart");
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    if (items.length === 0) {
      return {
        subtotal: 0,
        bagFee: 0,
        serviceFee: 0,
        deliveryFee: 0,
        totalPrice: 0,
        totalItems: 0,
      };
    }

    const bagFee = bagIncluded ? BAG_FEE : 0;

    const serviceFee = SERVICE_FEE;

    const deliveryFee = deliveryMethod === "delivery" ? DELIVERY_FEE : 0;

    const totalPrice = subtotal + bagFee + serviceFee + deliveryFee;

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      subtotal,
      bagFee,
      serviceFee,
      deliveryFee,
      totalPrice,
      totalItems,
    };
  }, [items, bagIncluded, deliveryMethod]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateItem,
        removeItem,
        updateQuantity,
        clearCart,

        deliveryMethod,
        setDeliveryMethod,

        deliveryAddress,
        setDeliveryAddress,
        clearDeliveryAddress,

        bagIncluded,
        setBagIncluded,

        subtotal: totals.subtotal,
        bagFee: totals.bagFee,
        serviceFee: totals.serviceFee,
        deliveryFee: totals.deliveryFee,
        totalPrice: totals.totalPrice,
        totalItems: totals.totalItems,
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
