"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bell, BellOff, BellRing, Check, Volume2 } from "lucide-react";

import {
  ADMIN_ORDER_ALARM_SOUNDS,
  DEFAULT_ADMIN_ORDER_ALARM_SOUND,
  getAdminOrderAlarmSound,
  playAdminOrderAlarm,
  prepareAdminOrderAlarm,
  previewAdminOrderAlarm,
  setAdminOrderAlarmSound,
  subscribeToAdminOrderAlarmSound,
  type AdminOrderAlarmSound,
} from "@/lib/admin/orderAlarm";

import styles from "./AdminHeader.module.css";

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
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);

  const permission = useSyncExternalStore(
    subscribeToNotificationPermission,
    getNotificationPermission,
    getServerNotificationPermission,
  );

  const selectedSound = useSyncExternalStore(
    subscribeToAdminOrderAlarmSound,
    getAdminOrderAlarmSound,
    () => DEFAULT_ADMIN_ORDER_ALARM_SOUND,
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Node && !wrapperRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const enableNotifications = async () => {
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
      setIsOpen(true);

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

  const handleTriggerClick = () => {
    if (permission === "granted") {
      setIsOpen((currentValue) => !currentValue);
      return;
    }

    void enableNotifications();
  };

  const handleSelectSound = (sound: AdminOrderAlarmSound) => {
    setAdminOrderAlarmSound(sound);
    void previewAdminOrderAlarm(sound);
  };

  const handleTestSound = () => {
    void previewAdminOrderAlarm(selectedSound);
  };

  const label =
    permission === "granted"
      ? "Alarm og ordrenotifikationer er aktive. Klik for at vælge lyd."
      : permission === "denied"
        ? "Ordrenotifikationer er blokeret i browseren."
        : permission === "unsupported"
          ? "Browseren understøtter ikke ordrenotifikationer."
          : "Aktivér alarm og ordrenotifikationer.";

  const NotificationIcon =
    permission === "granted"
      ? BellRing
      : permission === "denied"
        ? BellOff
        : Bell;

  return (
    <div ref={wrapperRef} className={styles.notificationControl}>
      <button
        ref={triggerRef}
        type="button"
        className={className}
        data-notification-state={permission}
        aria-label={label}
        aria-haspopup={permission === "granted" ? "dialog" : undefined}
        aria-expanded={permission === "granted" ? isOpen : undefined}
        aria-controls={
          permission === "granted" ? "admin-alarm-settings" : undefined
        }
        title={label}
        disabled={permission === "unsupported"}
        onClick={handleTriggerClick}
      >
        <NotificationIcon size={20} aria-hidden="true" />
      </button>

      {permission === "granted" && isOpen && (
        <section
          id="admin-alarm-settings"
          className={styles.notificationPopover}
          role="dialog"
          aria-label="Vælg alarmlyd"
        >
          <div className={styles.alarmHeader}>
            <span className={styles.alarmEyebrow}>Ordrealarm</span>

            <strong className={styles.alarmTitle}>Vælg alarmlyd</strong>

            <p className={styles.alarmDescription}>
              Valget gemmes på denne computer.
            </p>
          </div>

          <div
            className={styles.alarmOptions}
            role="radiogroup"
            aria-label="Tilgængelige alarmlyde"
          >
            {ADMIN_ORDER_ALARM_SOUNDS.map((sound) => {
              const isSelected = sound.id === selectedSound;

              return (
                <button
                  key={sound.id}
                  type="button"
                  className={`${styles.alarmOption} ${
                    isSelected ? styles.alarmOptionSelected : ""
                  }`}
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelectSound(sound.id)}
                >
                  <Volume2
                    className={styles.alarmOptionIcon}
                    size={18}
                    aria-hidden="true"
                  />

                  <span className={styles.alarmOptionText}>
                    <strong className={styles.alarmOptionLabel}>
                      {sound.label}
                    </strong>

                    <span className={styles.alarmOptionDescription}>
                      {sound.description}
                    </span>
                  </span>

                  {isSelected && (
                    <Check
                      className={styles.alarmOptionCheck}
                      size={18}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={styles.alarmTestButton}
            onClick={handleTestSound}
          >
            <Volume2 size={17} aria-hidden="true" />
            <span>Afspil valgt lyd</span>
          </button>
        </section>
      )}
    </div>
  );
}
