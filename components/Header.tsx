"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCart } from "@/context/CartContext";
import { useCartUI } from "@/context/CartUIContext";
import { Home, User, ShoppingCart, Menu, X, Moon, Sun } from "lucide-react";
import CartDrawer from "./CartDrawer";
import styles from "./Header.module.css";

export default function Header() {
  const router = useRouter();
  const { isCartOpen, openCart, closeCart } = useCartUI();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState<"da" | "en">("da");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { totalItems } = useCart();

  useEffect(() => {
    setMounted(true);

    const token = localStorage.getItem("access_token");
    const user = localStorage.getItem("user");
    if (token && user) {
      setIsLoggedIn(true);
      try {
        const parsed = JSON.parse(user);
        setUserName(parsed.user_metadata?.full_name || parsed.email || "");
      } catch {
        setUserName("");
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUserName("");
    router.push("/");
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "da" ? "en" : "da"));
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const closeMenu = () => setIsMenuOpen(false);

  // ===== Helper functions for avatar =====
  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
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

          <button className={styles.navLink} onClick={openCart}>
            <div className={styles.cartIconWrapper}>
              <ShoppingCart size={18} />
              {totalItems > 0 && (
                <span className={styles.cartBadge}>{totalItems}</span>
              )}
            </div>
            <span>Kurv</span>
          </button>

          {isLoggedIn ? (
            <>
              <Link href="/profile" className={styles.navLink}>
                <span>{userName || "Profil"}</span>
              </Link>
              <button onClick={handleLogout} className={styles.navLink}>
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
              onClick={toggleLanguage}
              className={`${styles.langBtn} ${language === "da" ? styles.active : ""}`}
            >
              DA
            </button>
            <button
              onClick={toggleLanguage}
              className={`${styles.langBtn} ${language === "en" ? styles.active : ""}`}
            >
              EN
            </button>
          </div>

          <button onClick={toggleTheme} className={styles.themeToggle}>
            {mounted &&
              (theme === "dark" ? <Sun size={20} /> : <Moon size={20} />)}
          </button>

          {/* ===== Avatar / User Icon ===== */}
          {isLoggedIn ? (
            <Link href="/profile" className={styles.userIconLink}>
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
            className={styles.hamburger}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <div
        className={`${styles.mobileMenu} ${isMenuOpen ? styles.open : ""}`}
        onClick={closeMenu}
      >
        <div
          className={styles.mobileMenuInner}
          onClick={(e) => e.stopPropagation()}
        >
          <nav className={styles.mobileNav}>
            <Link href="/" className={styles.mobileNavLink} onClick={closeMenu}>
              <Home size={20} />
              <span>Hjem</span>
            </Link>
            <button
              className={styles.mobileNavLink}
              onClick={() => {
                openCart();
                closeMenu();
              }}
            >
              <ShoppingCart size={20} />
              <span>Kurv</span>
            </button>
            {isLoggedIn ? (
              <>
                <Link
                  href="/profile"
                  className={styles.mobileNavLink}
                  onClick={closeMenu}
                >
                  <User size={20} />
                  <span>Min profil</span>
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    closeMenu();
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

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={closeCart} />
    </>
  );
}
