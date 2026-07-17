"use client";

import { useState } from "react";
import { X, Plus, Minus, Pizza } from "lucide-react";
import type { MenuItem, Extra } from "@/data/menu";
import { useCart } from "@/context/CartContext";
import styles from "./ItemModal.module.css";

interface ItemModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
}

type SizeOption = "normal" | "family" | "children" | "deepPan";

export default function ItemModal({ item, isOpen, onClose }: ItemModalProps) {
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<SizeOption>("normal");
  const [selectedExtras, setSelectedExtras] = useState<Extra[]>([]);
  const [quantity, setQuantity] = useState(1);

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

  const extrasTotal = selectedExtras.reduce((sum, e) => sum + e.price, 0);
  const sizePrice = sizePriceMap[selectedSize] || 0;
  const totalPrice = (sizePrice + extrasTotal) * quantity;

  const handleAddToCart = () => {
    addItem({
      id: item.id,
      name: item.name,
      price: sizePrice + extrasTotal,
      quantity,
      size: selectedSize === "deepPan" ? "normal" : selectedSize,
      deepPan: selectedSize === "deepPan",
      image: item.image || "",
      extras: selectedExtras,
    });
    onClose();
    setQuantity(1);
    setSelectedExtras([]);
    setSelectedSize("normal");
  };

  const availableSizes: SizeOption[] = ["normal", "family", "children"];
  if (item.deepPanExtra !== undefined && item.deepPanExtra > 0) {
    availableSizes.push("deepPan");
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* ===== CLOSE BUTTON ===== */}
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={24} />
        </button>

        {/* ===== IMAGE (Top) ===== */}
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

        {/* ===== CONTENT ===== */}
        <div className={styles.content}>
          <h2 className={styles.title}>{item.name}</h2>
          <p className={styles.description}>{item.description}</p>

          {/* ===== SIZE OPTIONS ===== */}
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

          {/* ===== EXTRAS ===== */}
          {item.extras && item.extras.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Tilbehør</h4>
              <div className={styles.extrasGrid}>
                {item.extras.map((extra) => (
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
                      +{extra.price} kr.
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ===== QUANTITY & ADD BUTTON ===== */}
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
              Tilføj til ordre · {totalPrice} kr.
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
