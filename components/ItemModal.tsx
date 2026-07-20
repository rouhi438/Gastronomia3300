"use client";

import { useState, useEffect } from "react";
import { X, Plus, Minus, Pizza } from "lucide-react";
import type { MenuItem, Extra } from "@/data/menu";
import { useCart } from "@/context/CartContext";
import styles from "./ItemModal.module.css";

export type SizeOption = "normal" | "family" | "children" | "deepPan";

interface ItemModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  initialExtras?: Extra[];
  initialSize?: SizeOption;
  editingCartId?: string | null;
}

export default function ItemModal({
  item,
  isOpen,
  onClose,
  initialExtras = [],
  initialSize = "normal",
  editingCartId = null,
}: ItemModalProps) {
  const { addItem, updateItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<SizeOption>(initialSize);
  const [selectedExtras, setSelectedExtras] = useState<Extra[]>(initialExtras);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setSelectedSize(initialSize);
      setSelectedExtras(initialExtras);
      setQuantity(1);
    } else {
      setSelectedSize("normal");
      setSelectedExtras([]);
      setQuantity(1);
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const basePrice =
    item.prices.normal ?? item.prices.fixed ?? item.prices.children ?? 0;

  const sizePriceMap: Record<SizeOption, number> = {
    normal: item.prices.normal ?? 0,
    family: item.prices.family ?? 0,
    children: item.prices.children ?? 0,
    deepPan: (item.prices.normal ?? 0) + (item.deepPanExtra ?? 0),
  };

  const getSizeLabel = (size: SizeOption) => {
    switch (size) {
      case "normal":
        return "Almindelig";
      case "family": {
        const diff = (item.prices.family ?? 0) - (item.prices.normal ?? 0);
        return `Familie (+${diff} kr.)`;
      }
      case "children":
        return `Børn (${item.prices.children ?? 0} kr.)`;
      case "deepPan":
        return `Deep Pan (+${item.deepPanExtra ?? 0} kr.)`;
      default:
        return "";
    }
  };

  const toggleExtra = (extra: Extra) => {
    setSelectedExtras((prev) =>
      prev.find((e) => e.name === extra.name)
        ? prev.filter((e) => e.name !== extra.name)
        : [...prev, extra],
    );
  };

  // Calculate extras total with family multiplier
  const extrasTotal = selectedExtras.reduce((sum, extra) => {
    const price = selectedSize === "family" ? extra.price * 2 : extra.price;
    return sum + price;
  }, 0);

  const sizePrice = sizePriceMap[selectedSize] || 0;
  const totalPrice = (sizePrice + extrasTotal) * quantity;

  const handleAddToCart = () => {
    const finalExtrasPrice = selectedExtras.reduce((sum, extra) => {
      const price = selectedSize === "family" ? extra.price * 2 : extra.price;
      return sum + price;
    }, 0);
    const finalPrice = sizePrice + finalExtrasPrice;

    const payload = {
      id: item.id,
      name: item.name,
      price: finalPrice,
      size: selectedSize === "deepPan" ? "normal" : selectedSize,
      deepPan: selectedSize === "deepPan",
      image: item.image || "",
      extras: selectedExtras,
    };

    if (editingCartId) {
      updateItem(editingCartId, payload);
    } else {
      addItem(payload);
    }

    onClose();
  };

  const availableSizes: SizeOption[] = ["normal", "family", "children"];
  if (item.deepPanExtra !== undefined && item.deepPanExtra > 0) {
    availableSizes.push("deepPan");
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* ===== HEADER ===== */}
        <div className={styles.modalHeader}>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* ===== BODY ===== */}
        <div className={styles.modalBody}>
          {/* Image */}
          <div className={styles.imageContainer}>
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                className={styles.modalImage}
              />
            ) : (
              <div className={styles.modalPlaceholder}>
                <Pizza size={56} className={styles.modalPlaceholderIcon} />
              </div>
            )}
          </div>

          {/* Sticky Title */}
          <h2 className={styles.stickyTitle}>{item.name}</h2>

          {/* Description & Base Price */}
          <div className={styles.section}>
            <p className={styles.description}>{item.description}</p>
            <p className={styles.basePrice}>Fra {basePrice} kr.</p>
          </div>

          {/* Size Options */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Størrelse</h4>
            <div className={styles.sizeOptions}>
              {availableSizes.map((size) => {
                const price = sizePriceMap[size];
                if (price === undefined || price === 0) return null;
                return (
                  <button
                    key={size}
                    className={`${styles.sizeBtn} ${
                      selectedSize === size ? styles.active : ""
                    }`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {getSizeLabel(size)}
                    <span className={styles.sizePrice}>{price} kr.</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Extras */}
          {item.extras && item.extras.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Tilbehør</h4>
              <div className={styles.extrasGrid}>
                {item.extras.map((extra) => {
                  const displayPrice =
                    selectedSize === "family" ? extra.price * 2 : extra.price;
                  return (
                    <label key={extra.name} className={styles.extraItem}>
                      <input
                        type="checkbox"
                        checked={selectedExtras.some(
                          (e) => e.name === extra.name,
                        )}
                        onChange={() => toggleExtra(extra)}
                      />
                      <span>{extra.name}</span>
                      <span className={styles.extraPrice}>
                        +{displayPrice} kr.
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity & Action Button */}
          <div className={styles.footer}>
            <div className={styles.quantity}>
              <button
                className={styles.qtyBtn}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus size={18} />
              </button>
              <span className={styles.qtyNumber}>{quantity}</span>
              <button
                className={styles.qtyBtn}
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus size={18} />
              </button>
            </div>

            <button className={styles.addBtn} onClick={handleAddToCart}>
              {editingCartId ? "Opdater ordre" : "Tilføj til ordre"} ·{" "}
              {totalPrice} kr.
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
