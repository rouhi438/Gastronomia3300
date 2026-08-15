"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  Lock,
  ChevronRight,
  Package,
  ShoppingBag,
} from "lucide-react";
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
interface ProfileOrder {
  id: number;
  created_at: string;
  delivery_method: "pickup" | "delivery";
  total_price: number | string | null;
  status: string;
  public_token: string;
}

interface ProfileOrdersResponse {
  orders?: ProfileOrder[];
  total?: number;
  error?: string;
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

  const [orders, setOrders] = useState<ProfileOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");

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

        try {
          const ordersResponse = await fetch("/api/profile/orders", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          });

          const ordersResult =
            (await ordersResponse.json()) as ProfileOrdersResponse;

          if (ordersResponse.status === 401) {
            router.replace("/auth");
            return;
          }

          if (!ordersResponse.ok) {
            throw new Error(
              ordersResult.error || "Kunne ikke hente dine ordrer.",
            );
          }

          setOrders(ordersResult.orders ?? []);
          setOrdersError("");
        } catch (ordersFetchError: unknown) {
          setOrdersError(
            ordersFetchError instanceof Error
              ? ordersFetchError.message
              : "Kunne ikke hente dine ordrer.",
          );
        } finally {
          setOrdersLoading(false);
        }
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

  const formatOrderDate = (value: string) => {
    return new Intl.DateTimeFormat("da-DK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  };

  const formatOrderPrice = (value: number | string | null) => {
    const numericValue = typeof value === "number" ? value : Number(value ?? 0);

    return `${numericValue.toLocaleString("da-DK")} kr.`;
  };

  const getOrderStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Afventer";

      case "accepted":
        return "Accepteret";

      case "ready":
        return "Klar";

      case "completed":
        return "Afsluttet";

      case "cancelled":
      case "rejected":
        return "Annulleret";

      default:
        return status;
    }
  };

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
      <div className={styles.profileLayout}>
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
                  style={{
                    width: "100%",
                    padding: "0.8rem",
                    fontSize: "1.1rem",
                  }}
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
        <section className={styles.ordersCard}>
          <div className={styles.ordersHeader}>
            <div>
              <div className={styles.ordersEyebrow}>
                <ShoppingBag size={17} />
                <span>Mine ordrer</span>
              </div>

              <h2>Ordrehistorik</h2>

              <p>Se dine tidligere bestillinger og åbn den enkelte ordre.</p>
            </div>

            <div className={styles.orderCount}>
              <span>Tidligere ordrer</span>
              <strong>{orders.length}</strong>
            </div>
          </div>

          {ordersLoading ? (
            <div className={styles.ordersState}>
              <Package size={28} />
              <p>Henter dine ordrer...</p>
            </div>
          ) : ordersError ? (
            <div className={styles.ordersError}>{ordersError}</div>
          ) : orders.length === 0 ? (
            <div className={styles.ordersState}>
              <Package size={32} />

              <strong>Ingen tidligere ordrer</strong>

              <p>Når du har bestilt hos os, finder du dine ordrer her.</p>

              <Link href="/menu" className={styles.menuLink}>
                Se menuen
              </Link>
            </div>
          ) : (
            <div className={styles.ordersList}>
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/order/${encodeURIComponent(order.public_token)}`}
                  className={styles.orderItem}
                >
                  <div className={styles.orderItemTop}>
                    <div>
                      <span className={styles.orderNumber}>
                        Ordre #{order.id}
                      </span>

                      <span className={styles.orderDate}>
                        {formatOrderDate(order.created_at)}
                      </span>
                    </div>

                    <span
                      className={styles.orderStatus}
                      data-status={order.status}
                    >
                      {getOrderStatusLabel(order.status)}
                    </span>
                  </div>

                  <div className={styles.orderItemBottom}>
                    <div className={styles.orderMeta}>
                      <span>
                        {order.delivery_method === "delivery"
                          ? "Levering"
                          : "Afhentning"}
                      </span>

                      <span className={styles.metaSeparator}>•</span>

                      <strong>{formatOrderPrice(order.total_price)}</strong>
                    </div>

                    <span className={styles.viewOrder}>
                      Se ordre
                      <ChevronRight size={18} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
