"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, User } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  getProfileCompletionStatus,
  getProfileDestination,
} from "@/lib/profile";
import styles from "./complete-profile.module.css";

export default function CompleteProfilePage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
        setError("Profilen kunne ikke indlæses.");
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

    if (saving) return;

    setError("");

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    if (!normalizedName) {
      setError("Indtast venligst dit fulde navn.");
      return;
    }

    if (!normalizedEmail) {
      setError("Indtast venligst din e-mailadresse.");
      return;
    }

    if (!normalizedPhone) {
      setError("Indtast venligst dit telefonnummer.");
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
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Profilen kunne ikke gemmes. Prøv igen.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.loading}>
        <p>Indlæser profil...</p>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <h1 className={styles.title}>Fuldfør din profil</h1>

        <p className={styles.description}>
          Vi skal bruge din e-mail og dit telefonnummer til ordrebekræftelser og
          vigtig kontakt vedrørende din bestilling.
        </p>

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>
              <User size={18} />
              Fulde navn
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
              E-mail
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
              Telefon
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
            {saving ? "Gemmer..." : "Gem og fortsæt"}
          </button>
        </form>
      </section>
    </main>
  );
}
