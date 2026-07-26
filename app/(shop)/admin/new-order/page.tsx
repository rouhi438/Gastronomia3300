"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./new-order.module.css";

export default function NewOrderPage() {
  const router = useRouter();
  const audioContextRef = useRef<AudioContext | null>(null);
  const beepIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const playBeep = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContextRef.current.currentTime + 0.2,
      );
      oscillator.start();
      oscillator.stop(audioContextRef.current.currentTime + 0.2);
    } catch (_) {}
  };

  useEffect(() => {
    beepIntervalRef.current = setInterval(() => playBeep(), 5000);
    return () => {
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const handleViewOrder = () => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
    router.push("/admin/new-order/detail");
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.bell}>🔔</div>
        <h1 className={styles.title}>Du har modtaget en ny ordre</h1>
        <button className={styles.viewBtn} onClick={handleViewOrder}>
          Se ordre
        </button>
      </div>
    </div>
  );
}
