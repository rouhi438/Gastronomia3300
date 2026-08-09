"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./opening-hours.module.css";

type ServiceType = "pickup" | "delivery";

type ServiceHour = {
  id: number;
  day_of_week: number;
  service_type: ServiceType;
  is_enabled: boolean;
  preorder_start: string;
  opening_time: string;
  first_scheduled_time: string;
  last_scheduled_time: string;
  closing_time: string;
  slot_interval_minutes: number;
};

const days = [
  { id: 1, label: "Mandag" },
  { id: 2, label: "Tirsdag" },
  { id: 3, label: "Onsdag" },
  { id: 4, label: "Torsdag" },
  { id: 5, label: "Fredag" },
  { id: 6, label: "Lørdag" },
  { id: 7, label: "Søndag" },
];

function shortTime(value: string) {
  return value.slice(0, 5);
}

export default function OpeningHoursPage() {
  const router = useRouter();

  const [activeService, setActiveService] = useState<ServiceType>("pickup");

  const [hours, setHours] = useState<ServiceHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/admin/store-hours", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/auth");
          return null;
        }

        if (response.status === 403) {
          router.replace("/");
          return null;
        }

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || "Kunne ikke hente åbningstider.");
        }

        return data;
      })
      .then((data) => {
        if (!data || controller.signal.aborted) return;

        setHours(Array.isArray(data.hours) ? data.hours : []);
        setError("");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;

        setError(
          error instanceof Error
            ? error.message
            : "Kunne ikke hente åbningstider.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [router]);

  const visibleHours = useMemo(() => {
    return hours.filter((item) => item.service_type === activeService);
  }, [hours, activeService]);

  if (loading) {
    return (
      <main className={styles.container}>
        <p className={styles.message}>Indlæser åbningstider...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.container}>
        <p className={styles.error}>{error}</p>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Åbningstider</h1>

          <p className={styles.subtitle}>
            Administrer tider for afhentning og levering.
          </p>
        </div>
      </header>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${
            activeService === "pickup" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveService("pickup")}
        >
          Afhentning
        </button>

        <button
          type="button"
          className={`${styles.tab} ${
            activeService === "delivery" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveService("delivery")}
        >
          Levering
        </button>
      </div>

      <section className={styles.week}>
        {days.map((day) => {
          const item = visibleHours.find((hour) => hour.day_of_week === day.id);

          return (
            <article className={styles.dayCard} key={day.id}>
              <div className={styles.dayTop}>
                <strong className={styles.dayName}>{day.label}</strong>

                {item ? (
                  <span
                    className={`${styles.status} ${
                      item.is_enabled
                        ? styles.statusActive
                        : styles.statusClosed
                    }`}
                  >
                    {item.is_enabled ? "Aktiv" : "Lukket"}
                  </span>
                ) : (
                  <span className={styles.statusClosed}>Mangler data</span>
                )}
              </div>

              {item && (
                <>
                  <div className={styles.mainHours}>
                    {shortTime(item.opening_time)}
                    <span>–</span>
                    {shortTime(item.closing_time)}
                  </div>

                  <div className={styles.details}>
                    <span>
                      Forudbestilling {shortTime(item.preorder_start)}
                    </span>

                    <span>
                      Tider {shortTime(item.first_scheduled_time)}
                      {"–"}
                      {shortTime(item.last_scheduled_time)}
                    </span>

                    <span>{item.slot_interval_minutes} min.</span>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
