"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bike, LoaderCircle, ShoppingBag, Store } from "lucide-react";

import styles from "./AdminStoreStatus.module.css";

type StoreOrderingStatus = "open" | "preorder" | "paused" | "closed";
type OverallStatus = StoreOrderingStatus | "mixed" | "loading" | "unknown";

type ServiceStatus = {
  status: StoreOrderingStatus;
  message: string;
};

type ServiceStatuses = {
  pickup: ServiceStatus;
  delivery: ServiceStatus;
};

const statusLabels: Record<StoreOrderingStatus, string> = {
  open: "Åben",
  preorder: "Forudbestilling",
  paused: "Midlertidigt pauset",
  closed: "Lukket",
};

function getOverallStatus(statuses: ServiceStatuses): OverallStatus {
  const { pickup, delivery } = statuses;

  if (pickup.status === delivery.status) {
    return pickup.status;
  }

  if (pickup.status === "paused" || delivery.status === "paused") {
    return "paused";
  }

  return "mixed";
}

export default function AdminStoreStatus() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [statuses, setStatuses] = useState<ServiceStatuses | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const requestStatus = async () => {
      try {
        const response = await fetch("/api/store/service-status", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Store service status request failed.");
        }

        const data = (await response.json()) as ServiceStatuses;

        if (cancelled) return;

        setStatuses(data);
        setHasError(false);
      } catch (error) {
        if (cancelled) return;

        console.error("Admin store status error:", error);
        setHasError(true);
      }
    };

    queueMicrotask(() => {
      void requestStatus();
    });

    const interval = window.setInterval(() => {
      void requestStatus();
    }, 30_000);

    const refreshStatus = () => {
      void requestStatus();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void requestStatus();
      }
    };

    window.addEventListener("focus", refreshStatus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshStatus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const overallStatus: OverallStatus = statuses
    ? getOverallStatus(statuses)
    : hasError
      ? "unknown"
      : "loading";

  const ariaLabel = statuses
    ? `Butiksstatus. Afhentning: ${statusLabels[statuses.pickup.status]}. Levering: ${statusLabels[statuses.delivery.status]}.`
    : hasError
      ? "Butiksstatus kunne ikke indlæses"
      : "Indlæser butiksstatus";

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((current) => !current)}
      >
        {overallStatus === "loading" ? (
          <LoaderCircle
            className={styles.loadingIcon}
            size={20}
            aria-hidden="true"
          />
        ) : (
          <Store size={20} aria-hidden="true" />
        )}

        <span
          className={`${styles.indicator} ${styles[overallStatus]}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <section
          className={styles.popover}
          role="dialog"
          aria-label="Butiksstatus"
        >
          <header className={styles.popoverHeader}>
            <Store size={19} aria-hidden="true" />

            <span>
              <strong>Butiksstatus</strong>
              <small>Aktuel ordretilgængelighed</small>
            </span>
          </header>

          {statuses ? (
            <div className={styles.serviceList}>
              <div className={styles.serviceRow}>
                <ShoppingBag size={18} aria-hidden="true" />

                <span className={styles.serviceContent}>
                  <strong>Afhentning</strong>
                  <small>{statuses.pickup.message}</small>
                </span>

                <span
                  className={`${styles.statusText} ${
                    styles[statuses.pickup.status]
                  }`}
                >
                  {statusLabels[statuses.pickup.status]}
                </span>
              </div>

              <div className={styles.serviceRow}>
                <Bike size={18} aria-hidden="true" />

                <span className={styles.serviceContent}>
                  <strong>Levering</strong>
                  <small>{statuses.delivery.message}</small>
                </span>

                <span
                  className={`${styles.statusText} ${
                    styles[statuses.delivery.status]
                  }`}
                >
                  {statusLabels[statuses.delivery.status]}
                </span>
              </div>
            </div>
          ) : (
            <p className={styles.unavailable}>
              {hasError ? "Status kunne ikke indlæses." : "Indlæser status..."}
            </p>
          )}

          <Link
            href="/admin/opening-hours"
            className={styles.manageLink}
            onClick={() => setIsOpen(false)}
          >
            Administrer åbningstider
          </Link>
        </section>
      )}
    </div>
  );
}
