"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { Truck, Home, CreditCard, Wallet } from "lucide-react";
import styles from "./checkout.module.css";

type DeliveryMethod = "pickup" | "delivery";
type PaymentMethod = "mobilepay" | "cash";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCart();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
  });

  const [delivery, setDelivery] = useState<DeliveryMethod>("pickup");
  const [payment, setPayment] = useState<PaymentMethod>("mobilepay");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // SUBMIT ORDER TO API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      alert("Din kurv er tom. Tilføj nogle varer først.");
      return;
    }

    setIsSubmitting(true);

    try {
      const orderData = {
        total_price: totalPrice,
        delivery_method: delivery,
        payment_method: payment,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_address: delivery === "delivery" ? form.address : null,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          size: item.size || "normal",
          extras: item.extras?.map((e) => e.name) || [],
        })),
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create order");
      }

      alert(`Tak for din bestilling! Ordre #${result.order_id} er modtaget.`);
      clearCart();
      router.push("/");
    } catch (error: any) {
      alert(`Fejl ved oprettelse af ordre: ${error.message}`);
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
          <a href="/menu" className="btn-primary">
            Se menuen
          </a>
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
                <label>Fulde navn</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Mads Jensen"
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Adresse</label>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  required={delivery === "delivery"}
                  placeholder="Hillerødvej 38A, 3300 Frederiksværk"
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Telefon</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  placeholder="+45 40 40 41 83"
                />
              </div>
              <div className={styles.inputGroup}>
                <label>E-mail</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="din@email.dk"
                />
              </div>
            </div>

            <div className={styles.section}>
              <h3>Levering</h3>
              <div className={styles.options}>
                <button
                  type="button"
                  className={`${styles.optionBtn} ${
                    delivery === "pickup" ? styles.active : ""
                  }`}
                  onClick={() => setDelivery("pickup")}
                >
                  <Home size={20} />
                  <span>Afhentning</span>
                </button>
                <button
                  type="button"
                  className={`${styles.optionBtn} ${
                    delivery === "delivery" ? styles.active : ""
                  }`}
                  onClick={() => setDelivery("delivery")}
                >
                  <Truck size={20} />
                  <span>Levering</span>
                </button>
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
                >
                  <CreditCard size={20} />
                  <span>MobilePay</span>
                </button>
                <button
                  type="button"
                  className={`${styles.optionBtn} ${
                    payment === "cash" ? styles.active : ""
                  }`}
                  onClick={() => setPayment("cash")}
                >
                  <Wallet size={20} />
                  <span>Kontant</span>
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
                const uniqueKey = `${item.cartId || index}`;
                return (
                  <li key={uniqueKey} className={styles.summaryItem}>
                    <div>
                      <span className={styles.summaryName}>
                        {item.quantity}× {item.name}
                      </span>
                      {item.extras && item.extras.length > 0 && (
                        <span className={styles.summaryExtras}>
                          (+{item.extras.map((e) => e.name).join(", ")})
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
    </div>
  );
}
