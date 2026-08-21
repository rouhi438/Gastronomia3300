"use client";

import { useEffect, useState } from "react";
import { Bike, LoaderCircle, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

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

export default function StoreStatusBadge({
  mobile = false,
}: StoreStatusBadgeProps) {
  const t = useTranslations("StoreStatus");

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
      <div className={styles.loading} aria-live="polite">
        <LoaderCircle size={15} aria-hidden="true" />
        <span>{t("loading")}</span>
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
      aria-label={t("ariaLabel")}
    >
      <div
        className={mobile ? styles.mobileMenuStatus : styles.pill}
        title={`${t("pickup")} · ${t(`status.${pickup.status}`)}`}
      >
        <span className={`${styles.dot} ${styles[pickup.status]}`} />

        <ShoppingBag size={15} aria-hidden="true" />

        <span>{t("pickup")}</span>

        {!mobile && <span className={styles.separator}>·</span>}

        <strong className={styles[pickup.status]}>
          {t(`status.${pickup.status}`)}
        </strong>
      </div>

      <div
        className={mobile ? styles.mobileMenuStatus : styles.pill}
        title={`${t("delivery")} · ${t(`status.${delivery.status}`)}`}
      >
        <span className={`${styles.dot} ${styles[delivery.status]}`} />

        <Bike size={16} aria-hidden="true" />

        <span>{t("delivery")}</span>

        {!mobile && <span className={styles.separator}>·</span>}

        <strong className={styles[delivery.status]}>
          {t(`status.${delivery.status}`)}
        </strong>
      </div>
    </div>
  );
}
