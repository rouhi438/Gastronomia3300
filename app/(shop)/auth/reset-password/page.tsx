"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import styles from "../auth.module.css";

export default function ResetPasswordPage() {
  const t = useTranslations("ResetPassword");
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    if (password.length < 6) {
      setError(t("errors.minLength"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("errors.mismatch"));
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(t("errors.invalidLink"));
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        console.error("Password recovery update failed:", updateError);
        setError(t("errors.updateFailed"));
        return;
      }

      await supabase.auth.signOut();

      setPassword("");
      setConfirmPassword("");
      setComplete(true);
    } catch (caughtError) {
      console.error("Unexpected password recovery error:", caughtError);
      setError(t("errors.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (complete) {
    return (
      <main className={styles.container}>
        <section className={styles.card}>
          <header className={styles.authHeader}>
            <span className={styles.eyebrow}>Gastronomia 3300</span>

            <h1 className={styles.title}>{t("completeTitle")}</h1>

            <p className={styles.subtitle}>{t("completeText")}</p>
          </header>

          <Link
            href="/auth"
            className="btn-primary"
            style={{
              display: "flex",
              justifyContent: "center",
              textDecoration: "none",
            }}
          >
            {t("login")}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <header className={styles.authHeader}>
          <span className={styles.eyebrow}>Gastronomia 3300</span>

          <h1 className={styles.title}>{t("title")}</h1>

          <p className={styles.subtitle}>{t("subtitle")}</p>
        </header>

        {error && (
          <div className={styles.errorMsg} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="new-password">
              {t("newPassword")}
            </label>

            <div className={styles.inputWrapper}>
              <LockKeyhole
                size={18}
                className={styles.inputIcon}
                aria-hidden="true"
              />

              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                className={styles.input}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword((current) => !current)}
                aria-label={
                  showPassword ? t("hidePassword") : t("showPassword")
                }
                disabled={loading}
              >
                {showPassword ? <Eye size={19} /> : <EyeOff size={19} />}
              </button>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="confirm-new-password">
              {t("confirmPassword")}
            </label>

            <div className={styles.inputWrapper}>
              <LockKeyhole
                size={18}
                className={styles.inputIcon}
                aria-hidden="true"
              />

              <input
                id="confirm-new-password"
                type={showConfirmPassword ? "text" : "password"}
                className={styles.input}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowConfirmPassword((current) => !current)}
                aria-label={
                  showConfirmPassword ? t("hidePassword") : t("showPassword")
                }
                disabled={loading}
              >
                {showConfirmPassword ? <Eye size={19} /> : <EyeOff size={19} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? t("updating") : t("update")}
          </button>
        </form>
      </section>
    </main>
  );
}
