"use client";

import { useState } from "react";
import { User, Mail, Phone, Lock } from "lucide-react";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const [user, setUser] = useState({
    name: "Abbas Rouhi",
    email: "abbas@gastronomia.dk",
    phone: "+45 40 40 41 83",
  });

  const [isEditing, setIsEditing] = useState(false);

  // get first letter of name
  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  // different color for every user
  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 60%, 50%)`;
  };

  const initials = getInitials(user.name);
  const avatarColor = getAvatarColor(user.name);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Profilen er opdateret!");
    setIsEditing(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Min profil</h1>

        {/* ===== AVATAR (text-based) ===== */}
        <div className={styles.avatarSection}>
          <div
            className={styles.avatarCircle}
            style={{ backgroundColor: avatarColor }}
          >
            <span className={styles.avatarInitials}>{initials}</span>
          </div>
          <p className={styles.avatarName}>{user.name}</p>
        </div>

        {/* ===== FORM ===== */}
        <form onSubmit={handleSave} className={styles.form}>
          {/* Name */}
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
            />
          </div>

          {/* Email */}
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
            />
          </div>

          {/* Phone */}
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
            />
          </div>

          {/* ===== Change Password ===== */}
          <div className={styles.passwordSection}>
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() =>
                alert("Link til at skifte kodeord sendes til din e-mail.")
              }
            >
              <Lock size={18} />
              <span>Skift kodeord</span>
            </button>
          </div>

          {/* ===== Actions ===== */}
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

        {/* ===== Logout ===== */}
        <div className={styles.logoutSection}>
          <button
            type="button"
            className={styles.logoutBtn}
            onClick={() => alert("Du er blevet logget ud.")}
          >
            Log ud
          </button>
        </div>
      </div>
    </div>
  );
}
