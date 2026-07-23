"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, Lock } from "lucide-react";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) {
      router.push("/auth");
      return;
    }
    try {
      const parsed = JSON.parse(userData);
      setUser({
        name: parsed.user_metadata?.full_name || parsed.email || "",
        email: parsed.email || "",
        phone: parsed.user_metadata?.phone || "",
      });
    } catch {
      router.push("/auth");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 60%, 50%)`;
  };

  const initials = getInitials(user.name || "U");
  const avatarColor = getAvatarColor(user.name || "User");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        parsed.user_metadata.full_name = user.name;
        parsed.user_metadata.phone = user.phone;
        parsed.email = user.email;
        localStorage.setItem("user", JSON.stringify(parsed));
      } catch {}
    }
    alert("Profilen er opdateret!");
    setIsEditing(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage("");

    if (newPassword !== confirmNewPassword) {
      setPasswordMessage("De nye adgangskoder er ikke ens.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage("Adgangskoden skal være mindst 6 tegn.");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      setPasswordMessage("Du er ikke logget ind.");
      return;
    }

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setPasswordMessage(data.error || "Noget gik galt.");
      return;
    }

    setPasswordMessage("Adgangskode opdateret!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.push("/");
  };

  if (loading) {
    return <div className={styles.loading}>Indlæser...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Min profil</h1>

        <div className={styles.avatarSection}>
          <div
            className={styles.avatarCircle}
            style={{ backgroundColor: avatarColor }}
          >
            <span className={styles.avatarInitials}>{initials}</span>
          </div>
          <p className={styles.avatarName}>{user.name}</p>
        </div>

        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <User size={18} /> Fulde navn
            </label>
            <input
              type="text"
              className={styles.input}
              value={user.name}
              onChange={(e) => setUser({ ...user, name: e.target.value })}
              disabled={!isEditing}
              placeholder="Dit fulde navn"
              autoComplete="given-name"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <Mail size={18} /> E-mail
            </label>
            <input
              type="email"
              className={styles.input}
              value={user.email}
              onChange={(e) => setUser({ ...user, email: e.target.value })}
              disabled={!isEditing}
              placeholder="din@email.dk"
              autoComplete="email"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              <Phone size={18} /> Telefon
            </label>
            <input
              type="tel"
              className={styles.input}
              value={user.phone}
              onChange={(e) => setUser({ ...user, phone: e.target.value })}
              disabled={!isEditing}
              placeholder="+45 12 34 56 78"
              autoComplete="tel"
            />
          </div>

          <div className={styles.actionRow}>
            {!isEditing ? (
              <button
                type="button"
                className="btn-primary"
                style={{ width: "100%", padding: "0.8rem", fontSize: "1.1rem" }}
                onClick={() => setIsEditing(true)}
              >
                Rediger profil
              </button>
            ) : (
              <>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: "0.8rem", fontSize: "1.1rem" }}
                >
                  Gem ændringer
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsEditing(false)}
                >
                  Fortryd
                </button>
              </>
            )}
          </div>
        </form>

        <div className={styles.passwordSection}>
          <h4 className={styles.passwordTitle}>
            <Lock size={18} style={{ marginRight: "0.5rem" }} />
            Skift adgangskode
          </h4>
          {passwordMessage && (
            <div
              className={
                passwordMessage.includes("opdateret")
                  ? styles.successMsg
                  : styles.errorMsg
              }
            >
              {passwordMessage}
            </div>
          )}
          <form onSubmit={handlePasswordChange} className={styles.passwordForm}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Nuværende adgangskode</label>
              <input
                type="password"
                className={styles.input}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Ny adgangskode</label>
              <input
                type="password"
                className={styles.input}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Gentag ny adgangskode</label>
              <input
                type="password"
                className={styles.input}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              className="btn-secondary"
              style={{ width: "100%" }}
            >
              Opdater adgangskode
            </button>
          </form>
        </div>

        <div className={styles.logoutSection}>
          <button
            type="button"
            className={styles.logoutBtn}
            onClick={handleLogout}
          >
            Log ud
          </button>
        </div>
      </div>
    </div>
  );
}
