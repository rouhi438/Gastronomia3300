"use client";

import { useEffect, useState } from "react";
import styles from "./OrderCountdown.module.css";

const MINUTE_MS = 60_000;
const RADIUS = 32;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type OrderCountdownProps = {
  acceptedAt: string;
  fulfillmentDueAt: string;
};

export default function OrderCountdown({
  acceptedAt,
  fulfillmentDueAt,
}: OrderCountdownProps) {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    const updateTime = () => setNowMs(Date.now());

    const initialUpdate = window.setTimeout(updateTime, 0);
    const interval = window.setInterval(updateTime, 15_000);

    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, []);

  if (nowMs === null) {
    return null;
  }

  const acceptedMs = Date.parse(acceptedAt);
  const dueMs = Date.parse(fulfillmentDueAt);

  if (
    !Number.isFinite(acceptedMs) ||
    !Number.isFinite(dueMs) ||
    dueMs <= acceptedMs
  ) {
    return null;
  }

  const totalDurationMs = dueMs - acceptedMs;
  const rawRemainingMs = dueMs - nowMs;
  const remainingMs = Math.max(rawRemainingMs, 0);

  const remainingMinutes = Math.max(0, Math.ceil(remainingMs / MINUTE_MS));

  const isExpired = rawRemainingMs <= 0;
  const isUrgent = !isExpired && remainingMinutes <= 15;

  const progress = isExpired
    ? 1
    : Math.min(Math.max(remainingMs / totalDurationMs, 0), 1);

  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div
      className={`${styles.countdown} ${
        isExpired ? styles.expired : isUrgent ? styles.urgent : styles.active
      }`}
      role="timer"
      aria-label={
        isExpired ? "Tiden er udløbet" : `${remainingMinutes} minutter tilbage`
      }
    >
      <svg
        className={styles.ring}
        width="76"
        height="76"
        viewBox="0 0 76 76"
        aria-hidden="true"
      >
        <circle className={styles.track} cx="38" cy="38" r={RADIUS} />

        <circle
          className={styles.progress}
          cx="38"
          cy="38"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
        />
      </svg>

      <span className={styles.value}>
        <strong>{remainingMinutes}</strong>
        <small>min</small>
      </span>
    </div>
  );
}
