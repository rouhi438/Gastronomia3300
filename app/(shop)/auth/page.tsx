"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./auth.module.css";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true); // true = login, false = register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin && password !== confirmPassword) {
      alert("Adgangskoderne er ikke ens. Prøv igen.");
      return;
    }

    if (isLogin) {
      alert(`Log ind med: ${email}`);
    } else {
      alert(`Opret bruger med: ${email}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Title */}
        <h1 className={styles.title}>{isLogin ? "Log ind" : "Opret bruger"}</h1>
        <p className={styles.subtitle}>
          {isLogin
            ? "Velkommen tilbage! Log ind for at bestille."
            : "Opret en konto og få adgang til vores menu."}
        </p>

        {/* Toggle between Login and Register */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>E-mail</label>
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="din@email.dk"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Adgangskode</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? "Skjul adgangskode" : "Vis adgangskode"
                }
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className={styles.inputGroup}>
              <label className={styles.label}>Gentag adgangskode</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className={styles.input}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword
                      ? "Skjul adgangskode"
                      : "Vis adgangskode"
                  }
                >
                  {showConfirmPassword ? (
                    <Eye size={20} />
                  ) : (
                    <EyeOff size={20} />
                  )}
                </button>
              </div>
            </div>
          )}

          <button type="submit" className="btn-primary">
            {isLogin ? "Log ind" : "Opret konto"}
          </button>
        </form>

        {/* Extra toggle link (text) */}
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
