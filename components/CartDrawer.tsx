"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Check,
  LogIn,
  Minus,
  Clock3,
  Plus,
  ShoppingBag,
  Store,
  Truck,
  UserRound,
  X,
} from "lucide-react";

import { useCart } from "@/context/CartContext";
import { menuData, type Extra, type MenuItem } from "@/data/menu";
import { createClient } from "@/lib/supabase/client";

import AddressAutocomplete from "./AddressAutocomplete";
import ItemModal, { type SizeOption } from "./ItemModal";
import { MIN_DELIVERY_TOTAL } from "@/lib/orders/constants";
import {
  MAX_DELIVERY_DISTANCE_KM,
  validateDeliveryDistance,
} from "@/lib/delivery";
import styles from "./CartDrawer.module.css";

const supabase = createClient();
interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type DrawerStep = "cart" | "details";

interface CustomerDetails {
  name: string;
  phone: string;
  email: string;
}

type ServiceType = "pickup" | "delivery";

type ServiceStatus = {
  serviceType: ServiceType;
  status: "open" | "preorder" | "paused" | "closed";

  canOrder: boolean;
  canOrderAsap: boolean;
  canSchedule: boolean;

  message: string;

  preorderStart: string;
  openingTime: string;
  closingTime: string;
  firstScheduledTime: string;
  lastScheduledTime: string;
  slotIntervalMinutes: number;
};

type ServiceStatuses = Record<ServiceType, ServiceStatus>;

const EMPTY_CUSTOMER_DETAILS: CustomerDetails = {
  name: "",
  phone: "",
  email: "",
};

const CUSTOMER_STORAGE_KEY = "checkout-customer-details";
const ORDER_NOTE_STORAGE_KEY = "checkout-order-note";

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);

  return hours * 60 + minutes;
}

function getCopenhagenCurrentMinutes(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Copenhagen",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === "hour")?.value);

  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return 0;
  }

  return hour * 60 + minute;
}

function buildTimeAvailability(serviceStatus: ServiceStatus | null) {
  if (!serviceStatus) {
    return {
      isScheduledSelectionOpen: false,
      isAsapAvailable: false,
      times: [] as string[],
    };
  }

  const isAsapAvailable = serviceStatus.canOrderAsap;

  if (!serviceStatus.canSchedule) {
    return {
      isScheduledSelectionOpen: false,
      isAsapAvailable,
      times: [] as string[],
    };
  }

  const firstScheduledMinutes = timeToMinutes(serviceStatus.firstScheduledTime);

  const lastScheduledMinutes = timeToMinutes(serviceStatus.lastScheduledTime);

  const interval = serviceStatus.slotIntervalMinutes;

  let firstAvailableMinutes = firstScheduledMinutes;

  if (serviceStatus.status === "open") {
    const currentMinutes = getCopenhagenCurrentMinutes();

    while (firstAvailableMinutes <= currentMinutes) {
      firstAvailableMinutes += interval;
    }
  }

  const times: string[] = [];

  for (
    let minutes = firstAvailableMinutes;
    minutes <= lastScheduledMinutes;
    minutes += interval
  ) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    times.push(
      `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`,
    );
  }

  return {
    isScheduledSelectionOpen: true,
    isAsapAvailable,
    times,
  };
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const {
    items,
    removeItem,
    updateQuantity,
    totalItems,

    deliveryMethod,
    setDeliveryMethod,

    deliveryAddress,
    setDeliveryAddress,

    bagIncluded,
    setBagIncluded,

    requestedTime,
    setRequestedTime,

    subtotal,
    bagFee,
    serviceFee,
    deliveryFee,
    totalPrice,
  } = useCart();

  const [step, setStep] = useState<DrawerStep>("cart");

  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>(
    EMPTY_CUSTOMER_DETAILS,
  );

  const [orderNote, setOrderNote] = useState("");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInLabel, setLoggedInLabel] = useState("");
  const [hasLoadedCustomer, setHasLoadedCustomer] = useState(false);

  const [formError, setFormError] = useState("");
  const [minimumOrderError, setMinimumOrderError] = useState("");

  const [serviceStatuses, setServiceStatuses] =
    useState<ServiceStatuses | null>(null);

  const selectedServiceStatus = serviceStatuses?.[deliveryMethod] ?? null;

  const [editingCartId, setEditingCartId] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [initialExtras, setInitialExtras] = useState<Extra[]>([]);

  const [initialSize, setInitialSize] = useState<SizeOption>("normal");

  const [isModalOpen, setIsModalOpen] = useState(false);

  // add time to choosing from user

  const timeAvailability = useMemo(
    () => buildTimeAvailability(selectedServiceStatus),
    [selectedServiceStatus],
  );

  const availableTimes = timeAvailability.times;
  const isAsapAvailable = timeAvailability.isAsapAvailable;

  useEffect(() => {
    if (!isOpen) return;

    const firstAvailableTime = availableTimes[0];

    if (!isAsapAvailable && requestedTime === "asap" && firstAvailableTime) {
      setRequestedTime(firstAvailableTime);
      return;
    }

    if (requestedTime !== "asap" && !availableTimes.includes(requestedTime)) {
      if (isAsapAvailable) {
        setRequestedTime("asap");
        return;
      }

      if (firstAvailableTime) {
        setRequestedTime(firstAvailableTime);
      }
    }
  }, [
    isOpen,
    requestedTime,
    availableTimes,
    isAsapAvailable,
    setRequestedTime,
  ]);

  useEffect(() => {
    const storedCustomer = localStorage.getItem(CUSTOMER_STORAGE_KEY);

    const storedOrderNote = localStorage.getItem(ORDER_NOTE_STORAGE_KEY);

    if (storedCustomer) {
      try {
        const parsed = JSON.parse(storedCustomer) as Partial<CustomerDetails>;

        setCustomerDetails({
          name: typeof parsed.name === "string" ? parsed.name : "",
          phone: typeof parsed.phone === "string" ? parsed.phone : "",
          email: typeof parsed.email === "string" ? parsed.email : "",
        });
      } catch {
        localStorage.removeItem(CUSTOMER_STORAGE_KEY);
      }
    }

    if (storedOrderNote) {
      setOrderNote(storedOrderNote);
    }

    setHasLoadedCustomer(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedCustomer) return;

    localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customerDetails));
  }, [customerDetails, hasLoadedCustomer]);

  useEffect(() => {
    if (!hasLoadedCustomer) return;

    localStorage.setItem(ORDER_NOTE_STORAGE_KEY, orderNote);
  }, [orderNote, hasLoadedCustomer]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    const applyUserToCustomerForm = async (user: User) => {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (profileError) {
        console.error("Failed to load checkout profile:", profileError.message);
      }

      const metadata = user.user_metadata ?? {};

      const providerName =
        getString(metadata.full_name) ||
        getString(metadata.name) ||
        [getString(metadata.first_name), getString(metadata.last_name)]
          .filter(Boolean)
          .join(" ");

      const providerPhone =
        getString(metadata.phone_number) ||
        getString(metadata.phone) ||
        user.phone ||
        "";

      const profileName = getString(profile?.full_name);
      const profilePhone = getString(profile?.phone);

      const resolvedName = profileName || providerName;
      const resolvedPhone = profilePhone || providerPhone;

      setIsLoggedIn(true);
      setLoggedInLabel(resolvedName || user.email || "bruger");

      setCustomerDetails((current) => ({
        name: resolvedName || current.name,
        phone: resolvedPhone || current.phone,
        email: user.email || current.email,
      }));
    };

    const loadCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (!user) {
        setIsLoggedIn(false);
        setLoggedInLabel("");
        return;
      }

      await applyUserToCustomerForm(user);
    };

    void loadCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;

      if (!user) {
        setIsLoggedIn(false);
        setLoggedInLabel("");
        return;
      }

      window.setTimeout(() => {
        void applyUserToCustomerForm(user);
      }, 0);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setStep("cart");
      setFormError("");
    }
  }, [isOpen]);

  const deliveryDistance = useMemo(() => {
    if (
      deliveryMethod !== "delivery" ||
      deliveryAddress.latitude === null ||
      deliveryAddress.longitude === null
    ) {
      return null;
    }

    return validateDeliveryDistance({
      latitude: deliveryAddress.latitude,
      longitude: deliveryAddress.longitude,
    });
  }, [deliveryAddress.latitude, deliveryAddress.longitude, deliveryMethod]);

  const canSubmit = useMemo(() => {
    if (!selectedServiceStatus?.canOrder) return false;

    if (!customerDetails.name.trim()) return false;
    if (!customerDetails.phone.trim()) return false;

    if (deliveryMethod === "delivery") {
      return Boolean(
        deliveryAddress.addressLine1 &&
        deliveryAddress.postalCode &&
        deliveryAddress.city &&
        deliveryAddress.placeId &&
        deliveryAddress.latitude !== null &&
        deliveryAddress.longitude !== null &&
        deliveryDistance?.isWithinDeliveryArea,
      );
    }

    return true;
  }, [
    customerDetails,
    deliveryAddress,
    deliveryMethod,
    deliveryDistance,
    selectedServiceStatus?.canOrder,
  ]);

  if (!isOpen) return null;

  const formatPrice = (price: number) => `${price.toFixed(2)} kr.`;

  const handleItemClick = (cartItem: (typeof items)[number]) => {
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

  const selectDeliveryMethod = async (method: "pickup" | "delivery") => {
    setFormError("");

    try {
      const response = await fetch("/api/store/service-status", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Could not load store service status.");
      }

      const statuses = (await response.json()) as ServiceStatuses;

      const selectedStatus = statuses[method];

      setRequestedTime(selectedStatus.canOrderAsap ? "asap" : "");

      setServiceStatuses(statuses);
      setDeliveryMethod(method);
      setStep("details");
    } catch (error) {
      console.error("Failed to load service status:", error);

      setServiceStatuses(null);
      setDeliveryMethod(method);
      setFormError("Kunne ikke hente restaurantens åbningstider.");
      setStep("details");
    }
  };

  const updateCustomerField = (field: keyof CustomerDetails, value: string) => {
    setFormError("");

    setCustomerDetails((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCheckout = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (deliveryMethod === "delivery" && totalPrice < MIN_DELIVERY_TOTAL) {
      setMinimumOrderError(
        `Minimumsbestilling for levering er ${MIN_DELIVERY_TOTAL} kr. Du mangler ${
          MIN_DELIVERY_TOTAL - totalPrice
        } kr.`,
      );

      return;
    }
    if (!customerDetails.name.trim()) {
      setFormError("Indtast dit navn.");
      return;
    }

    if (!customerDetails.phone.trim()) {
      setFormError("Indtast dit telefonnummer.");
      return;
    }

    if (deliveryMethod === "delivery" && !deliveryAddress.placeId) {
      setFormError("Vælg en adresse fra Googles adresseliste.");
      return;
    }

    if (
      deliveryMethod === "delivery" &&
      (!deliveryAddress.postalCode ||
        !deliveryAddress.city ||
        deliveryAddress.latitude === null ||
        deliveryAddress.longitude === null)
    ) {
      setFormError("Adressen mangler nødvendige oplysninger. Vælg den igen.");
      return;
    }

    if (
      deliveryMethod === "delivery" &&
      deliveryDistance &&
      !deliveryDistance.isWithinDeliveryArea
    ) {
      setFormError(
        `Leveringsadressen ligger uden for vores leveringsområde på ${MAX_DELIVERY_DISTANCE_KM} km.`,
      );

      return;
    }

    localStorage.setItem(
      "checkout-customer",
      JSON.stringify({
        name: customerDetails.name.trim(),
        phone: customerDetails.phone.trim(),
        email: customerDetails.email.trim(),
        orderNote: orderNote.trim(),
      }),
    );

    window.location.href = "/checkout";
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} role="presentation">
        <aside
          className={styles.drawer}
          onClick={(event) => event.stopPropagation()}
          aria-label="Indkøbskurv"
        >
          <header className={styles.header}>
            <div className={styles.headerContent}>
              {step === "details" && (
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => {
                    setStep("cart");
                    setFormError("");
                  }}
                  aria-label="Tilbage til indkøbskurven"
                >
                  <ArrowLeft size={19} />
                </button>
              )}

              <div>
                <span className={styles.eyebrow}>Din ordre</span>

                <h2 className={styles.title}>
                  {step === "cart" ? "Indkøbskurv" : "Dine oplysninger"}

                  <span className={styles.itemCount}>{totalItems}</span>
                </h2>
              </div>
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

          {items.length > 0 && (
            <div className={styles.progress}>
              <span
                className={`${styles.progressItem} ${
                  step === "cart"
                    ? styles.progressItemActive
                    : styles.progressItemDone
                }`}
              >
                <span>{step === "details" ? <Check size={12} /> : "1"}</span>
                Kurv
              </span>

              <span className={styles.progressLine} />

              <span
                className={`${styles.progressItem} ${
                  step === "details" ? styles.progressItemActive : ""
                }`}
              >
                <span>2</span>
                Oplysninger
              </span>

              <span className={styles.progressLine} />

              <span className={styles.progressItem}>
                <span>3</span>
                Betaling
              </span>
            </div>
          )}

          <div className={styles.body}>
            {items.length === 0 ? (
              <EmptyCart onClose={onClose} />
            ) : (
              <div
                className={`${styles.stepsTrack} ${
                  step === "details" ? styles.stepsTrackDetails : ""
                }`}
              >
                <div className={styles.stepPanel}>
                  <CartStep
                    items={items}
                    totalItems={totalItems}
                    bagIncluded={bagIncluded}
                    bagFee={bagFee}
                    serviceFee={serviceFee}
                    subtotal={subtotal}
                    deliveryFee={deliveryFee}
                    totalPrice={totalPrice}
                    orderNote={orderNote}
                    onOrderNoteChange={setOrderNote}
                    onEditItem={handleItemClick}
                    onRemoveItem={removeItem}
                    onUpdateQuantity={updateQuantity}
                    onToggleBag={() => setBagIncluded(!bagIncluded)}
                    onSelectMethod={selectDeliveryMethod}
                    formatPrice={formatPrice}
                  />
                </div>

                <div className={styles.stepPanel}>
                  <DetailsStep
                    deliveryMethod={deliveryMethod}
                    requestedTime={requestedTime}
                    availableTimes={availableTimes}
                    isAsapAvailable={isAsapAvailable}
                    deliveryDistance={deliveryDistance}
                    serviceStatusMessage={
                      selectedServiceStatus?.message ?? null
                    }
                    isScheduledSelectionOpen={
                      timeAvailability.isScheduledSelectionOpen
                    }
                    onRequestedTimeChange={setRequestedTime}
                    customerDetails={customerDetails}
                    deliveryAddress={deliveryAddress}
                    isLoggedIn={isLoggedIn}
                    loggedInLabel={loggedInLabel}
                    formError={formError}
                    canSubmit={canSubmit}
                    totalPrice={totalPrice}
                    onCustomerChange={updateCustomerField}
                    onAddressChange={setDeliveryAddress}
                    onSubmit={handleCheckout}
                    onBack={() => {
                      setStep("cart");
                      setFormError("");
                    }}
                    formatPrice={formatPrice}
                  />
                </div>
              </div>
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
      {minimumOrderError && (
        <div
          className={styles.minimumOrderOverlay}
          role="presentation"
          onClick={() => setMinimumOrderError("")}
        >
          <div
            className={styles.minimumOrderModal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="minimum-order-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="minimum-order-title">Minimumsbestilling</h2>

            <p>{minimumOrderError}</p>

            <button
              type="button"
              className={styles.minimumOrderButton}
              onClick={() => setMinimumOrderError("")}
            >
              Fortsæt med at bestille
            </button>
          </div>
        </div>
      )}
    </>
  );
}

interface EmptyCartProps {
  onClose: () => void;
}

function EmptyCart({ onClose }: EmptyCartProps) {
  return (
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

        <p>Tilføj noget fra menuen, så vi har noget at arbejde med.</p>
      </div>

      <Link href="/menu" onClick={onClose} className={styles.backToShopBtn}>
        Se menuen
      </Link>
    </div>
  );
}

interface CartStepProps {
  items: ReturnType<typeof useCart>["items"];
  totalItems: number;
  bagIncluded: boolean;
  bagFee: number;
  serviceFee: number;
  subtotal: number;
  deliveryFee: number;
  totalPrice: number;
  orderNote: string;

  onOrderNoteChange: (value: string) => void;
  onEditItem: (item: ReturnType<typeof useCart>["items"][number]) => void;
  onRemoveItem: (cartId: string) => void;
  onUpdateQuantity: (cartId: string, quantity: number) => void;
  onToggleBag: () => void;
  onSelectMethod: (method: "pickup" | "delivery") => void;
  formatPrice: (price: number) => string;
}

function CartStep({
  items,
  totalItems,
  bagIncluded,
  bagFee,
  serviceFee,
  subtotal,
  deliveryFee,
  totalPrice,
  orderNote,
  onOrderNoteChange,
  onEditItem,
  onRemoveItem,
  onUpdateQuantity,
  onToggleBag,
  onSelectMethod,
  formatPrice,
}: CartStepProps) {
  const primarySelectionGroupIds = [
    "proteinChoice",
    "nachosProtein",
    "pizzaSaladProteinChoice",
    "drinkSizes",
    "cocaColaSizes",
    "faxeKondiSizes",
  ] as const;

  return (
    <div className={styles.cartStep}>
      <section className={styles.cartSection}>
        <div className={styles.sectionHeading}>
          <div>
            <h3>Din bestilling</h3>
            <p>{totalItems} varer i kurven.</p>
          </div>
        </div>

        <ul className={styles.list}>
          {items.map((item) => {
            const menuItem = menuData.find((entry) => entry.id === item.id);
            const primarySelections =
              item.extras?.filter((extra) =>
                extra.groupId
                  ? primarySelectionGroupIds.includes(
                      extra.groupId as (typeof primarySelectionGroupIds)[number],
                    )
                  : false,
              ) ?? [];

            const paidExtras =
              item.extras?.filter((extra) => {
                if (!extra.groupId) {
                  return true;
                }

                return !primarySelectionGroupIds.includes(
                  extra.groupId as (typeof primarySelectionGroupIds)[number],
                );
              }) ?? [];

            const hasAlternativeSizeOptions =
              Boolean(menuItem?.prices.family ?? menuItem?.prices.children) ||
              (Boolean(menuItem?.deepPanExtra) &&
                (menuItem?.deepPanExtra ?? 0) > 0);

            const itemSizeLabel =
              item.size === "family"
                ? "Familie"
                : item.size === "children"
                  ? "Børn"
                  : item.deepPan || item.size === "deepPan"
                    ? "Deep Pan"
                    : item.size && hasAlternativeSizeOptions
                      ? "Almindelig"
                      : null;

            return (
              <li key={item.cartId} className={styles.item}>
                <button
                  type="button"
                  className={styles.itemEditArea}
                  onClick={() => onEditItem(item)}
                  aria-label={`Rediger ${item.name}`}
                >
                  <div className={styles.itemMain}>
                    <div className={styles.itemHeader}>
                      <div className={styles.itemTitleRow}>
                        <h4 className={styles.itemName}>{item.name}</h4>

                        {primarySelections.length > 0 && (
                          <div className={styles.variantBadges}>
                            {primarySelections.map((extra, index) => (
                              <span
                                key={`${item.cartId}-${extra.name}-${index}`}
                                className={styles.proteinLabel}
                              >
                                {extra.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <span className={styles.itemPrice}>
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>

                    <div className={styles.itemMeta}>
                      {itemSizeLabel && (
                        <span className={styles.itemSize}>{itemSizeLabel}</span>
                      )}

                      <span className={styles.itemQty}>
                        {item.quantity} stk.
                      </span>
                    </div>

                    {paidExtras.length > 0 && (
                      <div className={styles.extrasColumn}>
                        {paidExtras.map((extra, index) => {
                          const displayedExtraPrice =
                            item.size === "family"
                              ? extra.price * 2
                              : extra.price;

                          return (
                            <span
                              key={`${item.cartId}-${extra.name}-${index}`}
                              className={styles.extraItem}
                            >
                              <Plus size={12} aria-hidden="true" />

                              <span>{extra.name}</span>

                              {displayedExtraPrice > 0 && (
                                <small>
                                  ({formatPrice(displayedExtraPrice)})
                                </small>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </button>

                <div className={styles.actions}>
                  <div className={styles.quantityControl}>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateQuantity(item.cartId, item.quantity - 1)
                      }
                      aria-label={`Reducer antal af ${item.name}`}
                    >
                      <Minus size={15} />
                    </button>

                    <span className={styles.qtyNumber}>{item.quantity}</span>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdateQuantity(item.cartId, item.quantity + 1)
                      }
                      aria-label={`Forøg antal af ${item.name}`}
                    >
                      <Plus size={15} />
                    </button>
                  </div>

                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => onRemoveItem(item.cartId)}
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

      <section className={styles.noteSection}>
        <label htmlFor="order-note" className={styles.fieldLabel}>
          Kommentar til ordren
        </label>

        <textarea
          id="order-note"
          value={orderNote}
          maxLength={500}
          rows={3}
          className={styles.noteInput}
          placeholder="Fx: Ingen løg, allergi eller anden vigtig besked..."
          onChange={(event) => onOrderNoteChange(event.target.value)}
        />

        <div className={styles.noteMeta}>
          <small>
            Ekstra tilvalg skal bestilles via menuen – ikke i kommentaren.
          </small>

          <span>{orderNote.length}/500</span>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.bagCard}>
          <div className={styles.bagInfo}>
            <span className={styles.bagIcon}>
              <ShoppingBag size={19} />
            </span>

            <div>
              <strong>Bærepose</strong>
              <small>Praktisk emballage til ordren</small>
            </div>
          </div>

          {bagIncluded ? (
            <div className={styles.bagAction}>
              <span>{formatPrice(bagFee)}</span>

              <button type="button" onClick={onToggleBag}>
                Fjern
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.addBagButton}
              onClick={onToggleBag}
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
            <span>{formatPrice(serviceFee)}</span>
          </div>

          {bagIncluded && (
            <div className={styles.summaryRow}>
              <span>Bærepose</span>
              <span>{formatPrice(bagFee)}</span>
            </div>
          )}

          <div className={styles.deliveryPreviewRow}>
            <span>Levering ved valg</span>
            <span>{formatPrice(deliveryFee || 45)}</span>
          </div>

          <div className={styles.totalRow}>
            <div>
              <span>I alt</span>
              <small>Afhænger af leveringsmetode</small>
            </div>

            <strong>{formatPrice(totalPrice)}</strong>
          </div>
        </div>

        <div
          className={styles.methodSection}
          aria-labelledby="delivery-method-title"
        >
          <div className={styles.methodHeading}>
            <h3 id="delivery-method-title">Hvordan vil du have ordren?</h3>

            <p>Du går direkte videre, når du vælger.</p>
          </div>

          <div className={styles.methodGrid}>
            <button
              type="button"
              className={styles.methodButton}
              onClick={() => onSelectMethod("pickup")}
            >
              <span className={styles.methodIcon}>
                <Store size={21} />
              </span>

              <span className={styles.methodText}>
                <strong>Afhentning</strong>
                <small>Hent i restauranten</small>
              </span>

              <span className={styles.methodArrow}>→</span>
            </button>

            <button
              type="button"
              className={styles.methodButton}
              onClick={() => onSelectMethod("delivery")}
            >
              <span className={styles.methodIcon}>
                <Truck size={21} />
              </span>

              <span className={styles.methodText}>
                <strong>Levering</strong>
                <small>Inden for 10 km</small>
              </span>

              <span className={styles.methodArrow}>→</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface DetailsStepProps {
  deliveryMethod: "pickup" | "delivery";
  requestedTime: ReturnType<typeof useCart>["requestedTime"];
  availableTimes: string[];
  isAsapAvailable: boolean;
  serviceStatusMessage: string | null;
  isScheduledSelectionOpen: boolean;
  onRequestedTimeChange: ReturnType<typeof useCart>["setRequestedTime"];

  customerDetails: CustomerDetails;
  deliveryAddress: ReturnType<typeof useCart>["deliveryAddress"];
  deliveryDistance: ReturnType<typeof validateDeliveryDistance> | null;
  isLoggedIn: boolean;
  loggedInLabel: string;
  formError: string;
  canSubmit: boolean;
  totalPrice: number;

  onCustomerChange: (field: keyof CustomerDetails, value: string) => void;

  onAddressChange: ReturnType<typeof useCart>["setDeliveryAddress"];

  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  formatPrice: (price: number) => string;
}

function DetailsStep({
  deliveryMethod,
  requestedTime,
  availableTimes,
  isScheduledSelectionOpen,
  onRequestedTimeChange,
  customerDetails,
  deliveryAddress,
  deliveryDistance,
  isAsapAvailable,
  serviceStatusMessage,
  isLoggedIn,
  loggedInLabel,
  formError,
  canSubmit,
  totalPrice,
  onCustomerChange,
  onAddressChange,
  onSubmit,
  onBack,
  formatPrice,
}: DetailsStepProps) {
  const authRedirect =
    typeof window !== "undefined"
      ? encodeURIComponent(`${window.location.pathname}?cart=open`)
      : encodeURIComponent("/menu?cart=open");

  return (
    <form className={styles.detailsStep} onSubmit={onSubmit} noValidate>
      <section className={styles.detailsIntro}>
        <span className={styles.detailsIcon}>
          {deliveryMethod === "pickup" ? (
            <Store size={23} />
          ) : (
            <Truck size={23} />
          )}
        </span>

        <div>
          <h3>{deliveryMethod === "pickup" ? "Afhentning" : "Levering"}</h3>

          <p>
            {deliveryMethod === "pickup"
              ? "Vi bruger oplysningerne, når ordren er klar."
              : "Vi bruger oplysningerne til at levere ordren korrekt."}
          </p>
        </div>
      </section>
      <section
        className={styles.timeCard}
        aria-labelledby="requested-time-title"
      >
        <div className={styles.timeHeader}>
          <span className={styles.timeIcon}>
            <Clock3 size={19} />
          </span>

          <div>
            <strong id="requested-time-title">Ønsket tidspunkt</strong>

            <small>
              {deliveryMethod === "delivery"
                ? "Hvornår ønsker du ordren leveret?"
                : "Hvornår ønsker du at hente ordren?"}
            </small>
          </div>
        </div>

        <div className={styles.timeOptions}>
          <label
            className={`${styles.timeOption} ${
              requestedTime !== "asap" && requestedTime !== ""
                ? styles.timeOptionActive
                : ""
            }`}
          >
            <input
              type="radio"
              name="requested-time-mode"
              value="asap"
              checked={requestedTime === "asap"}
              disabled={!isAsapAvailable}
              onChange={() => onRequestedTimeChange("asap")}
            />

            <span>Hurtigst muligt</span>
          </label>

          <label
            className={`${styles.timeOption} ${
              requestedTime !== "asap" ? styles.timeOptionActive : ""
            }`}
          >
            <input
              type="radio"
              name="requested-time-mode"
              value="scheduled"
              checked={requestedTime !== "asap" && requestedTime !== ""}
              disabled={!isScheduledSelectionOpen}
              onChange={() => {
                if (availableTimes.length > 0) {
                  onRequestedTimeChange(availableTimes[0]);
                }
              }}
            />

            <span>Vælg tidspunkt</span>
          </label>
        </div>

        {requestedTime !== "asap" && availableTimes.length > 0 && (
          <select
            className={styles.timeSelect}
            value={requestedTime}
            onChange={(event) => onRequestedTimeChange(event.target.value)}
            aria-label="Vælg ønsket tidspunkt"
          >
            {availableTimes.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        )}

        {availableTimes.length === 0 && (
          <div className={styles.timeStatusBox}>
            {serviceStatusMessage ??
              (isScheduledSelectionOpen
                ? "Der er ingen flere valgbare tider i dag."
                : "Åbningstider kunne ikke hentes.")}
          </div>
        )}
      </section>
      {isLoggedIn ? (
        <div className={styles.loggedInCard}>
          <span className={styles.loggedInIcon}>
            <UserRound size={18} />
          </span>

          <div>
            <small>Logget ind som</small>
            <strong>{loggedInLabel}</strong>
          </div>

          <Check size={18} />
        </div>
      ) : (
        <div className={styles.loginCard}>
          <div>
            <strong>Har du allerede en konto?</strong>

            <span>Log ind og udfyld dine oplysninger automatisk.</span>
          </div>

          <Link
            href={`/auth?redirect=${authRedirect}`}
            className={styles.loginButton}
          >
            <LogIn size={17} />
            Log ind
          </Link>
        </div>
      )}

      <div className={styles.formFields}>
        <div className={styles.fieldGroup}>
          <label htmlFor="customer-name" className={styles.fieldLabel}>
            Navn
          </label>

          <input
            id="customer-name"
            name="name"
            type="text"
            autoComplete="name"
            value={customerDetails.name}
            className={styles.textInput}
            placeholder="Dit navn"
            onChange={(event) => onCustomerChange("name", event.target.value)}
            required
          />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="customer-phone" className={styles.fieldLabel}>
            Telefon
          </label>

          <input
            id="customer-phone"
            name="tel"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={customerDetails.phone}
            className={styles.textInput}
            placeholder="Fx 12 34 56 78"
            onChange={(event) => onCustomerChange("phone", event.target.value)}
            required
          />
        </div>

        {deliveryMethod === "delivery" && (
          <>
            <AddressAutocomplete
              value={deliveryAddress}
              onChange={onAddressChange}
            />

            <div className={styles.fieldGroup}>
              <label htmlFor="floor-door" className={styles.fieldLabel}>
                Etage / dør
                <span className={styles.optional}>Valgfrit</span>
              </label>

              <input
                id="floor-door"
                name="address-line2"
                type="text"
                autoComplete="address-line2"
                value={deliveryAddress.floorDoor}
                className={styles.textInput}
                placeholder="Fx 2. th."
                onChange={(event) =>
                  onAddressChange({
                    ...deliveryAddress,
                    floorDoor: event.target.value,
                  })
                }
              />
            </div>

            {deliveryAddress.placeId && (
              <div className={styles.selectedAddress}>
                <Check size={17} />

                <div>
                  <strong>{deliveryAddress.addressLine1}</strong>

                  <span>
                    {deliveryAddress.postalCode} {deliveryAddress.city}
                  </span>
                </div>
              </div>
            )}
            {deliveryDistance && !deliveryDistance.isWithinDeliveryArea && (
              <div className={styles.deliveryAreaError} role="alert">
                <Truck size={20} />

                <div>
                  <strong>Adressen er uden for leveringsområdet</strong>

                  <span>
                    Vi leverer inden for {MAX_DELIVERY_DISTANCE_KM} km fra
                    restauranten. Den valgte adresse ligger ca.{" "}
                    {deliveryDistance.distanceKm.toFixed(1).replace(".", ",")}{" "}
                    km væk.
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {formError && (
        <div className={styles.formError} role="alert">
          {formError}
        </div>
      )}

      <div className={styles.detailsFooter}>
        <div className={styles.detailsTotal}>
          <span>I alt</span>
          <strong>{formatPrice(totalPrice)}</strong>
        </div>

        <button
          type="submit"
          className={styles.paymentButton}
          disabled={!canSubmit}
        >
          Gå til betaling
        </button>

        <button
          type="button"
          className={styles.detailsBackButton}
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          Tilbage til kurven
        </button>
      </div>
    </form>
  );
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
