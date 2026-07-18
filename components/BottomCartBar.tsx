"use client";

import { useCart } from "@/context/CartContext";
import { useCartUI } from "@/context/CartUIContext";
import { ShoppingBag } from "lucide-react";
import styles from "./BottomCartBar.module.css";

export default function BottomCartBar() {
  const { totalItems, totalPrice } = useCart();
  const { openCart } = useCartUI();

  if (totalItems === 0) return null;

  return (
    <button className={styles.bar} onClick={openCart}>
      <div className={styles.content}>
        <div className={styles.left}>
          <ShoppingBag size={20} className={styles.icon} />
          <span className={styles.count}>{totalItems} varer</span>
        </div>
        <div className={styles.right}>
          <span className={styles.total}>{totalPrice} kr.</span>
          <span className={styles.arrow}>→</span>
        </div>
      </div>
    </button>
  );
}
