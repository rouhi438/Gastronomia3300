"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { menuData, type MenuItem, type Extra } from "@/data/menu";
import { X, Plus, Minus } from "lucide-react";
import ItemModal, { SizeOption } from "./ItemModal";
import styles from "./CartDrawer.module.css";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } =
    useCart();
  const [editingCartId, setEditingCartId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [initialExtras, setInitialExtras] = useState<Extra[]>([]);
  const [initialSize, setInitialSize] = useState<SizeOption>("normal");
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!isOpen) return null;

  const handleItemClick = (cartItem: any) => {
    const originalItem = menuData.find((m) => m.id === cartItem.id);
    if (!originalItem) return;

    let sizeOption: SizeOption = "normal";
    if (cartItem.deepPan) sizeOption = "deepPan";
    else if (cartItem.size === "family") sizeOption = "family";
    else if (cartItem.size === "children") sizeOption = "children";

    setEditingCartId(cartItem.cartId);
    setEditingItem(originalItem);
    setInitialExtras(cartItem.extras || []);
    setInitialSize(sizeOption);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setEditingCartId(null);
    setInitialExtras([]);
    setInitialSize("normal");
  };

  return (
    <>
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
              <div className={styles.emptyState}>
                <Image
                  src="/images/cat.png"
                  alt="Tom Indkøbskurv"
                  width={300}
                  height={450}
                />
                <Link
                  href="/menu"
                  onClick={onClose}
                  className={styles.backToShopBtn}
                >
                  Fortsæt med at handle
                </Link>
              </div>
            ) : (
              <>
                <ul className={styles.list}>
                  {items.map((item) => {
                    return (
                      <li
                        key={item.cartId}
                        className={styles.item}
                        onClick={() => handleItemClick(item)}
                      >
                        <div className={styles.itemMain}>
                          <div className={styles.itemHeader}>
                            <h4 className={styles.itemName}>{item.name}</h4>
                            <span className={styles.itemPrice}>
                              {item.price * item.quantity} kr.
                            </span>
                          </div>
                          <div className={styles.itemMeta}>
                            {item.size && (
                              <span className={styles.itemSize}>
                                {item.size === "family"
                                  ? "Familie"
                                  : item.size === "children"
                                    ? "Børn"
                                    : item.deepPan
                                      ? "Deep Pan"
                                      : "Almindelig"}
                              </span>
                            )}
                            <span className={styles.itemQty}>
                              {item.quantity} stk.
                            </span>
                          </div>
                        </div>

                        {item.extras && item.extras.length > 0 && (
                          <div className={styles.extrasColumn}>
                            {item.extras.map((extra) => (
                              <span
                                key={extra.name}
                                className={styles.extraItem}
                              >
                                <Plus size={12} className={styles.extraIcon} />
                                {extra.name}
                              </span>
                            ))}
                          </div>
                        )}

                        <div
                          className={styles.actions}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() =>
                              updateQuantity(item.cartId, item.quantity - 1)
                            }
                          >
                            <Minus size={16} />
                          </button>
                          <span className={styles.qtyNumber}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.cartId, item.quantity + 1)
                            }
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            className={styles.removeBtn}
                            onClick={() => removeItem(item.cartId)}
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
                  <Link
                    href="/menu"
                    className={styles.backToMenuBtn}
                    onClick={() => onClose()}
                  >
                    <span className={styles.backToMenuIcon}>←</span>
                    Tilbage til menuen
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ItemModal
        item={editingItem}
        isOpen={isModalOpen}
        onClose={closeModal}
        initialExtras={initialExtras}
        initialSize={initialSize}
        editingCartId={editingCartId}
      />
    </>
  );
}
