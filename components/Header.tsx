"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Home, User, ShoppingCart, Menu, X, Moon, Sun } from "lucide-react";
import styles from "./Header.module.css";

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [language, setLanguage] = useState<"da" | "en">("da");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
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

          <Link href="/cart" className={styles.navLink}>
            <ShoppingCart size={18} />
            <span>Kurv</span>
          </Link>

          <button
            onClick={handleAuth}
            className={`${styles.navLink} ${isLoggedIn ? styles.loggedIn : ""}`}
          >
            <User size={18} />
            <span>{isLoggedIn ? "Log ud" : "Log ind / Opret"}</span>
          </button>
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
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={styles.themeToggle}
            aria-label="Toggle theme"
          >
            {mounted &&
              (theme === "dark" ? <Sun size={20} /> : <Moon size={20} />)}
          </button>
          <div className={styles.userIcon}>
            <User size={18} />
          </div>
          {/* Hamburger button (mobile only) */}
          <button
            className={styles.hamburger}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </header>
      {/* ===== MOBILE MENU (Slide from right) ===== */}
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
            <Link
              href="/cart"
              className={styles.mobileNavLink}
              onClick={closeMenu}
            >
              <ShoppingCart size={20} />
              <span>Kurv</span>
            </Link>
            <button onClick={handleAuth} className={styles.mobileNavLink}>
              <User size={20} />
              <span>{isLoggedIn ? "Log ud" : "Log ind / Opret"}</span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}
