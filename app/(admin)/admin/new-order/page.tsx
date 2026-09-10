"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BellRing, Volume2 } from "lucide-react";
import { playAdminOrderAlarm } from "@/lib/admin/orderAlarm";

import styles from "./new-order.module.css";

export default function NewOrderPage() {
  const router = useRouter();

  const alarmIntervalRef = useRef<number | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(false);

  const playAlarm = useCallback(async () => {
    const played = await playAdminOrderAlarm();

    setSoundEnabled(played);
  }, []);

  const stopAlarm = useCallback(() => {
    if (alarmIntervalRef.current !== null) {
      window.clearInterval(alarmIntervalRef.current);

      alarmIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    /*
     * Try immediately after the effect has completed.
     * The browser may block sound until the administrator interacts.
     */
    const initialAlarmTimeout = window.setTimeout(() => {
      void playAlarm();
    }, 0);

    alarmIntervalRef.current = window.setInterval(() => {
      void playAlarm();
    }, 5000);

    return () => {
      window.clearTimeout(initialAlarmTimeout);
      stopAlarm();
    };
  }, [playAlarm, stopAlarm]);

  const handleActivateSound = () => {
    void playAlarm();
  };

  const handleViewOrder = () => {
    stopAlarm();

    router.push("/admin/new-order/detail");
  };

  return (
    <main className={styles.container} role="alert" aria-live="assertive">
      <section className={styles.content} aria-labelledby="new-order-title">
        <div className={styles.statusTag}>Ny ordre</div>

        <div className={styles.bellWrapper} aria-hidden="true">
          <BellRing className={styles.bell} strokeWidth={1.8} />
        </div>

        <h1 id="new-order-title" className={styles.title}>
          Du har modtaget en ny ordre
        </h1>

        <p className={styles.description}>
          Åbn ordren for at se varer, kundeoplysninger og vælge forventet tid.
        </p>

        <button
          type="button"
          className={styles.viewBtn}
          onClick={handleViewOrder}
        >
          <span>Se ordre</span>
          <ArrowRight size={21} />
        </button>

        {!soundEnabled && (
          <button
            type="button"
            className={styles.soundBtn}
            onClick={handleActivateSound}
          >
            <Volume2 size={17} />
            <span>Aktivér alarmlyd</span>
          </button>
        )}

        <p className={styles.alarmStatus}>
          {soundEnabled
            ? "Alarmen gentages hvert 5. sekund"
            : "Klik på “Aktivér alarmlyd”, hvis browseren har blokeret lyden"}
        </p>
      </section>
    </main>
  );
}
