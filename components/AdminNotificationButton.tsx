"use client";

import { useSyncExternalStore } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import {
  playAdminOrderAlarm,
  prepareAdminOrderAlarm,
} from "@/lib/admin/orderAlarm";

type NotificationPermissionState = NotificationPermission | "unsupported";

type AdminNotificationButtonProps = {
  className: string;
};

const TEST_NOTIFICATION_DURATION_MS = 5000;
const NOTIFICATION_PERMISSION_EVENT = "admin-notification-permission-change";

function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return Notification.permission;
}

function getServerNotificationPermission(): NotificationPermissionState {
  return "default";
}

function subscribeToNotificationPermission(
  onStoreChange: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      onStoreChange();
    }
  };

  window.addEventListener(NOTIFICATION_PERMISSION_EVENT, onStoreChange);
  window.addEventListener("focus", onStoreChange);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.removeEventListener(NOTIFICATION_PERMISSION_EVENT, onStoreChange);
    window.removeEventListener("focus", onStoreChange);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}

function notifyPermissionChanged() {
  window.dispatchEvent(new Event(NOTIFICATION_PERMISSION_EVENT));
}

export default function AdminNotificationButton({
  className,
}: AdminNotificationButtonProps) {
  const permission = useSyncExternalStore(
    subscribeToNotificationPermission,
    getNotificationPermission,
    getServerNotificationPermission,
  );

  const handleClick = async () => {
    if (!("Notification" in window)) {
      notifyPermissionChanged();
      return;
    }

    if (Notification.permission === "denied") {
      notifyPermissionChanged();

      window.alert(
        "Notifikationer er blokeret. Tillad dem i browserens webstedsindstillinger.",
      );

      return;
    }

    try {
      await prepareAdminOrderAlarm();

      const nextPermission = await Notification.requestPermission();

      notifyPermissionChanged();

      if (nextPermission !== "granted") {
        return;
      }
      await playAdminOrderAlarm();

      const notification = new Notification("Ordrenotifikationer er aktive", {
        body: "Denne computer viser nu besked om nye ordrer.",
        icon: "/pwa-192.png",
        tag: "admin-notification-test",
        silent: false,
      });

      window.setTimeout(() => {
        notification.close();
      }, TEST_NOTIFICATION_DURATION_MS);
    } catch (error: unknown) {
      console.error("Notification permission setup failed:", error);
    }
  };

  const label =
    permission === "granted"
      ? "Ordrenotifikationer er aktive. Klik for at teste."
      : permission === "denied"
        ? "Ordrenotifikationer er blokeret i browseren."
        : permission === "unsupported"
          ? "Browseren understøtter ikke ordrenotifikationer."
          : "Aktivér ordrenotifikationer.";

  const NotificationIcon =
    permission === "granted"
      ? BellRing
      : permission === "denied"
        ? BellOff
        : Bell;

  return (
    <button
      type="button"
      className={className}
      data-notification-state={permission}
      aria-label={label}
      aria-pressed={permission === "granted"}
      title={label}
      disabled={permission === "unsupported"}
      onClick={() => void handleClick()}
    >
      <NotificationIcon size={20} aria-hidden="true" />
    </button>
  );
}
