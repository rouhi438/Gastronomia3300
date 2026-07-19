"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { X, Plus, Minus } from "lucide-react";
import styles from "./CartDrawer.module.css";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } =
    useCart();

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Indkøbskurv ({totalItems})</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.body}>
          {items.length === 0 ? (
            <p className={styles.empty}>Din kurv er tom.</p>
          ) : (
            <>
              <ul className={styles.list}>
                {items.map((item) => {
                  const uniqueKey = `${item.id}-${item.size || ""}-${item.deepPan ? "dp" : ""}-${item.extras?.map((e) => e.name).join("-") || ""}`;
                  return (
                    <li key={uniqueKey} className={styles.item}>
                      <div className={styles.itemInfo}>
                        <h4>{item.name}</h4>
                        {item.extras && item.extras.length > 0 && (
                          <div className={styles.itemExtras}>
                            {item.extras.map((e) => e.name).join(", ")}
                          </div>
                        )}
                        <p>{item.price} kr.</p>
                      </div>
                      <div className={styles.actions}>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          <Minus size={16} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          <Plus size={16} />
                        </button>
                        <button
                          className={styles.removeBtn}
                          onClick={() => removeItem(item.id)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className={styles.footer}>
                <div className={styles.total}>
                  <span>I alt:</span>
                  <strong>{totalPrice} kr.</strong>
                </div>
                <Link
                  href="/checkout"
                  className="btn-primary"
                  style={{ width: "100%", textAlign: "center" }}
                  onClick={() => onClose()}
                >
                  Gå til kassen
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
