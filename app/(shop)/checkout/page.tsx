"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  CreditCard,
  Home,
  Smartphone,
  Truck,
  CircleAlert,
  X,
} from "lucide-react";

import { MIN_DELIVERY_TOTAL } from "@/lib/orders/constants";
import { useCart } from "@/context/CartContext";
import { extraGroups, type Extra } from "@/data/menu";
import styles from "./checkout.module.css";

type PaymentMethod = "mobilepay" | "card";

interface CheckoutForm {
  name: string;
  phone: string;
  email: string;
}

interface CreatePaymentResponse {
  checkout_session_id?: string;
  payment_id?: string;
  payment_url?: string;
  error?: string;
}

const initialForm: CheckoutForm = {
  name: "",
  phone: "",
  email: "",
};

export default function CheckoutPage() {
  const t = useTranslations("Checkout");
  const menuT = useTranslations("Menu");
  const itemModalT = useTranslations("ItemModal");
  const locale = useLocale();

  const {
    items,
    totalPrice,
    bagIncluded,
    deliveryMethod,
    deliveryAddress,
    requestedTime,
  } = useCart();

  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    totalPrice: number;
    cartKey: string;
  } | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  const [orderNote, setOrderNote] = useState("");
  const [form, setForm] = useState<CheckoutForm>(initialForm);

  const [payment, setPayment] = useState<PaymentMethod>("mobilepay");

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      setMounted(true);

      const storedCheckoutCustomer = localStorage.getItem("checkout-customer");

      if (!storedCheckoutCustomer) {
        return;
      }

      try {
        const parsed: unknown = JSON.parse(storedCheckoutCustomer);

        if (!parsed || typeof parsed !== "object") {
          localStorage.removeItem("checkout-customer");
          return;
        }

        const customer = parsed as {
          name?: unknown;
          phone?: unknown;
          email?: unknown;
          orderNote?: unknown;
        };

        setForm((current) => ({
          ...current,
          name: typeof customer.name === "string" ? customer.name : "",
          phone: typeof customer.phone === "string" ? customer.phone : "",
          email:
            typeof customer.email === "string" ? customer.email : current.email,
        }));

        setOrderNote(
          typeof customer.orderNote === "string" ? customer.orderNote : "",
        );
      } catch {
        localStorage.removeItem("checkout-customer");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const formattedDeliveryAddress = [
    deliveryAddress.addressLine1,
    deliveryAddress.floorDoor,
    [deliveryAddress.postalCode, deliveryAddress.city]
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  const priceLocale = locale === "en" ? "en-DK" : "da-DK";

  const formatPrice = (value: number) =>
    `${value.toLocaleString(priceLocale)} kr.`;

  const getExtraDisplayName = (extra: Extra) => {
    if (!extra.groupId) {
      return extra.name;
    }

    const group = extraGroups[extra.groupId];
    const index = group.findIndex((option) => option.name === extra.name);
    const key = `extras.${extra.groupId}.${index}`;

    return index >= 0 && itemModalT.has(key) ? itemModalT(key) : extra.name;
  };

  const buildOrderItems = () =>
    items.map((item) => {
      const extras = (item.extras ?? []).map((extra) => {
        const groupId = extra.groupId;

        if (typeof groupId !== "string" || groupId.trim() === "") {
          throw new Error(t("errors.invalidExtraGroup"));
        }

        return {
          name: extra.name,
          groupId: groupId.trim(),
        };
      });

      return {
        id: item.id,
        quantity: item.quantity,
        size: item.size || "normal",
        deepPan: Boolean(item.deepPan),
        extras,
      };
    });

  const cartKey = JSON.stringify({
    items,
    bagIncluded,
    deliveryMethod,
  });

  const validAppliedDiscount =
    appliedDiscount?.cartKey === cartKey &&
    appliedDiscount.code === discountCode.trim().toUpperCase()
      ? appliedDiscount
      : null;

  const checkoutTotal = validAppliedDiscount
    ? validAppliedDiscount.totalPrice
    : totalPrice;

  const deliveryMinimumShortfall =
    deliveryMethod === "delivery"
      ? Math.max(0, MIN_DELIVERY_TOTAL - checkoutTotal)
      : 0;

  const handleApplyDiscount = async () => {
    if (isApplyingDiscount || isSubmitting) return;

    const code = discountCode.trim().toUpperCase();

    setAppliedDiscount(null);
    setDiscountError("");

    if (!code) {
      setDiscountError(t("discountRequired"));
      return;
    }

    if (items.length === 0) {
      setDiscountError(t("discountEmptyCart"));
      return;
    }

    const requestedCartKey = cartKey;
    setIsApplyingDiscount(true);

    try {
      const response = await fetch("/api/discounts/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          discount_code: code,
          items: buildOrderItems(),
          bag_included: bagIncluded,
          delivery_method: deliveryMethod,
        }),
      });

      const result = (await response.json()) as {
        code?: string | null;
        discount_amount?: number;
        total_price?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || t("discountApplyFailed"));
      }

      if (
        typeof result.code !== "string" ||
        typeof result.discount_amount !== "number" ||
        typeof result.total_price !== "number"
      ) {
        throw new Error(t("discountInvalidResponse"));
      }

      setAppliedDiscount({
        code: result.code,
        amount: result.discount_amount,
        totalPrice: result.total_price,
        cartKey: requestedCartKey,
      });
    } catch (error) {
      setDiscountError(
        error instanceof Error ? error.message : t("discountUnknownError"),
      );
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (items.length === 0) {
      alert(t("errors.emptyCart"));

      return;
    }

    if (
      deliveryMethod === "delivery" &&
      (!deliveryAddress.addressLine1 ||
        !deliveryAddress.postalCode ||
        !deliveryAddress.city ||
        !deliveryAddress.placeId ||
        deliveryAddress.latitude === null ||
        deliveryAddress.longitude === null)
    ) {
      alert(t("errors.incompleteDeliveryAddress"));

      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const orderItems = buildOrderItems();

      const customerAddress =
        deliveryMethod === "delivery" ? formattedDeliveryAddress : null;

      const orderData = {
        delivery_method: deliveryMethod,
        payment_method: payment,
        bag_included: bagIncluded,
        discount_code: validAppliedDiscount?.code ?? null,
        customer_name: form.name.trim(),
        customer_phone: form.phone.trim(),
        customer_email: form.email.trim(),
        customer_address: customerAddress,
        customer_address_line1:
          deliveryMethod === "delivery" ? deliveryAddress.addressLine1 : null,
        customer_postal_code:
          deliveryMethod === "delivery" ? deliveryAddress.postalCode : null,
        customer_city:
          deliveryMethod === "delivery" ? deliveryAddress.city : null,
        customer_floor_door:
          deliveryMethod === "delivery"
            ? deliveryAddress.floorDoor || null
            : null,
        customer_place_id:
          deliveryMethod === "delivery" ? deliveryAddress.placeId : null,
        customer_latitude:
          deliveryMethod === "delivery" ? deliveryAddress.latitude : null,
        customer_longitude:
          deliveryMethod === "delivery" ? deliveryAddress.longitude : null,
        requested_time: requestedTime,
        order_note: orderNote.trim() || null,
        items: orderItems,
      };

      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const result = (await response.json()) as CreatePaymentResponse;

      if (!response.ok) {
        throw new Error(result.error || t("errors.paymentStartFailed"));
      }

      if (
        typeof result.payment_url !== "string" ||
        result.payment_url.trim() === ""
      ) {
        throw new Error(t("errors.invalidPaymentLink"));
      }

      window.location.assign(result.payment_url);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t("errors.unknownPayment");

      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return <div className={styles.loading}>{t("loading")}</div>;
  }

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyContent}>
          <h2>{t("emptyTitle")}</h2>

          <p>{t("emptyDescription")}</p>

          <Link href="/menu" className="btn-primary">
            {t("viewMenu")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <h1 className={styles.title}>{t("title")}</h1>

        <div className={styles.grid}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.section}>
              <h3>{t("customerInformation")}</h3>

              <div className={styles.inputGroup}>
                <label htmlFor="checkout-name">{t("fullName")}</label>

                <input
                  id="checkout-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                  placeholder={t("placeholders.name")}
                />
              </div>

              {deliveryMethod === "delivery" && (
                <div className={styles.inputGroup}>
                  <label htmlFor="checkout-address">{t("address")}</label>

                  <input
                    id="checkout-address"
                    type="text"
                    value={formattedDeliveryAddress}
                    readOnly
                    autoComplete="street-address"
                    placeholder={t("placeholders.address")}
                  />
                </div>
              )}

              <div className={styles.inputGroup}>
                <label htmlFor="checkout-phone">{t("phone")}</label>

                <input
                  id="checkout-phone"
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  autoComplete="tel"
                  placeholder={t("placeholders.phone")}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="checkout-email">{t("email")}</label>

                <input
                  id="checkout-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  placeholder={t("placeholders.email")}
                />
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.deliverySummaryHeader}>
                <h3>{t("deliveryMethod")}</h3>

                <Link
                  href="/menu?cart=open"
                  className={styles.changeDeliveryLink}
                >
                  {t("change")}
                </Link>
              </div>

              <div className={styles.deliverySummaryCard}>
                <div className={styles.deliverySummaryIcon}>
                  {deliveryMethod === "pickup" ? (
                    <Home size={21} />
                  ) : (
                    <Truck size={21} />
                  )}
                </div>

                <div className={styles.deliverySummaryText}>
                  <strong>
                    {deliveryMethod === "pickup" ? t("pickup") : t("delivery")}
                  </strong>

                  <span>
                    {deliveryMethod === "pickup"
                      ? t("pickupDescription")
                      : t("deliveryDescription")}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3>{t("discountTitle")}</h3>

              <div className={styles.inputGroup}>
                <label htmlFor="checkout-discount-code">
                  {t("discountLabel")}
                </label>

                <input
                  id="checkout-discount-code"
                  type="text"
                  value={discountCode}
                  onChange={(event) => {
                    setDiscountCode(event.target.value.toUpperCase());
                    setDiscountError("");
                  }}
                  placeholder={t("discountPlaceholder")}
                  autoComplete="off"
                  maxLength={32}
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="button"
                onClick={handleApplyDiscount}
                className={styles.discountButton}
                disabled={isApplyingDiscount || isSubmitting}
              >
                {isApplyingDiscount
                  ? t("discountChecking")
                  : t("discountApply")}
              </button>

              {discountError && (
                <p className={styles.discountError} role="alert">
                  {discountError}
                </p>
              )}

              {validAppliedDiscount && (
                <p className={styles.discountSuccess} role="status">
                  {t("discountApplied", {
                    code: validAppliedDiscount.code,
                    amount: formatPrice(validAppliedDiscount.amount),
                  })}
                </p>
              )}
            </div>

            <div className={styles.section}>
              <h3>{t("payment")}</h3>

              <div className={styles.options}>
                <button
                  type="button"
                  className={`${styles.optionBtn} ${
                    payment === "mobilepay" ? styles.active : ""
                  }`}
                  onClick={() => setPayment("mobilepay")}
                  aria-pressed={payment === "mobilepay"}
                >
                  <Smartphone size={20} />
                  <span>MobilePay</span>
                </button>

                <button
                  type="button"
                  className={`${styles.optionBtn} ${
                    payment === "card" ? styles.active : ""
                  }`}
                  onClick={() => setPayment("card")}
                  aria-pressed={payment === "card"}
                >
                  <CreditCard size={20} />
                  <span>{t("paymentCard")}</span>
                </button>
              </div>
            </div>

            {deliveryMinimumShortfall > 0 && (
              <p
                role="alert"
                style={{ color: "#b91c1c", marginBottom: "12px" }}
              >
                {t.rich("deliveryMinimumWarning", {
                  minimum: MIN_DELIVERY_TOTAL,
                  shortfall: deliveryMinimumShortfall,
                  bold: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting || deliveryMinimumShortfall > 0}
            >
              {isSubmitting ? t("submitting") : t("completeOrder")}
            </button>
          </form>

          <div className={styles.summary}>
            <h3>{t("yourOrder")}</h3>

            <ul className={styles.itemList}>
              {items.map((item, index) => {
                const uniqueKey = item.cartId || index;
                const itemNameKey = `items.${item.id}.name`;
                const displayItemName = menuT.has(itemNameKey)
                  ? menuT(itemNameKey)
                  : item.name;

                return (
                  <li key={uniqueKey} className={styles.summaryItem}>
                    <div>
                      <span className={styles.summaryName}>
                        {item.quantity}× {displayItemName}
                      </span>

                      {item.extras && item.extras.length > 0 && (
                        <span className={styles.summaryExtras}>
                          (+
                          {item.extras
                            .map((extra) => getExtraDisplayName(extra))
                            .join(", ")}
                          )
                        </span>
                      )}
                    </div>

                    <span className={styles.summaryPrice}>
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </li>
                );
              })}
            </ul>

            {validAppliedDiscount && (
              <div className={styles.discountSummaryRow}>
                <span>{t("discountTitle")}</span>
                <span>-{formatPrice(validAppliedDiscount.amount)}</span>
              </div>
            )}

            <div className={styles.totalRow}>
              <span>{t("total")}</span>

              <span className={styles.totalPrice}>
                {formatPrice(
                  validAppliedDiscount
                    ? validAppliedDiscount.totalPrice
                    : totalPrice,
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {submitError && (
        <div className={styles.errorOverlay} role="presentation">
          <div
            className={styles.errorModal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="checkout-error-title"
          >
            <button
              type="button"
              className={styles.errorClose}
              onClick={() => setSubmitError("")}
              aria-label={t("close")}
            >
              <X size={20} />
            </button>

            <div className={styles.errorIcon}>
              <CircleAlert size={34} />
            </div>

            <h2 id="checkout-error-title">{t("orderNotPossible")}</h2>

            <p>{submitError}</p>

            <button
              type="button"
              className={styles.errorButton}
              onClick={() => setSubmitError("")}
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
