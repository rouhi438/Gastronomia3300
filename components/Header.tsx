"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Home, User, ShoppingCart, Menu, X, Moon, Sun } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/context/CartContext";
import { useCartUI } from "@/context/CartUIContext";
import CartDrawer from "./CartDrawer";
import styles from "./Header.module.css";

export default function Header() {
  const router = useRouter();
  const supabase = createClient();

  const { isCartOpen, openCart, closeCart } = useCartUI();
  const { totalItems } = useCart();
  const { theme, setTheme } = useTheme();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [language, setLanguage] = useState<"da" | "en">("da");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profileHref, setProfileHref] = useState("/profile");

  useEffect(() => {
    setMounted(true);

    const loadUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setIsLoggedIn(false);
        setUserName("");
        setUserRole(null);
        return;
      }

      setIsLoggedIn(true);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", user.id)
        .maybeSingle();

      setUserName(
        profile?.full_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          "",
      );

      setUserRole(user.app_metadata?.role ?? user.user_metadata?.role ?? null);

      const profileIsComplete = Boolean(
        profile?.full_name?.trim() &&
        profile?.email?.trim() &&
        profile?.phone?.trim(),
      );

      setProfileHref(profileIsComplete ? "/profile" : "/complete-profile");
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user;

      if (!user) {
        setIsLoggedIn(false);
        setUserName("");
        setUserRole(null);
        setProfileHref("/profile");
        return;
      }

      setIsLoggedIn(true);
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", user.id)
        .maybeSingle();

      setUserName(
        profile?.full_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          "",
      );

      setUserRole(user.app_metadata?.role ?? user.user_metadata?.role ?? null);

      const profileIsComplete = Boolean(
        profile?.full_name?.trim() &&
        profile?.email?.trim() &&
        profile?.phone?.trim(),
      );

      setProfileHref(profileIsComplete ? "/profile" : "/complete-profile");
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error.message);
      return;
    }

    setIsLoggedIn(false);
    setUserName("");
    setUserRole(null);
    setIsMenuOpen(false);
    setProfileHref("/profile");

    router.push("/");
    router.refresh();
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "da" ? "en" : "da"));
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const getInitials = (name: string) => {
    if (!name) {
      return "?";
    }

    const parts = name.trim().split(" ");

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

  const initials = getInitials(userName);
  const avatarColor = getAvatarColor(userName || "User");

  return (
    <>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <Image
            src="/images/logo.png"
            alt="Gastronomia 3300"
            width={60}
            height={60}
            priority
            style={{ width: "auto", height: "auto" }}
          />

          <span className={styles.brandName}>Gastronomia Pizza</span>
        </Link>

        <nav className={styles.navDesktop}>
          <Link href="/" className={styles.navLink}>
            <Home size={18} />
            <span>Hjem</span>
          </Link>

          <button type="button" className={styles.navLink} onClick={openCart}>
            <div className={styles.cartIconWrapper}>
              <ShoppingCart size={18} />

              {totalItems > 0 && (
                <span className={styles.cartBadge}>{totalItems}</span>
              )}
            </div>

            <span>Kurv</span>
          </button>

          {isLoggedIn && userRole === "admin" && (
            <Link href="/admin/orders" className={styles.navLink}>
              <span>📋 Admin</span>
            </Link>
          )}

          {isLoggedIn ? (
            <>
              <Link href={profileHref} className={styles.navLink}>
                <span>{userName || "Profil"}</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className={styles.navLink}
              >
                <span>Log ud</span>
              </button>
            </>
          ) : (
            <Link href="/auth" className={styles.navLink}>
              <User size={18} />
              <span>Log ind / Opret</span>
            </Link>
          )}
        </nav>

        <div className={styles.rightSection}>
          <div className={styles.langSwitcher}>
            <button
              type="button"
              onClick={toggleLanguage}
              className={`${styles.langBtn} ${
                language === "da" ? styles.active : ""
              }`}
            >
              DA
            </button>

            <button
              type="button"
              onClick={toggleLanguage}
              className={`${styles.langBtn} ${
                language === "en" ? styles.active : ""
              }`}
            >
              EN
            </button>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className={styles.themeToggle}
          >
            {mounted &&
              (theme === "dark" ? <Sun size={20} /> : <Moon size={20} />)}
          </button>

          {isLoggedIn ? (
            <Link href={profileHref} className={styles.userIconLink}>
              <div
                className={styles.userAvatar}
                style={{ backgroundColor: avatarColor }}
              >
                {initials}
              </div>
            </Link>
          ) : (
            <Link href="/auth" className={styles.userIconLink}>
              <div className={styles.userIcon}>
                <User size={18} />
              </div>
            </Link>
          )}

          <button
            type="button"
            className={styles.hamburger}
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </header>

      <div
        className={`${styles.mobileMenu} ${isMenuOpen ? styles.open : ""}`}
        onClick={closeMenu}
      >
        <div
          className={styles.mobileMenuInner}
          onClick={(event) => event.stopPropagation()}
        >
          <nav className={styles.mobileNav}>
            <Link href="/" className={styles.mobileNavLink} onClick={closeMenu}>
              <Home size={20} />
              <span>Hjem</span>
            </Link>

            <button
              type="button"
              className={styles.mobileNavLink}
              onClick={() => {
                openCart();
                closeMenu();
              }}
            >
              <ShoppingCart size={20} />
              <span>Kurv</span>
            </button>

            {isLoggedIn && userRole === "admin" && (
              <Link
                href="/admin/orders"
                className={styles.mobileNavLink}
                onClick={closeMenu}
              >
                <span>📋 Admin</span>
              </Link>
            )}

            {isLoggedIn ? (
              <>
                <Link
                  href={profileHref}
                  className={styles.mobileNavLink}
                  onClick={closeMenu}
                >
                  <User size={20} />
                  <span>Min profil</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    void handleLogout();
                  }}
                  className={styles.mobileNavLink}
                >
                  <User size={20} />
                  <span>Log ud</span>
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className={styles.mobileNavLink}
                onClick={closeMenu}
              >
                <User size={20} />
                <span>Log ind / Opret</span>
              </Link>
            )}
          </nav>
        </div>
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={closeCart} />
    </>
  );
}
