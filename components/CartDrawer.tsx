"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Plus, Minus, ShoppingBag, Store, Truck } from "lucide-react";

import { useCart } from "@/context/CartContext";
import { menuData, type MenuItem, type Extra } from "@/data/menu";
import ItemModal, { type SizeOption } from "./ItemModal";
import styles from "./CartDrawer.module.css";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
}: CartDrawerProps) {
  const {
    items,
    removeItem,
    updateQuantity,
    totalItems,

    deliveryMethod,
    setDeliveryMethod,

    bagIncluded,
    setBagIncluded,

    subtotal,
    bagFee,
    serviceFee,
    deliveryFee,
    totalPrice,
  } = useCart();

  const [editingCartId, setEditingCartId] = useState<string | null>(
    null,
  );

  const [editingItem, setEditingItem] =
    useState<MenuItem | null>(null);

  const [initialExtras, setInitialExtras] = useState<Extra[]>([]);
  const [initialSize, setInitialSize] =
    useState<SizeOption>("normal");

  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!isOpen) return null;

  const formatPrice = (price: number) => {
    return `${price.toFixed(2)} kr.`;
  };

  const handleItemClick = (
    cartItem: (typeof items)[number],
  ) => {
    const originalItem = menuData.find(
      (menuItem) => menuItem.id === cartItem.id,
    );

    if (!originalItem) return;

    let sizeOption: SizeOption = "normal";

    if (cartItem.deepPan || cartItem.size === "deepPan") {
      sizeOption = "deepPan";
    } else if (cartItem.size === "family") {
      sizeOption = "family";
    } else if (cartItem.size === "children") {
      sizeOption = "children";
    }

    setEditingCartId(cartItem.cartId);
    setEditingItem(originalItem);
    setInitialExtras(cartItem.extras ?? []);
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
      <div
        className={styles.overlay}
        onClick={onClose}
        role="presentation"
      >
        <aside
          className={styles.drawer}
          onClick={(event) => event.stopPropagation()}
          aria-label="Indkøbskurv"
        >
          <header className={styles.header}>
            <div>
              <span className={styles.eyebrow}>Din ordre</span>

              <h2 className={styles.title}>
                Indkøbskurv
                <span className={styles.itemCount}>
                  {totalItems}
                </span>
              </h2>
            </div>

            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Luk indkøbskurv"
            >
              <X size={22} />
            </button>
          </header>

          <div className={styles.body}>
            {items.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyImage}>
                  <Image
                    src="/images/cat.png"
                    alt="Tom indkøbskurv"
                    width={220}
                    height={320}
                    priority
                  />
                </div>

                <div className={styles.emptyText}>
                  <h3>Din kurv er tom</h3>
                  <p>
                    Tilføj noget fra menuen, så vi har noget at
                    arbejde med.
                  </p>
                </div>

                <Link
                  href="/menu"
                  onClick={onClose}
                  className={styles.backToShopBtn}
                >
                  Se menuen
                </Link>
              </div>
            ) : (
              <>
                <section
                  className={styles.deliverySection}
                  aria-labelledby="delivery-method-title"
                >
                  <div className={styles.sectionHeading}>
                    <span
                      className={styles.sectionStep}
                      aria-hidden="true"
                    >
                      1
                    </span>

                    <div>
                      <h3 id="delivery-method-title">
                        Hvordan vil du have ordren?
                      </h3>

                      <p>Vælg afhentning eller levering.</p>
                    </div>
                  </div>

                  <div className={styles.methodGrid}>
                    <button
                      type="button"
                      className={`${styles.methodButton} ${
                        deliveryMethod === "pickup"
                          ? styles.methodButtonActive
                          : ""
                      }`}
                      onClick={() =>
                        setDeliveryMethod("pickup")
                      }
                      aria-pressed={deliveryMethod === "pickup"}
                    >
                      <span className={styles.methodIcon}>
                        <Store size={21} />
                      </span>

                      <span className={styles.methodText}>
                        <strong>Afhentning</strong>
                        <small>Hent i restauranten</small>
                      </span>

                      <span className={styles.radioMark}>
                        <span />
                      </span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.methodButton} ${
                        deliveryMethod === "delivery"
                          ? styles.methodButtonActive
                          : ""
                      }`}
                      onClick={() =>
                        setDeliveryMethod("delivery")
                      }
                      aria-pressed={deliveryMethod === "delivery"}
                    >
                      <span className={styles.methodIcon}>
                        <Truck size={21} />
                      </span>

                      <span className={styles.methodText}>
                        <strong>Levering</strong>
                        <small>Inden for 10 km</small>
                      </span>

                      <span className={styles.radioMark}>
                        <span />
                      </span>
                    </button>
                  </div>

                  {deliveryMethod === "delivery" && (
                    <div className={styles.deliveryNotice}>
                      <Truck size={16} />

                      <span>
                        Fast leveringspris på{" "}
                        <strong>
                          {formatPrice(deliveryFee)}
                        </strong>
                        . Adressen kontrolleres ved checkout.
                      </span>
                    </div>
                  )}
                </section>

                <section
                  className={styles.cartSection}
                  aria-labelledby="cart-items-title"
                >
                  <div className={styles.sectionHeading}>
                    <span
                      className={styles.sectionStep}
                      aria-hidden="true"
                    >
                      2
                    </span>

                    <div>
                      <h3 id="cart-items-title">Din bestilling</h3>
                      <p>{totalItems} varer i kurven.</p>
                    </div>
                  </div>

                  <ul className={styles.list}>
                    {items.map((item) => {
                      const proteinChoice = item.extras?.find(
                        (extra) =>
                          extra.groupId ===
                            "proteinChoice" ||
                          extra.groupId ===
                            "nachosProtein",
                      );

                      const paidExtras =
                        item.extras?.filter(
                          (extra) =>
                            extra.groupId !==
                              "proteinChoice" &&
                            extra.groupId !==
                              "nachosProtein",
                        ) ?? [];

                      const itemSizeLabel =
                        item.size === "family"
                          ? "Familie"
                          : item.size === "children"
                            ? "Børn"
                            : item.deepPan ||
                                item.size === "deepPan"
                              ? "Deep Pan"
                              : item.size
                                ? "Almindelig"
                                : null;

                      return (
                        <li
                          key={item.cartId}
                          className={styles.item}
                        >
                          <button
                            type="button"
                            className={styles.itemEditArea}
                            onClick={() =>
                              handleItemClick(item)
                            }
                            aria-label={`Rediger ${item.name}`}
                          >
                            <div className={styles.itemMain}>
                              <div
                                className={styles.itemHeader}
                              >
                                <div
                                  className={
                                    styles.itemTitleRow
                                  }
                                >
                                  <h4
                                    className={styles.itemName}
                                  >
                                    {item.name}
                                  </h4>

                                  {proteinChoice && (
                                    <span
                                      className={
                                        styles.proteinLabel
                                      }
                                    >
                                      {proteinChoice.name}
                                    </span>
                                  )}
                                </div>

                                <span
                                  className={styles.itemPrice}
                                >
                                  {formatPrice(
                                    item.price *
                                      item.quantity,
                                  )}
                                </span>
                              </div>

                              <div className={styles.itemMeta}>
                                {itemSizeLabel && (
                                  <span
                                    className={styles.itemSize}
                                  >
                                    {itemSizeLabel}
                                  </span>
                                )}

                                <span
                                  className={styles.itemQty}
                                >
                                  {item.quantity} stk.
                                </span>
                              </div>

                              {paidExtras.length > 0 && (
                                <div
                                  className={
                                    styles.extrasColumn
                                  }
                                >
                                  {paidExtras.map(
                                    (extra, index) => (
                                      <span
                                        key={`${item.cartId}-${extra.name}-${index}`}
                                        className={
                                          styles.extraItem
                                        }
                                      >
                                        <Plus
                                          size={12}
                                          aria-hidden="true"
                                        />

                                        <span>
                                          {extra.name}
                                        </span>

                                        {extra.price > 0 && (
                                          <small>
                                            (
                                            {formatPrice(
                                              extra.price,
                                            )}
                                            )
                                          </small>
                                        )}
                                      </span>
                                    ),
                                  )}
                                </div>
                              )}
                            </div>
                          </button>

                          <div className={styles.actions}>
                            <div
                              className={
                                styles.quantityControl
                              }
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item.cartId,
                                    item.quantity - 1,
                                  )
                                }
                                aria-label={`Reducer antal af ${item.name}`}
                              >
                                <Minus size={15} />
                              </button>

                              <span
                                className={styles.qtyNumber}
                              >
                                {item.quantity}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  updateQuantity(
                                    item.cartId,
                                    item.quantity + 1,
                                  )
                                }
                                aria-label={`Forøg antal af ${item.name}`}
                              >
                                <Plus size={15} />
                              </button>
                            </div>

                            <button
                              type="button"
                              className={styles.removeBtn}
                              onClick={() =>
                                removeItem(item.cartId)
                              }
                              aria-label={`Fjern ${item.name}`}
                            >
                              <X size={16} />
                              <span>Fjern</span>
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <footer className={styles.footer}>
                  <div className={styles.bagCard}>
                    <div className={styles.bagInfo}>
                      <span className={styles.bagIcon}>
                        <ShoppingBag size={19} />
                      </span>

                      <div>
                        <strong>Bærepose</strong>
                        <small>
                          Praktisk emballage til ordren
                        </small>
                      </div>
                    </div>

                    {bagIncluded ? (
                      <div className={styles.bagAction}>
                        <span>{formatPrice(bagFee)}</span>

                        <button
                          type="button"
                          onClick={() =>
                            setBagIncluded(false)
                          }
                        >
                          Fjern
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={styles.addBagButton}
                        onClick={() =>
                          setBagIncluded(true)
                        }
                      >
                        Tilføj
                      </button>
                    )}
                  </div>

                  <div className={styles.summary}>
                    <div className={styles.summaryRow}>
                      <span>Varer</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>

                    <div className={styles.summaryRow}>
                      <span>Servicegebyr</span>
                      <span>
                        {formatPrice(serviceFee)}
                      </span>
                    </div>

                    {deliveryMethod === "delivery" && (
                      <div className={styles.summaryRow}>
                        <span>Levering</span>
                        <span>
                          {formatPrice(deliveryFee)}
                        </span>
                      </div>
                    )}

                    {bagIncluded && (
                      <div className={styles.summaryRow}>
                        <span>Bærepose</span>
                        <span>{formatPrice(bagFee)}</span>
                      </div>
                    )}

                    <div className={styles.totalRow}>
                      <div>
                        <span>I alt</span>
                        <small>Inkl. gebyrer</small>
                      </div>

                      <strong>
                        {formatPrice(totalPrice)}
                      </strong>
                    </div>
                  </div>

                  <Link
                    href="/checkout"
                    className={styles.checkoutButton}
                    onClick={onClose}
                  >
                    <span>Gå til kassen</span>
                    <strong>
                      {formatPrice(totalPrice)}
                    </strong>
                  </Link>

                  <Link
                    href="/menu"
                    className={styles.backToMenuBtn}
                    onClick={onClose}
                  >
                    <span aria-hidden="true">←</span>
                    Fortsæt med at handle
                  </Link>
                </footer>
              </>
            )}
          </div>
        </aside>
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