"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3, LoaderCircle, Store } from "lucide-react";

import styles from "./StoreStatusBadge.module.css";

type StoreOrderingStatus = "open" | "preorder" | "paused" | "closed";

type StoreStatusResponse = {
  status: StoreOrderingStatus;
  canOrder: boolean;
  canOrderAsap: boolean;
  canSchedule: boolean;
  message: string;
  openingTime: string | null;
  closingTime: string | null;
  firstScheduledTime: string | null;
  lastScheduledTime: string | null;
  overrideUntil: string | null;
  overrideReason: string | null;
};

export default function StoreStatusBadge() {
  const [storeStatus, setStoreStatus] = useState<StoreStatusResponse | null>(
    null,
  );

  const [hasError, setHasError] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/store/status", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Store status request failed.");
      }

      const data = (await response.json()) as StoreStatusResponse;

      setStoreStatus(data);
      setHasError(false);
    } catch (error) {
      console.error("Store status badge error:", error);
      setHasError(true);
    }
  }, []);

  useEffect(() => {
    void loadStatus();

    const interval = window.setInterval(() => {
      void loadStatus();
    }, 30_000);

    const handleFocus = () => {
      void loadStatus();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadStatus();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadStatus]);

  if (!storeStatus && !hasError) {
    return (
      <div className={`${styles.badge} ${styles.loading}`}>
        <LoaderCircle className={styles.spinner} size={17} />
        <span>Henter status</span>
      </div>
    );
  }

  if (!storeStatus || hasError) {
    return null;
  }

  const label =
    storeStatus.status === "open"
      ? "Åben"
      : storeStatus.status === "preorder"
        ? "Forudbestilling"
        : storeStatus.status === "paused"
          ? "Midlertidigt lukket"
          : "Lukket";

  const Icon =
    storeStatus.status === "preorder" || storeStatus.status === "paused"
      ? Clock3
      : Store;

  return (
    <div
      className={`${styles.badge} ${styles[storeStatus.status]}`}
      title={storeStatus.message}
    >
      <span className={styles.icon}>
        <Icon size={17} />
      </span>

      <span className={styles.content}>
        <strong>{label}</strong>
        <small>{storeStatus.message}</small>
      </span>
    </div>
  );
}
