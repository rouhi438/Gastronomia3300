"use client";

import { useEffect, useState, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Home,
  User,
  ShoppingCart,
  Menu,
  X,
  Moon,
  Sun,
  SquareMenu,
  ChevronDown,
  ClipboardList,
  UtensilsCrossed,
  Clock3,
} from "lucide-react";

import StoreStatusBadge from "./StoreStatusBadge";
import { createClient } from "@/lib/supabase/client";
import {
  getProfileCompletionStatus,
  getProfileDestination,
} from "@/lib/profile";
import { useCart } from "@/context/CartContext";
import { useCartUI } from "@/context/CartUIContext";
import CartDrawer from "./CartDrawer";
import styles from "./Header.module.css";

const subscribeToHydration = () => () => {};

export default function Header() {
  const router = useRouter();
  const supabase = createClient();

  const { isCartOpen, openCart, closeCart } = useCartUI();
  const { totalItems } = useCart();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [language, setLanguage] = useState<"da" | "en">("da");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileHref, setProfileHref] = useState("/complete-profile");
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const mobileAdminMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
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

      const {
        profile,
        isComplete,
        error: profileError,
      } = await getProfileCompletionStatus(supabase, user.id);

      if (profileError) {
        console.error(
          "Profile completion check failed while loading header profile link:",
          profileError.message,
        );
        setProfileHref("/complete-profile");
        return;
      }

      setUserName(
        profile?.full_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          "",
      );

      setUserRole(user.app_metadata?.role ?? user.user_metadata?.role ?? null);
      setProfileHref(getProfileDestination(isComplete));
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
        setProfileHref("/complete-profile");
        return;
      }

      setIsLoggedIn(true);
      const {
        profile,
        isComplete,
        error: profileError,
      } = await getProfileCompletionStatus(supabase, user.id);

      if (profileError) {
        console.error(
          "Profile completion check failed while updating header profile link:",
          profileError.message,
        );
        setProfileHref("/complete-profile");
        return;
      }

      setUserName(
        profile?.full_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          "",
      );

      setUserRole(user.app_metadata?.role ?? user.user_metadata?.role ?? null);
      setProfileHref(getProfileDestination(isComplete));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      const clickedDesktopAdmin = adminMenuRef.current?.contains(target);

      const clickedMobileAdmin = mobileAdminMenuRef.current?.contains(target);

      if (!clickedDesktopAdmin && !clickedMobileAdmin) {
        setIsAdminMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

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
    setProfileHref("/complete-profile");

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
    setIsAdminMenuOpen(false);
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

          <div className={styles.brandContent}>
            <span className={styles.brandName}>Gastronomia Pizza</span>
          </div>
        </Link>
        <div className={styles.storeStatusWrapper}>
          <StoreStatusBadge />
        </div>
        <nav className={styles.navDesktop}>
          <Link href="/" className={styles.navLink}>
            <Home size={18} />
            <span>Hjem</span>
          </Link>
          <Link href="/menu" className={styles.navLink} onClick={closeMenu}>
            <SquareMenu size={20} />
            <span>Menu</span>
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
            <div className={styles.adminMenu} ref={adminMenuRef}>
              <button
                type="button"
                className={styles.navLink}
                onClick={() => setIsAdminMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isAdminMenuOpen}
              >
                <span>Admin</span>

                <ChevronDown
                  size={16}
                  className={`${styles.adminChevron} ${
                    isAdminMenuOpen ? styles.adminChevronOpen : ""
                  }`}
                />
              </button>

              {isAdminMenuOpen && (
                <div className={styles.adminDropdown} role="menu">
                  <Link
                    href="/admin/orders"
                    className={styles.adminDropdownLink}
                    onClick={() => setIsAdminMenuOpen(false)}
                  >
                    <ClipboardList size={17} />
                    <span>Ordrer</span>
                  </Link>

                  <Link
                    href="/admin/menu"
                    className={styles.adminDropdownLink}
                    onClick={() => setIsAdminMenuOpen(false)}
                  >
                    <UtensilsCrossed size={17} />
                    <span>Menu</span>
                  </Link>

                  <Link
                    href="/admin/opening-hours"
                    className={styles.adminDropdownLink}
                    onClick={() => setIsAdminMenuOpen(false)}
                  >
                    <Clock3 size={17} />
                    <span>Åbningstider</span>
                  </Link>
                </div>
              )}
            </div>
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
            <StoreStatusBadge mobile />
            <Link href="/" className={styles.mobileNavLink} onClick={closeMenu}>
              <Home size={20} />
              <span>Hjem</span>
            </Link>
            <Link
              href="/menu"
              className={styles.mobileNavLink}
              onClick={closeMenu}
            >
              <SquareMenu size={20} />
              <span>Menu</span>
            </Link>
            <button
              type="button"
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

            {isLoggedIn && userRole === "admin" && (
              <div
                className={styles.mobileAdminSection}
                ref={mobileAdminMenuRef}
              >
                <button
                  type="button"
                  className={`${styles.mobileNavLink} ${styles.mobileAdminButton}`}
                  onClick={() => setIsAdminMenuOpen((prev) => !prev)}
                  aria-expanded={isAdminMenuOpen}
                >
                  <span>Admin</span>

                  <ChevronDown
                    size={18}
                    className={`${styles.adminChevron} ${
                      isAdminMenuOpen ? styles.adminChevronOpen : ""
                    }`}
                  />
                </button>

                {isAdminMenuOpen && (
                  <div className={styles.mobileAdminSubmenu}>
                    <Link
                      href="/admin/orders"
                      className={styles.mobileAdminLink}
                      onClick={closeMenu}
                    >
                      <ClipboardList size={18} />
                      <span>Ordrer</span>
                    </Link>

                    <Link
                      href="/admin/menu"
                      className={styles.mobileAdminLink}
                      onClick={closeMenu}
                    >
                      <UtensilsCrossed size={18} />
                      <span>Menu</span>
                    </Link>

                    <Link
                      href="/admin/opening-hours"
                      className={styles.mobileAdminLink}
                      onClick={closeMenu}
                    >
                      <Clock3 size={18} />
                      <span>Åbningstider</span>
                    </Link>
                  </div>
                )}
              </div>
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
