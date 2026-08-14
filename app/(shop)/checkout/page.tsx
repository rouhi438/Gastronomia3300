"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import {
  CreditCard,
  Home,
  Smartphone,
  Truck,
  CircleAlert,
  X,
} from "lucide-react";

import { useCart } from "@/context/CartContext";
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

  const [orderNote, setOrderNote] = useState("");
  const [form, setForm] = useState<CheckoutForm>(initialForm);

  const [payment, setPayment] = useState<PaymentMethod>("mobilepay");

  useEffect(() => {
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (items.length === 0) {
      alert("Din kurv er tom. Tilføj nogle varer først.");

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
      alert(
        "Leveringsadressen mangler oplysninger. Gå tilbage og vælg adressen igen.",
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const orderItems = items.map((item) => {
        const extras = (item.extras ?? []).map((extra) => {
          const groupId = extra.groupId;

          if (typeof groupId !== "string" || groupId.trim() === "") {
            throw new Error(
              "Hver valgt ekstra skal have en ikke-tom gruppe-id.",
            );
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

      const customerAddress =
        deliveryMethod === "delivery" ? formattedDeliveryAddress : null;

      const orderData = {
        delivery_method: deliveryMethod,
        payment_method: payment,
        bag_included: bagIncluded,

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
        throw new Error(result.error || "Betalingen kunne ikke startes.");
      }

      if (
        typeof result.payment_url !== "string" ||
        result.payment_url.trim() === ""
      ) {
        throw new Error(
          "Betalingen blev oprettet uden et gyldigt betalingslink.",
        );
      }

      window.location.assign(result.payment_url);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Ukendt fejl ved opstart af betaling";

      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return <div className={styles.loading}>Indlæser...</div>;
  }

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyContent}>
          <h2>Din kurv er tom</h2>

          <p>Gå tilbage til menuen og tilføj nogle lækre pizzaer.</p>

          <Link href="/menu" className="btn-primary">
            Se menuen
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <h1 className={styles.title}>Checkout</h1>

        <div className={styles.grid}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.section}>
              <h3>Kundeoplysninger</h3>

              <div className={styles.inputGroup}>
                <label htmlFor="checkout-name">Fulde navn</label>

                <input
                  id="checkout-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                  placeholder="Mads Jensen"
                />
              </div>

              {deliveryMethod === "delivery" && (
                <div className={styles.inputGroup}>
                  <label htmlFor="checkout-address">Adresse</label>

                  <input
                    id="checkout-address"
                    type="text"
                    value={formattedDeliveryAddress}
                    readOnly
                    autoComplete="street-address"
                    placeholder="Vælg adressen i kurven"
                  />
                </div>
              )}

              <div className={styles.inputGroup}>
                <label htmlFor="checkout-phone">Telefon</label>

                <input
                  id="checkout-phone"
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  autoComplete="tel"
                  placeholder="+45 40 40 41 83"
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="checkout-email">E-mail</label>

                <input
                  id="checkout-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  placeholder="din@email.dk"
                />
              </div>
            </div>
            <div className={styles.section}>
              <div className={styles.deliverySummaryHeader}>
                <h3>Leveringsmetode</h3>

                <Link
                  href="/menu?cart=open"
                  className={styles.changeDeliveryLink}
                >
                  Skift
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
                    {deliveryMethod === "pickup" ? "Afhentning" : "Levering"}
                  </strong>

                  <span>
                    {deliveryMethod === "pickup"
                      ? "Du henter selv ordren hos Gastronomia 3300."
                      : "Ordren leveres til adressen valgt i kurven."}
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.section}>
              <h3>Betaling</h3>

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
                  <span>Betalingskort</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sender..." : "Gennemfør bestilling"}
            </button>
          </form>

          <div className={styles.summary}>
            <h3>Din ordre</h3>

            <ul className={styles.itemList}>
              {items.map((item, index) => {
                const uniqueKey = item.cartId || index;

                return (
                  <li key={uniqueKey} className={styles.summaryItem}>
                    <div>
                      <span className={styles.summaryName}>
                        {item.quantity}× {item.name}
                      </span>

                      {item.extras && item.extras.length > 0 && (
                        <span className={styles.summaryExtras}>
                          (+
                          {item.extras.map((extra) => extra.name).join(", ")})
                        </span>
                      )}
                    </div>

                    <span className={styles.summaryPrice}>
                      {item.price * item.quantity} kr.
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className={styles.totalRow}>
              <span>I alt</span>

              <span className={styles.totalPrice}>{totalPrice} kr.</span>
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
              aria-label="Luk"
            >
              <X size={20} />
            </button>

            <div className={styles.errorIcon}>
              <CircleAlert size={34} />
            </div>

            <h2 id="checkout-error-title">Bestilling ikke mulig</h2>

            <p>{submitError}</p>

            <button
              type="button"
              className={styles.errorButton}
              onClick={() => setSubmitError("")}
            >
              Luk
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
