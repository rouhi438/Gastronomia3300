"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getCampaignDateRange,
  getCopenhagenDateInput,
} from "@/lib/time/discountCampaignDates";

import styles from "./discount-campaigns.module.css";

type Campaign = {
  id: string;
  name: string;
  code: string;
  discount_percent: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

type CampaignForm = {
  name: string;
  code: string;
  discountPercent: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
};

const emptyForm: CampaignForm = {
  name: "",
  code: "",
  discountPercent: "10",
  isActive: false,
  startDate: "",
  endDate: "",
};

function getCampaignStatus(campaign: Campaign, now: number) {
  if (!campaign.is_active) return "Deaktiveret";

  if (campaign.starts_at && Date.parse(campaign.starts_at) > now) {
    return "Planlagt";
  }

  if (campaign.ends_at && Date.parse(campaign.ends_at) <= now) {
    return "Udløbet";
  }

  return "Aktiv";
}

function formatDate(value: string | null) {
  if (!value) return "Ingen begrænsning";

  return new Intl.DateTimeFormat("da-DK", {
    timeZone: "Europe/Copenhagen",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function DiscountCampaignsPage() {
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCampaigns = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch("/api/admin/discount-campaigns", {
        credentials: "include",
        cache: "no-store",
        signal,
      });

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
        throw new Error(data?.error || "Kunne ikke hente kampagner.");
      }

      return Array.isArray(data?.campaigns)
        ? (data.campaigns as Campaign[])
        : [];
    },
    [router],
  );

  useEffect(() => {
    const controller = new AbortController();

    loadCampaigns(controller.signal)
      .then((data) => {
        if (data && !controller.signal.aborted) {
          setCampaigns(data);
        }
      })
      .catch((fetchError) => {
        if (!controller.signal.aborted) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Kunne ikke hente kampagner.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [loadCampaigns]);

  function startEditing(campaign: Campaign) {
    setEditingId(campaign.id);

    setForm({
      name: campaign.name,
      code: campaign.code,
      discountPercent: String(campaign.discount_percent),
      isActive: campaign.is_active,
      startDate: getCopenhagenDateInput(campaign.starts_at),
      endDate: getCopenhagenDateInput(campaign.ends_at, true),
    });

    setFormError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    setFormError("");
    setSuccess("");

    const name = form.name.trim();
    const code = form.code.trim().toUpperCase();
    const discountPercent = Number(form.discountPercent);

    if (!name || name.length > 120) {
      setFormError("Indtast et gyldigt kampagnenavn.");
      return;
    }

    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
      setFormError("Rabatkoden skal være 3-32 tegn.");
      return;
    }

    if (
      !Number.isInteger(discountPercent) ||
      discountPercent < 1 ||
      discountPercent > 100
    ) {
      setFormError("Rabatprocent skal være mellem 1 og 100.");
      return;
    }

    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setFormError("Slutdato skal være efter eller lig med startdato.");
      return;
    }

    const dateRange = getCampaignDateRange(form.startDate, form.endDate);

    if (!dateRange) {
      setFormError("Ugyldig kampagneperiode.");
      return;
    }

    const payload = {
      name,
      code,
      discount_percent: discountPercent,
      is_active: form.isActive,
      starts_at: dateRange.startsAt,
      ends_at: dateRange.endsAt,
    };

    setSaving(true);

    try {
      const endpoint = editingId
        ? `/api/admin/discount-campaigns/${editingId}`
        : "/api/admin/discount-campaigns";

      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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
        throw new Error(data?.error || "Kunne ikke gemme kampagnen.");
      }

      const wasEditing = Boolean(editingId);
      resetForm();

      setSuccess(
        wasEditing ? "Kampagnen er opdateret." : "Kampagnen er oprettet.",
      );

      const updatedCampaigns = await loadCampaigns();

      if (updatedCampaigns) {
        setCampaigns(updatedCampaigns);
        setError("");
      }
    } catch (saveError) {
      setFormError(
        saveError instanceof Error
          ? saveError.message
          : "Kunne ikke gemme kampagnen.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.container}>
      <header className={styles.pageHeader}>
        <h1 className={styles.title}>Rabatkampagner</h1>
        <p className={styles.subtitle}>
          Opret og administrer rabatkoder og kampagneperioder.
        </p>
      </header>

      <section className={styles.formCard}>
        <h2 className={styles.sectionTitle}>
          {editingId ? "Rediger kampagne" : "Opret kampagne"}
        </h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Kampagnenavn</span>
              <input
                required
                maxLength={120}
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Facebook kampagne"
              />
            </label>

            <label className={styles.field}>
              <span>Rabatkode</span>
              <input
                required
                maxLength={32}
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="FB10"
                autoCapitalize="characters"
              />
            </label>

            <label className={styles.field}>
              <span>Rabatprocent (%)</span>
              <input
                required
                type="number"
                min={1}
                max={100}
                step={1}
                value={form.discountPercent}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    discountPercent: event.target.value,
                  }))
                }
              />
            </label>

            <label className={styles.checkboxField}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              <span>Kampagnen er aktiveret</span>
            </label>

            <label className={styles.field}>
              <span>Startdato (valgfri)</span>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
              />
            </label>

            <label className={styles.field}>
              <span>Slutdato (valgfri)</span>
              <input
                type="date"
                value={form.endDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <p className={styles.helperText}>
            Datoer gælder hele dagen i dansk tid (Europe/Copenhagen). Tomme
            datoer betyder ingen tidsbegrænsning.
          </p>

          {formError && (
            <p className={styles.error} role="alert">
              {formError}
            </p>
          )}

          {success && (
            <p className={styles.success} role="status">
              {success}
            </p>
          )}

          <div className={styles.formActions}>
            <button
              type="submit"
              disabled={saving}
              className={styles.primaryButton}
            >
              {saving
                ? "Gemmer..."
                : editingId
                  ? "Gem ændringer"
                  : "Opret kampagne"}
            </button>

            {editingId && (
              <button
                type="button"
                disabled={saving}
                className={styles.secondaryButton}
                onClick={resetForm}
              >
                Annuller
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Eksisterende kampagner</h2>

        {loading && <p>Indlæser kampagner...</p>}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {!loading && !error && campaigns.length === 0 && (
          <div className={styles.emptyState}>Ingen rabatkampagner endnu.</div>
        )}

        {!loading && !error && (
          <div className={styles.campaignList}>
            {campaigns.map((campaign) => {
              const status = getCampaignStatus(campaign, Date.now());

              return (
                <article key={campaign.id} className={styles.campaignCard}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.campaignName}>{campaign.name}</h3>
                      <code className={styles.code}>{campaign.code}</code>
                    </div>

                    <span className={styles.status}>{status}</span>
                  </div>

                  <strong className={styles.percent}>
                    {campaign.discount_percent}% rabat
                  </strong>

                  <div className={styles.dates}>
                    <p>Start: {formatDate(campaign.starts_at)}</p>
                    <p>
                      Slut:{" "}
                      {campaign.ends_at
                        ? getCopenhagenDateInput(campaign.ends_at, true)
                        : "Ingen begrænsning"}
                    </p>
                  </div>

                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => startEditing(campaign)}
                  >
                    Rediger
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
