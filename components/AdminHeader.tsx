"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ClipboardList,
  Clock3,
  LogOut,
  Menu,
  MonitorCog,
  Moon,
  Sun,
  UtensilsCrossed,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import AdminStoreStatus from "./AdminStoreStatus";

import styles from "./AdminHeader.module.css";

const subscribeToHydration = () => () => {};

const navigationItems = [
  {
    href: "/admin/orders",
    label: "Ordrer",
    icon: ClipboardList,
    activePaths: [
      "/admin/orders",
      "/admin/new-order",
      "/admin/order-accepted",
      "/admin/select-time",
      "/admin/feedback",
      "/admin/accounting-report",
    ],
  },
  {
    href: "/admin/menu",
    label: "Menukort",
    icon: UtensilsCrossed,
    activePaths: ["/admin/menu"],
  },
  {
    href: "/admin/opening-hours",
    label: "Åbningstider",
    icon: Clock3,
    activePaths: ["/admin/opening-hours"],
  },
];

type AdminHeaderProps = {
  userLabel: string;
};

export default function AdminHeader({ userLabel }: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();

  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  const [supabase] = useState(() => createClient());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isActive = (activePaths: string[]) =>
    activePaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );

  const handleLogout = async () => {
    setIsLoggingOut(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error.message);
      setIsLoggingOut(false);
      return;
    }

    router.replace("/auth");
    router.refresh();
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/admin/orders" className={styles.brand}>
          <Image
            src="/images/logo.png"
            alt="Gastronomia Pizza"
            width={54}
            height={54}
            priority
            className={styles.logo}
          />

          <span className={styles.brandText}>
            <strong>Gastronomia 3300</strong>
            <span>Adminportal</span>
          </span>
        </Link>

        <nav className={styles.desktopNavigation} aria-label="Adminnavigation">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.activePaths);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navigationLink} ${
                  active ? styles.activeNavigationLink : ""
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.actions}>
          <AdminStoreStatus />
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Skift farvetema"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            {mounted &&
              (resolvedTheme === "dark" ? (
                <Sun size={20} aria-hidden="true" />
              ) : (
                <Moon size={20} aria-hidden="true" />
              ))}
          </button>

          <span className={styles.adminIdentity}>
            <span className={styles.adminAvatar} aria-hidden="true">
              <MonitorCog size={28} />
            </span>

            <span className={styles.adminIdentityText}>
              <small>Admin</small>
              <strong>{userLabel}</strong>
            </span>
          </span>

          <button
            type="button"
            className={styles.logoutButton}
            disabled={isLoggingOut}
            onClick={() => void handleLogout()}
          >
            <LogOut size={17} aria-hidden="true" />
            {isLoggingOut ? "Logger ud..." : "Log ud"}
          </button>

          <button
            type="button"
            className={styles.menuButton}
            aria-label={isMenuOpen ? "Luk menu" : "Åbn menu"}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            {isMenuOpen ? (
              <X size={26} aria-hidden="true" />
            ) : (
              <Menu size={26} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className={styles.mobilePanel}>
          <nav
            className={styles.mobileNavigation}
            aria-label="Mobil adminnavigation"
          >
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.activePaths);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={`${styles.mobileNavigationLink} ${
                    active ? styles.activeMobileNavigationLink : ""
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={19} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className={styles.mobileFooter}>
            <span className={styles.mobileIdentity}>
              <span className={styles.adminAvatar} aria-hidden="true">
                <MonitorCog size={28} />
              </span>

              <span className={styles.adminIdentityText}>
                <small>Admin</small>
                <strong>{userLabel}</strong>
              </span>
            </span>

            <button
              type="button"
              className={styles.mobileLogoutButton}
              disabled={isLoggingOut}
              onClick={() => void handleLogout()}
            >
              <LogOut size={18} aria-hidden="true" />
              {isLoggingOut ? "Logger ud..." : "Log ud"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
