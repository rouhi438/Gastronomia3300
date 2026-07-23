"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./auth.module.css";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!isLogin && password !== confirmPassword) {
      setError("Adgangskoderne er ikke ens. Prøv igen.");
      setLoading(false);
      return;
    }

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/admin-register";
    const payload = isLogin
      ? { email, password }
      : { email, password, full_name: fullName, phone };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Noget gik galt");
      }

      // ===== Login success =====
      if (isLogin) {
        localStorage.setItem("access_token", data.session.access_token);
        localStorage.setItem("refresh_token", data.session.refresh_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/");
      } else {
        // Register success
        alert("Bruger oprettet! Log ind nu.");
        setIsLogin(true);
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setFullName("");
        setPhone("");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{isLogin ? "Log ind" : "Opret bruger"}</h1>
        <p className={styles.subtitle}>
          {isLogin
            ? "Velkommen tilbage! Log ind for at bestille."
            : "Opret en konto og få adgang til vores menu."}
        </p>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <div className={styles.toggleWrapper}>
          <button
            className={`${styles.toggleBtn} ${isLogin ? styles.active : ""}`}
            onClick={() => setIsLogin(true)}
          >
            Log ind
          </button>
          <button
            className={`${styles.toggleBtn} ${!isLogin ? styles.active : ""}`}
            onClick={() => setIsLogin(false)}
          >
            Opret bruger
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {!isLogin && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Fulde navn</label>
              <input
                type="text"
                className={styles.input}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Mads Jensen"
                autoComplete="given-name"
              />
            </div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label}>E-mail</label>
            <input
              type="email"
              name="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="din@email.dk"
              autoComplete="email"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Adgangskode</label>
            <input
              type="password"
              name="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete={isLogin ? "current-password" : "new-password"}
            />
          </div>

          {!isLogin && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Gentag adgangskode</label>
              <input
                type="password"
                name="password"
                className={styles.input}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>
          )}

          {!isLogin && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Telefon</label>
              <input
                type="tel"
                name="tel"
                className={styles.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+45 12 34 56 78"
                autoComplete="tel"
              />
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{
              width: "100%",
              marginTop: "0.5rem",
              padding: "0.8rem",
              fontSize: "1.1rem",
            }}
            disabled={loading}
          >
            {loading ? "Sender..." : isLogin ? "Log ind" : "Opret konto"}
          </button>
        </form>

        <div className={styles.footerText}>
          {isLogin ? (
            <p>
              Har du ikke en konto?{" "}
              <button
                className={styles.textLink}
                onClick={() => setIsLogin(false)}
              >
                Opret en her
              </button>
            </p>
          ) : (
            <p>
              Har du allerede en konto?{" "}
              <button
                className={styles.textLink}
                onClick={() => setIsLogin(true)}
              >
                Log ind her
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
