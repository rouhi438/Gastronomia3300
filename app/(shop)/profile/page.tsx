"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getProfileCompletionStatus,
  getProfileDestination,
} from "@/lib/profile";
import styles from "./profile.module.css";

interface ProfileUser {
  name: string;
  email: string;
  phone: string;
}

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<ProfileUser>({
    name: "",
    email: "",
    phone: "",
  });

  const [originalUser, setOriginalUser] = useState<ProfileUser>({
    name: "",
    email: "",
    phone: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [authProvider, setAuthProvider] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();

      try {
        const {
          data: { user: authUser },
          error,
        } = await supabase.auth.getUser();

        if (error || !authUser) {
          router.replace("/auth");
          return;
        }
        const providers =
          authUser.identities
            ?.map((identity) => identity.provider)
            .filter(Boolean) ?? [];

        const usesPasswordLogin = providers.includes("email");

        setAuthProvider(usesPasswordLogin ? "email" : (providers[0] ?? null));
        const {
          profile,
          isComplete,
          error: profileError,
        } = await getProfileCompletionStatus(supabase, authUser.id);

        if (profileError) {
          console.error(
            "Profile completion check failed while loading profile page:",
            profileError.message,
          );
          router.replace(getProfileDestination(false));
          return;
        }

        if (!isComplete) {
          router.replace(getProfileDestination(false));
          return;
        }

        const profileData: ProfileUser = {
          name: profile?.full_name?.trim() || authUser.email || "",
          email: profile?.email?.trim() || authUser.email || "",
          phone: profile?.phone?.trim() || "",
        };

        setUser(profileData);
        setOriginalUser(profileData);
      } catch {
        router.replace("/auth");
      } finally {
      }
    };

    loadUser();
  }, [router]);

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      return "U";
    }

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

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

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (savingProfile) {
      return;
    }

    const trimmedName = user.name.trim();
    const trimmedEmail = user.email.trim().toLowerCase();
    const trimmedPhone = user.phone.trim();

    if (!trimmedName) {
      alert("Indtast venligst dit fulde navn.");
      return;
    }

    if (!trimmedEmail) {
      alert("Indtast venligst din e-mail.");
      return;
    }

    setSavingProfile(true);

    const supabase = createClient();

    try {
      const emailChanged = trimmedEmail !== originalUser.email.toLowerCase();

      const { data, error } = await supabase.auth.updateUser({
        ...(emailChanged ? { email: trimmedEmail } : {}),
        data: {
          full_name: trimmedName,
          phone: trimmedPhone,
        },
      });

      if (error) {
        throw error;
      }

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: data.user.id,
            full_name: trimmedName,
            email: trimmedEmail,
            phone: trimmedPhone,
          },
          {
            onConflict: "id",
          },
        );

      if (profileUpdateError) {
        throw profileUpdateError;
      }

      const updatedProfile: ProfileUser = {
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
      };

      setUser(updatedProfile);
      setOriginalUser(updatedProfile);
      setIsEditing(false);

      if (emailChanged && data.user.email !== trimmedEmail) {
        alert(
          "Profilen er opdateret. Kontrollér din nye e-mailadresse for at bekræfte ændringen.",
        );
      } else {
        alert("Profilen er opdateret!");
      }

      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Profilen kunne ikke opdateres.";

      alert(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    if (savingProfile) {
      return;
    }

    setUser(originalUser);
    setIsEditing(false);
  };

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (changingPassword) {
      return;
    }

    setPasswordMessage("");

    if (!currentPassword) {
      setPasswordMessage("Indtast din nuværende adgangskode.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordMessage("De nye adgangskoder er ikke ens.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage("Adgangskoden skal være mindst 6 tegn.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordMessage(
        "Den nye adgangskode skal være forskellig fra den nuværende.",
      );
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        router.replace("/auth");
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Noget gik galt.");
      }

      setPasswordMessage("Adgangskode opdateret!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setPasswordMessage(
        err instanceof Error ? err.message : "Noget gik galt.",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Kunne ikke logge ud. Prøv igen.");
      return;
    }

    router.replace("/");
    router.refresh();
  };

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
                  disabled={savingProfile}
                >
                  {savingProfile ? "Gemmer..." : "Gem ændringer"}
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={handleCancelEdit}
                  disabled={savingProfile}
                >
                  Fortryd
                </button>
              </>
            )}
          </div>
        </form>
        {authProvider === "email" && (
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
            <form
              onSubmit={handlePasswordChange}
              className={styles.passwordForm}
            >
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
                disabled={changingPassword}
              >
                {changingPassword ? "Opdaterer..." : "Opdater adgangskode"}
              </button>
            </form>
          </div>
        )}

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
