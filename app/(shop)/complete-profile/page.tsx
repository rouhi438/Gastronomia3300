"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mail, Phone, User } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  getProfileCompletionStatus,
  getProfileDestination,
} from "@/lib/profile";
import styles from "./complete-profile.module.css";

type CompleteProfileErrorKey =
  | "loadFailed"
  | "nameRequired"
  | "emailRequired"
  | "phoneRequired"
  | "saveFailed";

export default function CompleteProfilePage() {
  const router = useRouter();
  const t = useTranslations("CompleteProfile");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorKey, setErrorKey] = useState<CompleteProfileErrorKey | null>(
    null,
  );

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/auth");
        return;
      }

      const {
        profile,
        isComplete,
        error: profileError,
      } = await getProfileCompletionStatus(supabase, user.id);

      if (profileError) {
        console.error(
          "Profile completion check failed while loading complete-profile page:",
          profileError.message,
        );

        setErrorKey("loadFailed");
        setLoading(false);
        return;
      }

      if (isComplete) {
        router.replace(getProfileDestination(true));
        return;
      }

      setFullName(
        profile?.full_name?.trim() ||
          (typeof user.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : "") ||
          (typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : ""),
      );

      setEmail(profile?.email ?? user.email ?? "");

      setPhone(
        profile?.phone?.trim() ||
          (typeof user.user_metadata?.phone === "string"
            ? user.user_metadata.phone
            : ""),
      );

      setLoading(false);
    };

    void loadProfile();
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    setErrorKey(null);

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    if (!normalizedName) {
      setErrorKey("nameRequired");
      return;
    }

    if (!normalizedEmail) {
      setErrorKey("emailRequired");
      return;
    }

    if (!normalizedPhone) {
      setErrorKey("phoneRequired");
      return;
    }

    setSaving(true);

    const supabase = createClient();

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/auth");
        return;
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: normalizedName,
          email: normalizedEmail,
          phone: normalizedPhone,
        },
        {
          onConflict: "id",
        },
      );

      if (profileError) {
        throw profileError;
      }

      router.replace("/profile");
      router.refresh();
    } catch (caughtError: unknown) {
      console.error("Profile save failed:", caughtError);
      setErrorKey("saveFailed");
    } finally {
      setSaving(false);
    }
  };

  const errorMessage =
    errorKey === "loadFailed"
      ? t("errors.loadFailed")
      : errorKey === "nameRequired"
        ? t("errors.nameRequired")
        : errorKey === "emailRequired"
          ? t("errors.emailRequired")
          : errorKey === "phoneRequired"
            ? t("errors.phoneRequired")
            : errorKey === "saveFailed"
              ? t("errors.saveFailed")
              : "";

  if (loading) {
    return (
      <main className={styles.loading}>
        <p>{t("loading")}</p>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <h1 className={styles.title}>{t("title")}</h1>

        <p className={styles.description}>{t("description")}</p>

        {errorMessage && (
          <p role="alert" className={styles.error}>
            {errorMessage}
          </p>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>
              <User size={18} />
              {t("fields.fullName")}
            </span>

            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              required
              disabled={saving}
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              <Mail size={18} />
              {t("fields.email")}
            </span>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              disabled={saving}
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>
              <Phone size={18} />
              {t("fields.phone")}
            </span>

            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              required
              disabled={saving}
              placeholder="+45 12 34 56 78"
              className={styles.input}
            />
          </label>

          <button
            type="submit"
            className={`btn-primary ${styles.submitButton}`}
            disabled={saving}
          >
            {saving ? t("actions.saving") : t("actions.saveAndContinue")}
          </button>
        </form>
      </section>
    </main>
  );
}
