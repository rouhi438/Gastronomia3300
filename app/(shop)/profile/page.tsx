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
import { useLocale, useTranslations } from "next-intl";
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

  const t = useTranslations("Profile");
  const locale = useLocale();
  const localeCode = locale === "en" ? "en-GB" : "da-DK";
  const ordersFetchFailedMessage = t("orders.fetchFailed");

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
  const [passwordSucceeded, setPasswordSucceeded] = useState(false);
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
          const claimResponse = await fetch("/api/profile/orders/claim", {
            method: "POST",
            credentials: "include",
            cache: "no-store",
          });

          if (!claimResponse.ok && claimResponse.status !== 403) {
            console.error("Previous guest orders could not be connected.");
          }

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
            console.error("Profile orders fetch failed:", ordersResult.error);
            throw new Error(ordersFetchFailedMessage);
          }

          setOrders(ordersResult.orders ?? []);
          setOrdersError("");
        } catch (ordersFetchError: unknown) {
          console.error("Profile orders request failed:", ordersFetchError);
          setOrdersError(ordersFetchFailedMessage);
        } finally {
          setOrdersLoading(false);
        }
      } catch {
        router.replace("/auth");
      } finally {
      }
    };

    loadUser();
  }, [router, ordersFetchFailedMessage]);

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
    return new Intl.DateTimeFormat(localeCode, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  };

  const formatOrderPrice = (value: number | string | null) => {
    const numericValue = typeof value === "number" ? value : Number(value ?? 0);

    return `${numericValue.toLocaleString(localeCode)} kr.`;
  };

  const getOrderStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return t("orders.statuses.pending");

      case "accepted":
        return t("orders.statuses.accepted");

      case "ready":
        return t("orders.statuses.ready");

      case "completed":
        return t("orders.statuses.completed");

      case "cancelled":
        return t("orders.statuses.cancelled");

      case "rejected":
        return t("orders.statuses.rejected");

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
      alert(t("alerts.nameRequired"));
      return;
    }

    if (!trimmedEmail) {
      alert(t("alerts.emailRequired"));
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
        alert(t("alerts.emailConfirmation"));
      } else {
        alert(t("alerts.updated"));
      }

      router.refresh();
    } catch (err) {
      console.error("Profile update failed:", err);
      alert(t("alerts.updateFailed"));
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
    setPasswordSucceeded(false);

    if (!currentPassword) {
      setPasswordMessage(t("password.currentRequired"));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordMessage(t("password.mismatch"));
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage(t("password.minLength"));
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordMessage(t("password.mustDiffer"));
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
        console.error("Password update failed:", data?.error);
        throw new Error(t("password.failed"));
      }

      setPasswordSucceeded(true);
      setPasswordMessage(t("password.updated"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      console.error("Password change request failed:", err);
      setPasswordSucceeded(false);
      setPasswordMessage(t("password.failed"));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(t("alerts.logoutFailed"));
      return;
    }

    router.replace("/");
    router.refresh();
  };

  return (
    <div className={styles.container}>
      <div className={styles.profileLayout}>
        <div className={styles.card}>
          <h1 className={styles.title}>{t("title")}</h1>

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
                <User size={18} /> {t("fields.fullName")}
              </label>
              <input
                type="text"
                className={styles.input}
                value={user.name}
                onChange={(e) => setUser({ ...user, name: e.target.value })}
                disabled={!isEditing}
                placeholder={t("fields.fullNamePlaceholder")}
                autoComplete="given-name"
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <Mail size={18} /> {t("fields.email")}
              </label>
              <input
                type="email"
                className={styles.input}
                value={user.email}
                onChange={(e) => setUser({ ...user, email: e.target.value })}
                disabled={!isEditing}
                placeholder={t("fields.emailPlaceholder")}
                autoComplete="email"
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>
                <Phone size={18} /> {t("fields.phone")}
              </label>
              <input
                type="tel"
                className={styles.input}
                value={user.phone}
                onChange={(e) => setUser({ ...user, phone: e.target.value })}
                disabled={!isEditing}
                placeholder={t("fields.phonePlaceholder")}
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
                  {t("actions.edit")}
                </button>
              ) : (
                <>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1, padding: "0.8rem", fontSize: "1.1rem" }}
                    disabled={savingProfile}
                  >
                    {savingProfile ? t("actions.saving") : t("actions.save")}
                  </button>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={handleCancelEdit}
                    disabled={savingProfile}
                  >
                    {t("actions.cancel")}
                  </button>
                </>
              )}
            </div>
          </form>
          {authProvider === "email" && (
            <div className={styles.passwordSection}>
              <h4 className={styles.passwordTitle}>
                <Lock size={18} style={{ marginRight: "0.5rem" }} />
                {t("password.title")}
              </h4>

              {passwordMessage && (
                <div
                  className={
                    passwordSucceeded ? styles.successMsg : styles.errorMsg
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
                  <label className={styles.label}>
                    {t("password.current")}
                  </label>

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
                  <label className={styles.label}>{t("password.new")}</label>

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
                  <label className={styles.label}>
                    {t("password.confirm")}
                  </label>

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
                  {changingPassword
                    ? t("password.updating")
                    : t("password.update")}
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
              {t("actions.logout")}
            </button>
          </div>
        </div>

        <section className={styles.ordersCard}>
          <div className={styles.ordersHeader}>
            <div>
              <div className={styles.ordersEyebrow}>
                <ShoppingBag size={17} />
                <span>{t("orders.eyebrow")}</span>
              </div>

              <h2>{t("orders.title")}</h2>

              <p>{t("orders.description")}</p>
            </div>

            <div className={styles.orderCount}>
              <span>{t("orders.previous")}</span>
              <strong>{orders.length}</strong>
            </div>
          </div>

          {ordersLoading ? (
            <div className={styles.ordersState}>
              <Package size={28} />
              <p>{t("orders.loading")}</p>
            </div>
          ) : ordersError ? (
            <div className={styles.ordersError}>{ordersError}</div>
          ) : orders.length === 0 ? (
            <div className={styles.ordersState}>
              <Package size={32} />

              <strong>{t("orders.emptyTitle")}</strong>

              <p>{t("orders.emptyText")}</p>

              <Link href="/menu" className={styles.menuLink}>
                {t("orders.viewMenu")}
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
                        {t("orders.orderNumber", { id: order.id })}
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
                          ? t("orders.delivery")
                          : t("orders.pickup")}
                      </span>

                      <span className={styles.metaSeparator}>•</span>

                      <strong>{formatOrderPrice(order.total_price)}</strong>
                    </div>

                    <span className={styles.viewOrder}>
                      {t("orders.viewOrder")}
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
