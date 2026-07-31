"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaFacebookF } from "react-icons/fa";
import { Eye, EyeOff, LockKeyhole, Mail, Phone, User } from "lucide-react";
import styles from "./auth.module.css";

type AuthMode = "login" | "register";
type OAuthProvider = "google" | "apple" | "facebook";

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<AuthMode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isLogin = mode === "login";

  const switchMode = (nextMode: AuthMode) => {
    if (loading) return;

    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleOAuthLogin = async (
    provider: "google" | "apple" | "facebook",
  ) => {
    setError("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();
    const normalizedPhone = phone.trim();

    if (!normalizedEmail || !password) {
      setError("Indtast både e-mail og adgangskode.");
      return;
    }

    if (!isLogin) {
      if (!normalizedName) {
        setError("Indtast venligst dit fulde navn.");
        return;
      }

      if (password.length < 6) {
        setError("Adgangskoden skal være mindst 6 tegn.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Adgangskoderne er ikke ens. Prøv igen.");
        return;
      }
    }

    setLoading(true);

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";

    const payload = isLogin
      ? {
          email: normalizedEmail,
          password,
        }
      : {
          email: normalizedEmail,
          password,
          full_name: normalizedName,
          phone: normalizedPhone,
        };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            (isLogin ? "Login mislykkedes." : "Kontoen kunne ikke oprettes."),
        );
      }

      if (isLogin) {
        router.push("/");
        router.refresh();
        return;
      }

      setMode("login");
      setPassword("");
      setConfirmPassword("");
      setFullName("");
      setPhone("");
      setShowPassword(false);
      setShowConfirmPassword(false);

      setError("Din konto er oprettet. Du kan nu logge ind.");
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Der opstod en uventet fejl.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <header className={styles.authHeader}>
          <span className={styles.eyebrow}>Gastronomia 3300</span>

          <h1 className={styles.title}>
            {isLogin ? "Velkommen tilbage" : "Opret din konto"}
          </h1>

          <p className={styles.subtitle}>
            {isLogin
              ? "Log ind og fortsæt din bestilling uden at indtaste dine oplysninger igen."
              : "Gem dine kontaktoplysninger og få en hurtigere bestillingsoplevelse."}
          </p>
        </header>

        <div
          className={styles.toggleWrapper}
          role="tablist"
          aria-label="Vælg login eller registrering"
        >
          <button
            type="button"
            role="tab"
            aria-selected={isLogin}
            className={`${styles.toggleBtn} ${isLogin ? styles.active : ""}`}
            onClick={() => switchMode("login")}
          >
            Log ind
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={!isLogin}
            className={`${styles.toggleBtn} ${!isLogin ? styles.active : ""}`}
            onClick={() => switchMode("register")}
          >
            Opret konto
          </button>
        </div>

        <div className={styles.oauthSection}>
          <button
            type="button"
            className={styles.oauthButton}
            onClick={() => handleOAuthLogin("google")}
            disabled={loading}
          >
            <FcGoogle size={20} aria-hidden="true" />
            <span>Fortsæt med Google</span>
          </button>

          <div className={styles.oauthGrid}>
            <button
              type="button"
              className={styles.oauthButton}
              onClick={() => handleOAuthLogin("apple")}
              disabled={loading}
            >
              <FaApple size={20} aria-hidden="true" />
              <span>Apple</span>
            </button>

            <button
              type="button"
              className={styles.oauthButton}
              onClick={() => handleOAuthLogin("facebook")}
              disabled={loading}
            >
              <FaFacebookF
                size={20}
                aria-hidden="true"
                className={styles.facebookIcon}
              />
              <span>Facebook</span>
            </button>
          </div>
        </div>

        <div className={styles.divider}>
          <span>eller fortsæt med e-mail</span>
        </div>

        {error && (
          <div className={styles.errorMsg} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {!isLogin && (
            <div className={styles.inputGroup}>
              <label className={styles.label} htmlFor="full-name">
                Fulde navn
              </label>

              <div className={styles.inputWrapper}>
                <User
                  size={18}
                  className={styles.inputIcon}
                  aria-hidden="true"
                />

                <input
                  id="full-name"
                  type="text"
                  className={styles.input}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  placeholder="Mads Jensen"
                  autoComplete="name"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="email">
              E-mail
            </label>

            <div className={styles.inputWrapper}>
              <Mail size={18} className={styles.inputIcon} aria-hidden="true" />

              <input
                id="email"
                type="email"
                className={styles.input}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="din@email.dk"
                autoComplete="email"
                inputMode="email"
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <div className={styles.labelRow}>
              <label className={styles.label} htmlFor="password">
                Adgangskode
              </label>

              {isLogin && (
                <button
                  type="button"
                  className={styles.forgotPassword}
                  disabled={loading}
                >
                  Glemt adgangskode?
                </button>
              )}
            </div>
            <div className={styles.inputWrapper}>
              <LockKeyhole
                size={18}
                className={styles.inputIcon}
                aria-hidden="true"
              />

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className={styles.input}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                autoComplete={isLogin ? "current-password" : "new-password"}
                disabled={loading}
              />

              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword((current) => !current)}
                aria-label={
                  showPassword ? "Skjul adgangskode" : "Vis adgangskode"
                }
                disabled={loading}
              >
                {showPassword ? <Eye size={19} /> : <EyeOff size={19} />}
              </button>
            </div>
            Off
          </div>

          {!isLogin && (
            <>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="confirm-password">
                  Gentag adgangskode
                </label>

                <div className={styles.inputWrapper}>
                  <LockKeyhole
                    size={18}
                    className={styles.inputIcon}
                    aria-hidden="true"
                  />

                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    className={styles.input}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Skjul adgangskode"
                        : "Vis adgangskode"
                    }
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <Eye size={19} />
                    ) : (
                      <EyeOff size={19} />
                    )}
                  </button>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="phone">
                  Telefon
                </label>

                <div className={styles.inputWrapper}>
                  <Phone
                    size={18}
                    className={styles.inputIcon}
                    aria-hidden="true"
                  />

                  <input
                    id="phone"
                    type="tel"
                    className={styles.input}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+45 12 34 56 78"
                    autoComplete="tel"
                    inputMode="tel"
                    disabled={loading}
                  />
                </div>
              </div>
            </>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Arbejder..." : isLogin ? "Log ind" : "Opret konto"}
          </button>
        </form>

        <footer className={styles.footerText}>
          <p>
            {isLogin ? "Har du ikke en konto?" : "Har du allerede en konto?"}{" "}
            <button
              type="button"
              className={styles.textLink}
              onClick={() => switchMode(isLogin ? "register" : "login")}
              disabled={loading}
            >
              {isLogin ? "Opret en her" : "Log ind her"}
            </button>
          </p>
        </footer>
      </section>
    </main>
  );
}
