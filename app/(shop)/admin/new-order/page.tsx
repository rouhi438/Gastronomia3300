"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BellRing, Volume2 } from "lucide-react";

import styles from "./new-order.module.css";

type BrowserWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function scheduleTone(
  context: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
) {
  const oscillator = context.createOscillator();

  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);

  gain.gain.exponentialRampToValueAtTime(0.24, startTime + 0.025);

  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.03);
}

export default function NewOrderPage() {
  const router = useRouter();

  const audioContextRef = useRef<AudioContext | null>(null);

  const alarmIntervalRef = useRef<number | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(false);

  const getAudioContext = useCallback(() => {
    if (audioContextRef.current) {
      return audioContextRef.current;
    }

    const AudioContextConstructor =
      window.AudioContext || (window as BrowserWindow).webkitAudioContext;

    if (!AudioContextConstructor) {
      return null;
    }

    const context = new AudioContextConstructor();

    audioContextRef.current = context;

    return context;
  }, []);

  const playAlarm = useCallback(async () => {
    try {
      const context = getAudioContext();

      if (!context) {
        setSoundEnabled(false);
        return;
      }

      if (context.state === "suspended") {
        await context.resume();
      }

      if (context.state !== "running") {
        setSoundEnabled(false);
        return;
      }

      const start = context.currentTime + 0.03;

      scheduleTone(context, 740, start, 0.2);

      scheduleTone(context, 988, start + 0.22, 0.28);

      scheduleTone(context, 740, start + 0.62, 0.2);

      scheduleTone(context, 988, start + 0.84, 0.3);

      setSoundEnabled(true);
    } catch {
      setSoundEnabled(false);
    }
  }, [getAudioContext]);

  const stopAlarm = useCallback(() => {
    if (alarmIntervalRef.current !== null) {
      window.clearInterval(alarmIntervalRef.current);

      alarmIntervalRef.current = null;
    }

    const context = audioContextRef.current;

    audioContextRef.current = null;

    if (context && context.state !== "closed") {
      void context.close();
    }
  }, []);

  useEffect(() => {
    // Prøv straks. Browseren kan blokere
    // lyden, indtil administratoren klikker.
    void playAlarm();

    alarmIntervalRef.current = window.setInterval(() => {
      void playAlarm();
    }, 5000);

    return stopAlarm;
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
