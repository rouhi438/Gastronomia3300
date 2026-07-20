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

  // ===== محاسبه‌ی قیمت اکستراها با توجه به سایز =====
  const extrasTotal = selectedExtras.reduce((sum, extra) => {
    // اگر سایز Family است، قیمت اکسترا دو برابر شود
    const price = selectedSize === "family" ? extra.price * 2 : extra.price;
    return sum + price;
  }, 0);

  const sizePrice = sizePriceMap[selectedSize] || 0;
  const totalPrice = (sizePrice + extrasTotal) * quantity;

  const handleAddToCart = () => {
    // محاسبه مجدد برای اطمینان
    const finalExtrasPrice = selectedExtras.reduce((sum, extra) => {
      const price = selectedSize === "family" ? extra.price * 2 : extra.price;
      return sum + price;
    }, 0);
    const finalPrice = sizePrice + finalExtrasPrice;

    addItem({
      id: item.id,
      name: item.name,
      price: finalPrice,
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
        <div className={styles.modalHeader}>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* ===== SCROLLABLE BODY ===== */}
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

          {/* ===== STICKY TITLE ===== */}
          <h2 className={styles.stickyTitle}>{item.name}</h2>

          {/* Description & Price */}
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

          {/* Quantity & Add Button */}
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
