"use client";

import { useEffect, useState } from "react";
import { Bike, LoaderCircle, ShoppingBag } from "lucide-react";

import styles from "./StoreStatusBadge.module.css";

type StoreOrderingStatus = "open" | "preorder" | "paused" | "closed";

type ServiceType = "pickup" | "delivery";

type ServiceStatus = {
  serviceType: ServiceType;
  status: StoreOrderingStatus;
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
  overrideUntil: string | null;
  overrideReason: string | null;
};

type ServiceStatuses = {
  pickup: ServiceStatus;
  delivery: ServiceStatus;
};

type StoreStatusBadgeProps = {
  mobile?: boolean;
};

async function fetchServiceStatuses(): Promise<ServiceStatuses> {
  const response = await fetch("/api/store/service-status", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Store service status request failed.");
  }

  return response.json();
}

function getStatusLabel(status: StoreOrderingStatus) {
  switch (status) {
    case "open":
      return "Åben";

    case "preorder":
      return "Forudbestilling";

    case "paused":
      return "Pauset";

    case "closed":
      return "Lukket";
  }
}

export default function StoreStatusBadge({
  mobile = false,
}: StoreStatusBadgeProps) {
  const [statuses, setStatuses] = useState<ServiceStatuses | null>(null);

  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const requestStatus = () => {
      fetchServiceStatuses()
        .then((data) => {
          if (cancelled) return;

          setStatuses(data);
          setHasError(false);
        })
        .catch((error) => {
          if (cancelled) return;

          console.error("Store service status badge error:", error);

          setHasError(true);
        });
    };

    queueMicrotask(requestStatus);

    const interval = window.setInterval(requestStatus, 30_000);

    const handleFocus = () => {
      requestStatus();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestStatus();
      }
    };

    window.addEventListener("focus", handleFocus);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;

      window.clearInterval(interval);

      window.removeEventListener("focus", handleFocus);

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  if (!statuses && !hasError) {
    return (
      <div className={styles.loading}>
        <LoaderCircle size={15} />
        <span>Henter status</span>
      </div>
    );
  }

  if (!statuses || hasError) {
    return null;
  }

  const pickup = statuses.pickup;
  const delivery = statuses.delivery;

  return (
    <div
      className={mobile ? styles.mobileMenuStatuses : styles.desktopStatuses}
      aria-label="Bestillingsstatus"
    >
      <div
        className={mobile ? styles.mobileMenuStatus : styles.pill}
        title={pickup.message}
      >
        <span className={`${styles.dot} ${styles[pickup.status]}`} />

        <ShoppingBag size={15} />

        <span>Afhentning</span>

        {!mobile && <span className={styles.separator}>·</span>}

        <strong className={styles[pickup.status]}>
          {getStatusLabel(pickup.status)}
        </strong>
      </div>

      <div
        className={mobile ? styles.mobileMenuStatus : styles.pill}
        title={delivery.message}
      >
        <span className={`${styles.dot} ${styles[delivery.status]}`} />

        <Bike size={16} />

        <span>Levering</span>

        {!mobile && <span className={styles.separator}>·</span>}

        <strong className={styles[delivery.status]}>
          {getStatusLabel(delivery.status)}
        </strong>
      </div>
    </div>
  );
}
