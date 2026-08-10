"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { extraGroups, menuData, type MenuItem } from "@/data/menu";

import styles from "./admin-menu.module.css";

type AvailabilityStatus = "active" | "until_next_opening" | "manual_off";

type MenuStatusRecord = {
  menu_item_id: number;
  status: AvailabilityStatus;
  available_again_at: string | null;
  updated_at?: string;
};

type MenuOptionStatusRecord = {
  menu_item_id: number;
  option_key: string;
  status: AvailabilityStatus;
  available_again_at: string | null;
  updated_at?: string;
};

type EditingOption = {
  item: MenuItem;
  optionName: string;
  optionKey: string;
};

type AvailabilityRecord = {
  status: AvailabilityStatus;
  available_again_at: string | null;
};

const excludedAdminItemIds = [300, 301, 302, 303];

const adminMenuData = menuData.filter(
  (item) => !excludedAdminItemIds.includes(item.id),
);

const categoryLabels: Record<string, string> = {
  pizza: "Pizza",
  "ala-carte": "Ala Carte",
  hovedretter: "Hovedretter",
  pasta: "Pasta",
  salad: "Salat",
  fries: "Pommes Frites",
  børn: "Børn menu",
  burger: "Burger",
  menuer: "Menuer",
  drikke: "Drikkevarer",
  dyppelse: "Ekstra dyppelse",
};

function optionNameToKey(name: string) {
  return name.toLowerCase().replace(/\s+/g, "");
}

function optionStatusKey(menuItemId: number, optionKey: string) {
  return `${menuItemId}:${optionKey}`;
}

function getEffectiveStatus(
  record: AvailabilityRecord | undefined,
): AvailabilityStatus {
  if (!record) {
    return "active";
  }

  if (
    record.status === "until_next_opening" &&
    record.available_again_at &&
    new Date(record.available_again_at).getTime() <= Date.now()
  ) {
    return "active";
  }

  return record.status;
}

function getStatusLabel(status: AvailabilityStatus) {
  switch (status) {
    case "until_next_opening":
      return "Udsolgt";

    case "manual_off":
      return "Deaktiveret";

    default:
      return "Aktiv";
  }
}

function getPriceLabel(item: MenuItem) {
  const prices = Object.values(item.prices).filter(
    (value): value is number => typeof value === "number" && value > 0,
  );

  if (prices.length === 0) {
    return "Pris efter valg";
  }

  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);

  if (minimum === maximum) {
    return `${minimum} kr.`;
  }

  return `${minimum}–${maximum} kr.`;
}

function formatAvailableAgain(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("da-DK", {
    timeZone: "Europe/Copenhagen",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminMenuPage() {
  const router = useRouter();

  const [statuses, setStatuses] = useState<MenuStatusRecord[]>([]);

  const [optionStatuses, setOptionStatuses] = useState<
    MenuOptionStatusRecord[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeCategory, setActiveCategory] = useState("alle");

  const [search, setSearch] = useState("");

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [editingOption, setEditingOption] = useState<EditingOption | null>(
    null,
  );

  const [editingStatus, setEditingStatus] =
    useState<AvailabilityStatus>("active");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch("/api/admin/menu-status", {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      }),

      fetch("/api/admin/menu-option-status", {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      }),
    ])
      .then(async ([menuResponse, optionResponse]) => {
        if (menuResponse.status === 401 || optionResponse.status === 401) {
          router.replace("/auth");
          return null;
        }

        if (menuResponse.status === 403 || optionResponse.status === 403) {
          router.replace("/");
          return null;
        }

        const [menuPayload, optionPayload] = await Promise.all([
          menuResponse.json().catch(() => null),
          optionResponse.json().catch(() => null),
        ]);

        if (!menuResponse.ok) {
          throw new Error(
            menuPayload?.error || "Kunne ikke hente produktstatus.",
          );
        }

        if (!optionResponse.ok) {
          throw new Error(
            optionPayload?.error || "Kunne ikke hente størrelsesstatus.",
          );
        }

        return {
          menuStatuses: Array.isArray(menuPayload?.statuses)
            ? menuPayload.statuses
            : [],

          optionStatuses: Array.isArray(optionPayload?.statuses)
            ? optionPayload.statuses
            : [],
        };
      })
      .then((data) => {
        if (!data || controller.signal.aborted) {
          return;
        }

        setStatuses(data.menuStatuses);
        setOptionStatuses(data.optionStatuses);
        setError("");
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Kunne ikke hente menuen.",
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

  const statusMap = useMemo(() => {
    return new Map(statuses.map((status) => [status.menu_item_id, status]));
  }, [statuses]);

  const optionStatusMap = useMemo(() => {
    return new Map(
      optionStatuses.map((status) => [
        optionStatusKey(status.menu_item_id, status.option_key),
        status,
      ]),
    );
  }, [optionStatuses]);

  const categories = useMemo(() => {
    return Array.from(new Set(adminMenuData.map((item) => item.category)));
  }, []);

  const visibleItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return adminMenuData.filter((item) => {
      if (activeCategory !== "alle" && item.category !== activeCategory) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        item.name.toLowerCase().includes(normalizedSearch) ||
        String(item.menuNumber ?? item.id).includes(normalizedSearch)
      );
    });
  }, [activeCategory, search]);

  function startEditing(item: MenuItem) {
    const record = statusMap.get(item.id);

    setEditingOption(null);
    setEditingItem(item);

    setEditingStatus(getEffectiveStatus(record));

    setSaveError("");
  }

  function startEditingOption(item: MenuItem, optionName: string) {
    const optionKey = optionNameToKey(optionName);

    const record = optionStatusMap.get(optionStatusKey(item.id, optionKey));

    setEditingItem(null);

    setEditingOption({
      item,
      optionName,
      optionKey,
    });

    setEditingStatus(getEffectiveStatus(record));

    setSaveError("");
  }

  function closeEditor() {
    if (saving) {
      return;
    }

    setEditingItem(null);
    setEditingOption(null);
    setEditingStatus("active");
    setSaveError("");
  }

  async function handleProductSave() {
    if (!editingItem || saving) {
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const response = await fetch("/api/admin/menu-status", {
        method: "PATCH",
        credentials: "include",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          menu_item_id: editingItem.id,
          status: editingStatus,
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
        throw new Error(data?.error || "Kunne ikke gemme produktstatus.");
      }

      const updatedStatus = data?.status as MenuStatusRecord | undefined;

      if (!updatedStatus) {
        throw new Error("Serveren returnerede ingen produktstatus.");
      }

      setStatuses((current) => {
        if (updatedStatus.status === "active") {
          return current.filter(
            (item) => item.menu_item_id !== updatedStatus.menu_item_id,
          );
        }

        const exists = current.some(
          (item) => item.menu_item_id === updatedStatus.menu_item_id,
        );

        if (!exists) {
          return [...current, updatedStatus];
        }

        return current.map((item) =>
          item.menu_item_id === updatedStatus.menu_item_id
            ? updatedStatus
            : item,
        );
      });

      setEditingItem(null);
      setEditingStatus("active");
    } catch (requestError) {
      setSaveError(
        requestError instanceof Error
          ? requestError.message
          : "Kunne ikke gemme produktstatus.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleOptionSave() {
    if (!editingOption || saving) {
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      const response = await fetch("/api/admin/menu-option-status", {
        method: "PATCH",
        credentials: "include",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          menu_item_id: editingOption.item.id,

          option_key: editingOption.optionKey,

          status: editingStatus,
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
        throw new Error(data?.error || "Kunne ikke gemme størrelsesstatus.");
      }

      const updatedStatus = data?.status as MenuOptionStatusRecord | undefined;

      if (!updatedStatus) {
        throw new Error("Serveren returnerede ingen størrelsesstatus.");
      }

      setOptionStatuses((current) => {
        const matches = (item: MenuOptionStatusRecord) =>
          item.menu_item_id === updatedStatus.menu_item_id &&
          item.option_key === updatedStatus.option_key;

        if (updatedStatus.status === "active") {
          return current.filter((item) => !matches(item));
        }

        const exists = current.some(matches);

        if (!exists) {
          return [...current, updatedStatus];
        }

        return current.map((item) => (matches(item) ? updatedStatus : item));
      });

      setEditingOption(null);
      setEditingStatus("active");
    } catch (requestError) {
      setSaveError(
        requestError instanceof Error
          ? requestError.message
          : "Kunne ikke gemme størrelsesstatus.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.container}>
        <p className={styles.message}>Indlæser menu...</p>
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

  const hasEditor = editingItem !== null || editingOption !== null;

  return (
    <main className={styles.container}>
      <header className={styles.pageHeader}>
        <h1 className={styles.title}>Menu</h1>

        <p className={styles.subtitle}>
          Administrer tilgængeligheden af restaurantens produkter.
        </p>
      </header>

      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.search}
          placeholder="Søg efter produkt..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          className={styles.categorySelect}
          value={activeCategory}
          onChange={(event) => setActiveCategory(event.target.value)}
        >
          <option value="alle">Alle kategorier</option>

          {categories.map((category) => (
            <option key={category} value={category}>
              {categoryLabels[category] ?? category}
            </option>
          ))}
        </select>
      </div>

      <div
        className={hasEditor ? styles.contentGrid : styles.contentGridSingle}
      >
        <section className={styles.productList}>
          {visibleItems.map((item) => {
            const record = statusMap.get(item.id);

            const status = getEffectiveStatus(record);

            return (
              <article key={item.id} className={styles.productCard}>
                <div className={styles.productInfo}>
                  <div className={styles.productTitleRow}>
                    <h2 className={styles.productName}>
                      {item.menuNumber ? `${item.menuNumber}. ` : ""}

                      {item.name}
                    </h2>

                    <span
                      className={`${styles.status} ${
                        status === "active"
                          ? styles.statusActive
                          : status === "until_next_opening"
                            ? styles.statusTemporary
                            : styles.statusOff
                      }`}
                    >
                      {getStatusLabel(status)}
                    </span>
                  </div>

                  <p className={styles.description}>
                    {item.description || "Ingen beskrivelse"}
                  </p>

                  <div className={styles.meta}>
                    <span>{getPriceLabel(item)}</span>

                    <span>
                      {categoryLabels[item.category] ?? item.category}
                    </span>
                  </div>

                  {status === "until_next_opening" &&
                    record?.available_again_at && (
                      <p className={styles.availableAgain}>
                        Aktiv igen{" "}
                        {formatAvailableAgain(record.available_again_at)}
                      </p>
                    )}

                  {item.extraGroupId === "drinkSizes" && (
                    <div className={styles.optionList}>
                      {extraGroups.drinkSizes.map((option) => {
                        const optionKey = optionNameToKey(option.name);

                        const optionRecord = optionStatusMap.get(
                          optionStatusKey(item.id, optionKey),
                        );

                        const optionStatus = getEffectiveStatus(optionRecord);

                        return (
                          <div key={optionKey} className={styles.optionRow}>
                            <div className={styles.optionInfo}>
                              <strong>{option.name}</strong>

                              <span>{option.price} kr.</span>
                            </div>

                            <div className={styles.optionActions}>
                              <span
                                className={`${styles.status} ${
                                  optionStatus === "active"
                                    ? styles.statusActive
                                    : optionStatus === "until_next_opening"
                                      ? styles.statusTemporary
                                      : styles.statusOff
                                }`}
                              >
                                {getStatusLabel(optionStatus)}
                              </span>

                              <button
                                type="button"
                                className={styles.optionEditButton}
                                onClick={() =>
                                  startEditingOption(item, option.name)
                                }
                              >
                                Skift
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className={styles.editButton}
                  onClick={() => startEditing(item)}
                >
                  Skift status
                </button>
              </article>
            );
          })}

          {visibleItems.length === 0 && (
            <p className={styles.empty}>Ingen produkter fundet.</p>
          )}
        </section>

        {editingItem && (
          <aside className={styles.editor}>
            <div className={styles.editorHeader}>
              <div>
                <h2>Skift status</h2>

                <p>
                  {editingItem.menuNumber ? `${editingItem.menuNumber}. ` : ""}

                  {editingItem.name}
                </p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={closeEditor}
                aria-label="Luk"
              >
                ×
              </button>
            </div>

            <div className={styles.statusOptions}>
              <label className={styles.statusOption}>
                <input
                  type="radio"
                  name="product-status"
                  checked={editingStatus === "active"}
                  onChange={() => setEditingStatus("active")}
                />

                <span>
                  <strong>Aktiv</strong>

                  <small>Produktet kan bestilles normalt.</small>
                </span>
              </label>

              <label className={styles.statusOption}>
                <input
                  type="radio"
                  name="product-status"
                  checked={editingStatus === "until_next_opening"}
                  onChange={() => setEditingStatus("until_next_opening")}
                />

                <span>
                  <strong>Udsolgt indtil næste åbning</strong>

                  <small>
                    Produktet bliver automatisk tilgængeligt igen ved næste
                    åbningstid.
                  </small>
                </span>
              </label>

              <label className={styles.statusOption}>
                <input
                  type="radio"
                  name="product-status"
                  checked={editingStatus === "manual_off"}
                  onChange={() => setEditingStatus("manual_off")}
                />

                <span>
                  <strong>Deaktiveret indtil videre</strong>

                  <small>Produktet skal aktiveres manuelt igen.</small>
                </span>
              </label>
            </div>

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
                onClick={handleProductSave}
              >
                {saving ? "Gemmer..." : "Gem ændringer"}
              </button>
            </div>
          </aside>
        )}

        {editingOption && (
          <aside className={styles.editor}>
            <div className={styles.editorHeader}>
              <div>
                <h2>Skift størrelsesstatus</h2>

                <p>
                  {editingOption.item.name}
                  {" · "}
                  {editingOption.optionName}
                </p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={closeEditor}
                aria-label="Luk"
              >
                ×
              </button>
            </div>

            <div className={styles.statusOptions}>
              <label className={styles.statusOption}>
                <input
                  type="radio"
                  name="option-status"
                  checked={editingStatus === "active"}
                  onChange={() => setEditingStatus("active")}
                />

                <span>
                  <strong>Aktiv</strong>

                  <small>Størrelsen kan bestilles.</small>
                </span>
              </label>

              <label className={styles.statusOption}>
                <input
                  type="radio"
                  name="option-status"
                  checked={editingStatus === "until_next_opening"}
                  onChange={() => setEditingStatus("until_next_opening")}
                />

                <span>
                  <strong>Udsolgt indtil næste åbning</strong>

                  <small>Aktiveres automatisk ved næste åbning.</small>
                </span>
              </label>

              <label className={styles.statusOption}>
                <input
                  type="radio"
                  name="option-status"
                  checked={editingStatus === "manual_off"}
                  onChange={() => setEditingStatus("manual_off")}
                />

                <span>
                  <strong>Deaktiveret indtil videre</strong>

                  <small>Skal aktiveres manuelt af administrator.</small>
                </span>
              </label>
            </div>

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
                onClick={handleOptionSave}
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
