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

type ServiceOverrideMode = "paused" | "closed";

type ServiceOverrideAction = "pause_30" | "pause_60" | "close_today" | "reopen";

type ServiceOverride = {
  service_type: ServiceType;
  mode: ServiceOverrideMode;
  override_until: string;
  reason: string | null;
  created_at?: string;
  updated_at?: string;
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

function formatOverrideUntil(value: string) {
  return new Intl.DateTimeFormat("da-DK", {
    timeZone: "Europe/Copenhagen",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
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
  const [serviceOverrides, setServiceOverrides] = useState<ServiceOverride[]>(
    [],
  );

  const [overrideSaving, setOverrideSaving] = useState(false);

  const [overrideError, setOverrideError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch("/api/admin/store-hours", {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      }),

      fetch("/api/admin/service-overrides", {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      }),
    ])
      .then(async ([hoursResponse, overridesResponse]) => {
        if (hoursResponse.status === 401 || overridesResponse.status === 401) {
          router.replace("/auth");
          return null;
        }

        if (hoursResponse.status === 403 || overridesResponse.status === 403) {
          router.replace("/");
          return null;
        }

        const [hoursData, overridesData] = await Promise.all([
          hoursResponse.json().catch(() => null),
          overridesResponse.json().catch(() => null),
        ]);

        if (!hoursResponse.ok) {
          throw new Error(hoursData?.error || "Kunne ikke hente åbningstider.");
        }

        if (!overridesResponse.ok) {
          throw new Error(
            overridesData?.error ||
              "Kunne ikke hente midlertidig servicestatus.",
          );
        }

        return {
          hours: Array.isArray(hoursData?.hours) ? hoursData.hours : [],

          overrides: Array.isArray(overridesData?.overrides)
            ? overridesData.overrides
            : [],
        };
      })
      .then((data) => {
        if (!data || controller.signal.aborted) {
          return;
        }

        setHours(data.hours);
        setServiceOverrides(data.overrides);

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

  /*
   * On mobile the editor becomes a modal.
   * Prevent the page behind it from scrolling.
   */
  useEffect(() => {
    if (!editingHour) {
      return;
    }

    const mobileQuery = window.matchMedia("(max-width: 600px)");

    if (!mobileQuery.matches) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || saving) {
        return;
      }

      setEditingHour(null);
      setSaveError("");
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editingHour, saving]);

  const visibleHours = useMemo(() => {
    return hours.filter((item) => item.service_type === activeService);
  }, [hours, activeService]);

  const activeOverride = useMemo(() => {
    return (
      serviceOverrides.find(
        (override) => override.service_type === activeService,
      ) ?? null
    );
  }, [serviceOverrides, activeService]);

  async function handleOverrideAction(action: ServiceOverrideAction) {
    if (overrideSaving) {
      return;
    }

    setOverrideSaving(true);
    setOverrideError("");

    try {
      const response = await fetch("/api/admin/service-overrides", {
        method: "PATCH",
        credentials: "include",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          service_type: activeService,
          action,
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
        throw new Error(data?.error || "Kunne ikke ændre servicestatus.");
      }

      const updatedOverride = data?.override as ServiceOverride | null;

      setServiceOverrides((current) => {
        const withoutService = current.filter(
          (override) => override.service_type !== activeService,
        );

        if (!updatedOverride) {
          return withoutService;
        }

        return [...withoutService, updatedOverride];
      });
    } catch (requestError) {
      setOverrideError(
        requestError instanceof Error
          ? requestError.message
          : "Kunne ikke ændre servicestatus.",
      );
    } finally {
      setOverrideSaving(false);
    }
  }

  function closeEditor() {
    if (saving) {
      return;
    }

    setEditingHour(null);
    setSaveError("");
  }

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

      /*
       * Closing editingHour also closes
       * the mobile modal after save.
       */
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

      <section className={styles.overrideCard}>
        <div className={styles.overrideTop}>
          <div>
            <h2 className={styles.overrideTitle}>Midlertidig styring</h2>

            <p className={styles.overrideSubtitle}>
              {activeService === "pickup" ? "Afhentning" : "Levering"}
            </p>
          </div>

          <span
            className={`${styles.overrideStatus} ${
              !activeOverride
                ? styles.overrideNormal
                : activeOverride.mode === "paused"
                  ? styles.overridePaused
                  : styles.overrideClosed
            }`}
          >
            {!activeOverride
              ? "Normal drift"
              : activeOverride.mode === "paused"
                ? "Pauset"
                : "Lukket"}
          </span>
        </div>

        {activeOverride ? (
          <div className={styles.overrideCurrent}>
            <strong>
              {activeOverride.reason ||
                (activeOverride.mode === "paused"
                  ? "Servicen er midlertidigt pauset."
                  : "Servicen er midlertidigt lukket.")}
            </strong>

            <span className={styles.overrideUntil}>
              {activeOverride.mode === "paused"
                ? "Pauset indtil kl. "
                : "Lukket indtil kl. "}
              {formatOverrideUntil(activeOverride.override_until)}
            </span>
          </div>
        ) : (
          <p className={styles.overrideDescription}>
            Servicen følger de normale åbningstider.
          </p>
        )}

        <div className={styles.overrideActions}>
          <button
            type="button"
            className={styles.overrideButton}
            disabled={overrideSaving}
            onClick={() => handleOverrideAction("pause_30")}
          >
            Pause 30 min.
          </button>

          <button
            type="button"
            className={styles.overrideButton}
            disabled={overrideSaving}
            onClick={() => handleOverrideAction("pause_60")}
          >
            Pause 60 min.
          </button>

          <button
            type="button"
            className={styles.closeServiceButton}
            disabled={overrideSaving}
            onClick={() => handleOverrideAction("close_today")}
          >
            Luk resten af dagen
          </button>

          {activeOverride && (
            <button
              type="button"
              className={styles.reopenButton}
              disabled={overrideSaving}
              onClick={() => handleOverrideAction("reopen")}
            >
              Genåbn nu
            </button>
          )}
        </div>

        {overrideSaving && (
          <p className={styles.overrideSaving}>Opdaterer...</p>
        )}

        {overrideError && (
          <p className={styles.overrideError}>{overrideError}</p>
        )}
      </section>

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
          <div
            className={styles.editorLayer}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeEditor();
              }
            }}
          >
            <aside
              className={styles.editor}
              aria-labelledby="opening-hours-editor-title"
            >
              <div className={styles.editorHeader}>
                <div>
                  <h2 id="opening-hours-editor-title">Rediger</h2>

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
                  onClick={closeEditor}
                  disabled={saving}
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
                  onClick={closeEditor}
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
          </div>
        )}
      </div>
    </main>
  );
}
