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

type TimeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
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

function TimeField({ label, value, onChange }: TimeFieldProps) {
  return (
    <label className={styles.field}>
      <span>{label}</span>

      <input
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default function OpeningHoursPage() {
  const router = useRouter();

  const [activeService, setActiveService] = useState<ServiceType>("pickup");

  const [hours, setHours] = useState<ServiceHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingHour, setEditingHour] = useState<ServiceHour | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

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
        if (!data || controller.signal.aborted) {
          return;
        }

        setHours(Array.isArray(data.hours) ? data.hours : []);

        setError("");
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
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

  function selectService(service: ServiceType) {
    setActiveService(service);
    setEditingHour(null);
    setSaveError("");
  }

  function startEditing(item: ServiceHour) {
    setSaveError("");

    setEditingHour({
      ...item,
      preorder_start: shortTime(item.preorder_start),
      opening_time: shortTime(item.opening_time),
      first_scheduled_time: shortTime(item.first_scheduled_time),
      last_scheduled_time: shortTime(item.last_scheduled_time),
      closing_time: shortTime(item.closing_time),
    });
  }

  function updateEditingHour<K extends keyof ServiceHour>(
    key: K,
    value: ServiceHour[K],
  ) {
    setEditingHour((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [key]: value,
      };
    });
  }

  async function handleSave() {
    if (!editingHour || saving) {
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const response = await fetch("/api/admin/store-hours", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingHour.id,
          is_enabled: editingHour.is_enabled,
          preorder_start: shortTime(editingHour.preorder_start),
          opening_time: shortTime(editingHour.opening_time),
          first_scheduled_time: shortTime(editingHour.first_scheduled_time),
          last_scheduled_time: shortTime(editingHour.last_scheduled_time),
          closing_time: shortTime(editingHour.closing_time),
          slot_interval_minutes: editingHour.slot_interval_minutes,
        }),
      });

      if (response.status === 401) {
        router.replace("/auth");
        return;
      }

      if (response.status === 403) {
        router.replace("/");
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Kunne ikke gemme ændringer.");
      }

      const updatedHour = data?.hour as ServiceHour | undefined;

      if (!updatedHour) {
        throw new Error("Serveren returnerede ingen åbningstid.");
      }

      setHours((current) =>
        current.map((item) =>
          item.id === updatedHour.id ? updatedHour : item,
        ),
      );

      setEditingHour(null);
      setSaveError("");
    } catch (saveRequestError) {
      setSaveError(
        saveRequestError instanceof Error
          ? saveRequestError.message
          : "Kunne ikke gemme ændringer.",
      );
    } finally {
      setSaving(false);
    }
  }

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
          onClick={() => selectService("pickup")}
        >
          Afhentning
        </button>

        <button
          type="button"
          className={`${styles.tab} ${
            activeService === "delivery" ? styles.activeTab : ""
          }`}
          onClick={() => selectService("delivery")}
        >
          Levering
        </button>
      </div>

      <div
        className={editingHour ? styles.contentGrid : styles.contentGridSingle}
      >
        <section className={styles.week}>
          {days.map((day) => {
            const item = visibleHours.find(
              (hour) => hour.day_of_week === day.id,
            );

            return (
              <article className={styles.dayCard} key={day.id}>
                <div className={styles.dayTop}>
                  <strong className={styles.dayName}>{day.label}</strong>

                  <div className={styles.dayActions}>
                    {item && (
                      <span
                        className={`${styles.status} ${
                          item.is_enabled
                            ? styles.statusActive
                            : styles.statusClosed
                        }`}
                      >
                        {item.is_enabled ? "Aktiv" : "Lukket"}
                      </span>
                    )}

                    {item && (
                      <button
                        type="button"
                        className={styles.editButton}
                        onClick={() => startEditing(item)}
                      >
                        Rediger
                      </button>
                    )}
                  </div>
                </div>

                {item ? (
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
                ) : (
                  <p className={styles.error}>Mangler data</p>
                )}
              </article>
            );
          })}
        </section>

        {editingHour && (
          <aside className={styles.editor}>
            <div className={styles.editorHeader}>
              <div>
                <h2>Rediger</h2>

                <p>
                  {
                    days.find((day) => day.id === editingHour.day_of_week)
                      ?.label
                  }
                  {" · "}
                  {editingHour.service_type === "pickup"
                    ? "Afhentning"
                    : "Levering"}
                </p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() => {
                  setEditingHour(null);
                  setSaveError("");
                }}
                aria-label="Luk"
              >
                ×
              </button>
            </div>

            <label className={styles.switchRow}>
              <span>Aktiv</span>

              <input
                type="checkbox"
                checked={editingHour.is_enabled}
                onChange={(event) =>
                  updateEditingHour("is_enabled", event.target.checked)
                }
              />
            </label>

            <TimeField
              label="Forudbestilling fra"
              value={shortTime(editingHour.preorder_start)}
              onChange={(value) => updateEditingHour("preorder_start", value)}
            />

            <TimeField
              label="Åbner"
              value={shortTime(editingHour.opening_time)}
              onChange={(value) => updateEditingHour("opening_time", value)}
            />

            <TimeField
              label="Første tid"
              value={shortTime(editingHour.first_scheduled_time)}
              onChange={(value) =>
                updateEditingHour("first_scheduled_time", value)
              }
            />

            <TimeField
              label="Sidste tid"
              value={shortTime(editingHour.last_scheduled_time)}
              onChange={(value) =>
                updateEditingHour("last_scheduled_time", value)
              }
            />

            <TimeField
              label="Lukker"
              value={shortTime(editingHour.closing_time)}
              onChange={(value) => updateEditingHour("closing_time", value)}
            />

            <label className={styles.field}>
              <span>Interval</span>

              <select
                value={editingHour.slot_interval_minutes}
                onChange={(event) =>
                  updateEditingHour(
                    "slot_interval_minutes",
                    Number(event.target.value),
                  )
                }
              >
                {[5, 10, 15, 20, 30, 45, 60].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} min.
                  </option>
                ))}
              </select>
            </label>

            {saveError && <p className={styles.saveError}>{saveError}</p>}

            <div className={styles.editorActions}>
              <button
                type="button"
                className={styles.cancelButton}
                disabled={saving}
                onClick={() => {
                  setEditingHour(null);
                  setSaveError("");
                }}
              >
                Annuller
              </button>

              <button
                type="button"
                className={styles.saveButton}
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? "Gemmer..." : "Gem ændringer"}
              </button>
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}
