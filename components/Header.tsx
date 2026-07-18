"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import CartDrawer from "./CartDrawer";
import { useTheme } from "next-themes";
import { useCart } from "@/context/CartContext";
import { useCartUI } from "@/context/CartUIContext";
import { Home, User, ShoppingCart, Menu, X, Moon, Sun } from "lucide-react";
import styles from "./Header.module.css";

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [language, setLanguage] = useState<"da" | "en">("da");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { totalItems } = useCart();
  const { isCartOpen, openCart, closeCart } = useCartUI();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "da" ? "en" : "da"));
  };

  const handleAuth = () => {
    setIsLoggedIn(!isLoggedIn);
    setIsMenuOpen(false);
  };

  const closeMenu = () => setIsMenuOpen(false);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

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

          <button
            className={styles.navLink}
            onClick={openCart}
            aria-label="Open cart"
          >
            <div className={styles.cartIconWrapper}>
              <ShoppingCart size={18} />
              {totalItems > 0 && (
                <span className={styles.cartBadge}>{totalItems}</span>
              )}
            </div>
            <span>Kurv</span>
          </button>

          {isLoggedIn ? (
            <button onClick={handleAuth} className={styles.navLink}>
              <User size={18} />
              <span>Log ud</span>
            </button>
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

          <button
            onClick={toggleTheme}
            className={styles.themeToggle}
            aria-label="Toggle theme"
          >
            {mounted &&
              (theme === "dark" ? <Sun size={20} /> : <Moon size={20} />)}
          </button>

          <Link href="/profile" className={styles.userIconLink}>
            <div className={styles.userIcon}>
              <User size={18} />
            </div>
          </Link>

          <button
            className={styles.hamburger}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </header>

      {/* ===== MOBILE MENU ===== */}
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
              <div className={styles.cartIconWrapper}>
                <ShoppingCart size={20} />
                {totalItems > 0 && (
                  <span className={styles.cartBadge}>{totalItems}</span>
                )}
              </div>
              <span>Kurv</span>
            </button>
            {isLoggedIn ? (
              <button onClick={handleAuth} className={styles.mobileNavLink}>
                <User size={20} />
                <span>Log ud</span>
              </button>
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

      {/* ===== CART DRAWER ===== */}
      <CartDrawer isOpen={isCartOpen} onClose={closeCart} />
    </>
  );
}
