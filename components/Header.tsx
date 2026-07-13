"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Home, User, ShoppingCart } from "lucide-react";
import styles from "./Header.module.css";

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [language, setLanguage] = useState<"da" | "en">("da");

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "da" ? "en" : "da"));
  };

  const handleAuth = () => {
    setIsLoggedIn(!isLoggedIn);
  };

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        <Image
          src="/images/logo.png"
          alt="Gastronomia 3300"
          width={45}
          height={22}
          priority
        />
        <span className={styles.brandName}>Gastronomia 3300</span>
      </Link>

      <nav className={styles.nav}>
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

      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
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

        <div className={styles.userIcon}>
          <User size={18} />
        </div>
      </div>
    </header>
  );
}
