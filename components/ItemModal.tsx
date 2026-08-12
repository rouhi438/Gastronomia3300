"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Minus, Pizza, Plus, X } from "lucide-react";

import type { Extra, MenuItem } from "@/data/menu";

import { extraGroups } from "@/data/menu";

import { useCart } from "@/context/CartContext";

import styles from "./ItemModal.module.css";

export type SizeOption = "normal" | "family" | "children" | "deepPan";

type ExtraGroupId = keyof typeof extraGroups;

type AvailabilityStatus = "active" | "until_next_opening" | "manual_off";

export type MenuOptionStatusRecord = {
  menu_item_id: number;
  option_key: string;
  status: AvailabilityStatus;
  available_again_at: string | null;
  updated_at?: string;
};

interface ItemModalProps {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
  initialExtras?: Extra[];
  initialSize?: SizeOption;
  editingCartId?: string | null;
  optionStatuses?: MenuOptionStatusRecord[];
}

const RADIO_GROUP_IDS: ExtraGroupId[] = [
  "proteinChoice",
  "nachosProtein",
  "drinkSizes",
  "cocaColaSizes",
  "faxeKondiSizes",
  "pizzaSaladProteinChoice",
];
const DRINK_OPTION_GROUP_IDS: ExtraGroupId[] = [
  "drinkSizes",
  "cocaColaSizes",
  "faxeKondiSizes",
];

const EMPTY_EXTRAS: Extra[] = [];

const EMPTY_OPTION_STATUSES: MenuOptionStatusRecord[] = [];

const getExtraKey = (extra: Extra, groupId: ExtraGroupId) =>
  `${groupId}:${extra.name}`;

const optionNameToKey = (name: string) =>
  name.toLowerCase().replace(/\s+/g, "");

function formatAvailableAgain(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("da-DK", {
    timeZone: "Europe/Copenhagen",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isAvailabilityUnavailable(status: MenuOptionStatusRecord | undefined) {
  if (!status) {
    return false;
  }

  if (status.status === "manual_off") {
    return true;
  }

  if (status.status === "until_next_opening" && status.available_again_at) {
    return new Date(status.available_again_at).getTime() > Date.now();
  }

  return false;
}

export default function ItemModal({
  item,
  isOpen,
  onClose,
  initialExtras = EMPTY_EXTRAS,
  initialSize = "normal",
  editingCartId = null,
  optionStatuses = EMPTY_OPTION_STATUSES,
}: ItemModalProps) {
  const { addItem, updateItem } = useCart();

  const [selectedSize, setSelectedSize] = useState<SizeOption>(initialSize);

  const [selectedExtras, setSelectedExtras] = useState<Extra[]>(initialExtras);

  const [quantity, setQuantity] = useState(1);

  const previousExtrasRef = useRef<Extra[]>(initialExtras);

  const previousSizeRef = useRef<SizeOption>(initialSize);

  const extraGroupIds = useMemo<ExtraGroupId[]>(() => {
    if (!item) {
      return [];
    }

    const groupIds =
      item.extraGroupIds && item.extraGroupIds.length > 0
        ? item.extraGroupIds
        : [item.extraGroupId];

    return [...new Set(groupIds)];
  }, [item]);

  const hasExtraGroup = (groupId: ExtraGroupId) =>
    extraGroupIds.includes(groupId);

  const isRadioExtraGroup = (groupId: ExtraGroupId) =>
    RADIO_GROUP_IDS.includes(groupId);

  const normalizeInitialExtras = (
    extras: Extra[],
    groupIds: ExtraGroupId[],
  ): Extra[] => {
    return extras.map((extra) => {
      if (extra.groupId) {
        return extra;
      }

      const matchingGroupId = groupIds.find((groupId) =>
        extraGroups[groupId].some(
          (groupExtra) => groupExtra.name === extra.name,
        ),
      );

      return {
        ...extra,
        groupId: matchingGroupId,
      };
    });
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const sizeChanged = previousSizeRef.current !== initialSize;

    const extrasChanged =
      JSON.stringify(previousExtrasRef.current) !==
      JSON.stringify(initialExtras);

    if (sizeChanged) {
      setSelectedSize(initialSize);

      previousSizeRef.current = initialSize;
    }

    if (extrasChanged || editingCartId) {
      const normalizedExtras = normalizeInitialExtras(
        initialExtras,
        extraGroupIds,
      );

      setSelectedExtras(normalizedExtras);

      previousExtrasRef.current = initialExtras;
    }

    setQuantity(1);
  }, [isOpen, initialSize, initialExtras, editingCartId, extraGroupIds]);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setSelectedSize("normal");
    setSelectedExtras([]);
    setQuantity(1);

    previousSizeRef.current = "normal";

    previousExtrasRef.current = [];
  }, [isOpen]);

  if (!isOpen || !item) {
    return null;
  }

  const sizePriceMap: Record<SizeOption, number> = {
    normal: item.prices.normal ?? item.prices.fixed ?? 0,

    family: item.prices.family ?? 0,

    children: item.prices.children ?? 0,

    deepPan: (item.prices.normal ?? 0) + (item.deepPanExtra ?? 0),
  };

  const getSizeLabel = (size: SizeOption) => {
    switch (size) {
      case "normal":
        return "Almindelig";

      case "family": {
        const difference =
          (item.prices.family ?? 0) - (item.prices.normal ?? 0);

        return `Familie (+${difference} kr.)`;
      }

      case "children":
        return `Børn (${item.prices.children ?? 0} kr.)`;

      case "deepPan":
        return `Deep Pan (+${item.deepPanExtra ?? 0} kr.)`;

      default:
        return "";
    }
  };

  const getGroupTitle = (groupId: ExtraGroupId) => {
    switch (groupId) {
      case "proteinChoice":
      case "nachosProtein":
      case "pizzaSaladProteinChoice":
        return "Vælg protein";

      case "pizza":
        return "Pizza tilbehør";

      case "fries":
        return "Saucer";

      case "drinkSizes":
        return "Vælg størrelse";

      case "cocaColaSizes":
      case "faxeKondiSizes":
        return "Vælg variant og størrelse";

      default:
        return "Tilbehør";
    }
  };

  const getOptionAvailability = (extra: Extra, groupId: ExtraGroupId) => {
    if (!DRINK_OPTION_GROUP_IDS.includes(groupId)) {
      return undefined;
    }

    const optionKey = optionNameToKey(extra.name);

    return optionStatuses.find(
      (status) =>
        status.menu_item_id === item.id && status.option_key === optionKey,
    );
  };

  const isExtraUnavailable = (extra: Extra, groupId: ExtraGroupId) => {
    const availability = getOptionAvailability(extra, groupId);

    return isAvailabilityUnavailable(availability);
  };

  const isExtraSelected = (extra: Extra, groupId: ExtraGroupId) => {
    const targetKey = getExtraKey(extra, groupId);

    return selectedExtras.some((selectedExtra) => {
      const selectedGroupId = selectedExtra.groupId ?? groupId;

      return getExtraKey(selectedExtra, selectedGroupId) === targetKey;
    });
  };

  const toggleExtra = (extra: Extra, groupId: ExtraGroupId) => {
    if (isExtraUnavailable(extra, groupId)) {
      return;
    }

    const selectedExtra: Extra = {
      ...extra,
      groupId,
    };

    setSelectedExtras((previousExtras) => {
      const extraKey = getExtraKey(extra, groupId);

      const alreadySelected = previousExtras.some((previousExtra) => {
        const previousGroupId = previousExtra.groupId ?? groupId;

        return getExtraKey(previousExtra, previousGroupId) === extraKey;
      });

      if (isRadioExtraGroup(groupId)) {
        if (alreadySelected) {
          return previousExtras;
        }

        const extrasOutsideCurrentGroup = previousExtras.filter(
          (previousExtra) => previousExtra.groupId !== groupId,
        );

        return [...extrasOutsideCurrentGroup, selectedExtra];
      }

      if (alreadySelected) {
        return previousExtras.filter((previousExtra) => {
          const previousGroupId = previousExtra.groupId ?? groupId;

          return getExtraKey(previousExtra, previousGroupId) !== extraKey;
        });
      }

      return [...previousExtras, selectedExtra];
    });
  };

  const getExtraPrice = (extra: Extra) => {
    if (selectedSize === "family") {
      return extra.price * 2;
    }

    return extra.price;
  };

  const extrasTotal = selectedExtras.reduce(
    (total, extra) => total + getExtraPrice(extra),
    0,
  );

  const sizePrice = sizePriceMap[selectedSize] ?? 0;

  const totalPrice = (sizePrice + extrasTotal) * quantity;

  const hasSizeOptions =
    item.prices.normal !== undefined || hasExtraGroup("drinkSizes");

  const availableSizes: SizeOption[] = [];

  if (item.prices.normal !== undefined) {
    availableSizes.push("normal");

    if (item.prices.family !== undefined) {
      availableSizes.push("family");
    }

    if (item.prices.children !== undefined) {
      availableSizes.push("children");
    }

    if (item.deepPanExtra !== undefined && item.deepPanExtra > 0) {
      availableSizes.push("deepPan");
    }
  }

  const requiredRadioGroupIds = extraGroupIds.filter((groupId) => {
    const groupExtras = extraGroups[groupId];

    return (
      isRadioExtraGroup(groupId) &&
      Array.isArray(groupExtras) &&
      groupExtras.length > 0
    );
  });

  const missingRequiredGroupIds = requiredRadioGroupIds.filter((groupId) => {
    return !selectedExtras.some((selectedExtra) => {
      if (selectedExtra.groupId !== groupId) {
        return false;
      }

      return !isExtraUnavailable(selectedExtra, groupId);
    });
  });

  const activeDrinkOptionGroupId = extraGroupIds.find((groupId) =>
    DRINK_OPTION_GROUP_IDS.includes(groupId),
  );

  const allDrinkOptionsUnavailable =
    activeDrinkOptionGroupId !== undefined &&
    extraGroups[activeDrinkOptionGroupId].every((extra) =>
      isExtraUnavailable(extra, activeDrinkOptionGroupId),
    );

  const canAddToCart =
    missingRequiredGroupIds.length === 0 && !allDrinkOptionsUnavailable;

  const firstMissingGroup = missingRequiredGroupIds[0];

  let addButtonLabel = editingCartId ? "Opdater ordre" : "Tilføj til ordre";

  if (allDrinkOptionsUnavailable) {
    addButtonLabel = "Udsolgt";
  } else if (firstMissingGroup === "drinkSizes") {
    addButtonLabel = "Vælg størrelse";
  } else if (
    firstMissingGroup === "cocaColaSizes" ||
    firstMissingGroup === "faxeKondiSizes"
  ) {
    addButtonLabel = "Vælg variant og størrelse";
  } else if (
    firstMissingGroup === "proteinChoice" ||
    firstMissingGroup === "nachosProtein" ||
    firstMissingGroup === "pizzaSaladProteinChoice"
  ) {
    addButtonLabel = "Vælg protein";
  } else if (firstMissingGroup) {
    addButtonLabel = "Foretag påkrævet valg";
  }

  const handleAddToCart = () => {
    if (!canAddToCart) {
      return;
    }

    const finalExtrasPrice = selectedExtras.reduce(
      (total, extra) => total + getExtraPrice(extra),
      0,
    );

    const finalPrice = sizePrice + finalExtrasPrice;

    if (finalPrice <= 0) {
      return;
    }

    const payload = {
      id: item.id,
      name: item.name,
      price: finalPrice,
      quantity,
      size: selectedSize,
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

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Luk"
          >
            <X size={24} />
          </button>
        </div>

        <div className={styles.modalBody}>
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

          <h2 className={styles.stickyTitle}>{item.name}</h2>

          <div className={styles.section}>
            <p className={styles.description}>{item.description}</p>
          </div>

          {hasSizeOptions && availableSizes.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Størrelse</h4>

              <div className={styles.sizeOptions}>
                {availableSizes.map((size) => {
                  const price = sizePriceMap[size];

                  if (!price) {
                    return null;
                  }

                  return (
                    <button
                      type="button"
                      key={size}
                      className={`${styles.sizeBtn} ${
                        selectedSize === size ? styles.active : ""
                      }`}
                      onClick={() => setSelectedSize(size)}
                    >
                      <span>{getSizeLabel(size)}</span>

                      <span className={styles.sizePrice}>{price} kr.</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {extraGroupIds.map((groupId) => {
            const groupExtras = extraGroups[groupId];

            const isRadio = isRadioExtraGroup(groupId);

            if (!groupExtras || groupExtras.length === 0) {
              return null;
            }

            return (
              <div key={groupId} className={styles.section}>
                <h4 className={styles.sectionTitle}>
                  {getGroupTitle(groupId)}
                </h4>

                <div className={styles.extrasGrid}>
                  {groupExtras.map((extra) => {
                    const displayPrice = getExtraPrice(extra);

                    const selected = isExtraSelected(extra, groupId);

                    const availability = getOptionAvailability(extra, groupId);

                    const unavailable = isAvailabilityUnavailable(availability);

                    return (
                      <label
                        key={`${groupId}-${extra.name}`}
                        className={styles.extraItem}
                        style={
                          unavailable
                            ? {
                                opacity: 0.5,
                                cursor: "not-allowed",
                              }
                            : undefined
                        }
                      >
                        <input
                          type={isRadio ? "radio" : "checkbox"}
                          name={isRadio ? `extra-${groupId}` : undefined}
                          checked={selected}
                          disabled={unavailable}
                          onChange={() => toggleExtra(extra, groupId)}
                        />

                        <span>{extra.name}</span>

                        {unavailable ? (
                          <span
                            style={{
                              marginLeft: "auto",
                              color: "var(--red)",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              textAlign: "right",
                            }}
                          >
                            {availability?.status === "until_next_opening" &&
                            availability.available_again_at
                              ? `Udsolgt indtil ${formatAvailableAgain(
                                  availability.available_again_at,
                                )}`
                              : "Udsolgt"}
                          </span>
                        ) : (
                          <span className={styles.extraPrice}>
                            {displayPrice > 0
                              ? `+${displayPrice} kr.`
                              : "Inkluderet"}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className={styles.footer}>
            <div className={styles.quantity}>
              <button
                type="button"
                className={styles.qtyBtn}
                onClick={() =>
                  setQuantity((current) => Math.max(1, current - 1))
                }
                aria-label="Reducer antal"
              >
                <Minus size={18} />
              </button>

              <span className={styles.qtyNumber}>{quantity}</span>

              <button
                type="button"
                className={styles.qtyBtn}
                onClick={() => setQuantity((current) => current + 1)}
                aria-label="Forøg antal"
              >
                <Plus size={18} />
              </button>
            </div>

            <button
              type="button"
              className={styles.addBtn}
              onClick={handleAddToCart}
              disabled={!canAddToCart}
              style={
                !canAddToCart
                  ? {
                      opacity: 0.55,
                      cursor: "not-allowed",
                    }
                  : undefined
              }
            >
              {canAddToCart ? (
                <>
                  {addButtonLabel} · {totalPrice} kr.
                </>
              ) : (
                addButtonLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
