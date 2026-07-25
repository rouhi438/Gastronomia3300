"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import styles from "./select-time.module.css";

const timeOptions = [
  { value: 15, label: "15 min" },
  { value: 20, label: "20 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "60 min" },
];

export default function SelectTimePage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;

  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!selectedTime) {
      setError("Vælg venligst en tid.");
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/auth");
      return;
    }

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: "accepted",
          estimated_time: selectedTime,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Kunne ikke acceptere ordre");
      }

      // Auto print after successful accept
      setTimeout(() => {
        window.print();
      }, 300);

      router.push(`/admin/order-accepted/${orderId}?time=${selectedTime}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <h2 className={styles.title}>Vælg forventet tid</h2>
        <p className={styles.subtitle}>
          Hvor lang tid tager det at lave denne ordre?
        </p>

        <div className={styles.options}>
          {timeOptions.map((opt) => (
            <label key={opt.value} className={styles.option}>
              <input
                type="radio"
                name="time"
                value={opt.value}
                checked={selectedTime === opt.value}
                onChange={() => setSelectedTime(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button
            className={styles.confirmBtn}
            onClick={handleConfirm}
            disabled={loading || !selectedTime}
          >
            {loading ? "Sender..." : "Bekræft tid"}
          </button>
          <button
            className={styles.cancelBtn}
            onClick={() => router.push("/admin/new-order")}
            disabled={loading}
          >
            Annuller
          </button>
        </div>
      </div>
    </div>
  );
}
