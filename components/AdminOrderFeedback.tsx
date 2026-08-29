"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Send, Trash2 } from "lucide-react";
import RatingStar from "@/components/RatingStar";

import styles from "./AdminOrderFeedback.module.css";

const MAX_ADMIN_REPLY_LENGTH = 2000;
const STAR_VALUES = [1, 2, 3, 4, 5] as const;

type AdminFeedback = {
  rating: number;
  privateMessage: string | null;
  privateMessageRemoved: boolean;
  publicNameConsent: boolean;
  adminReply: string | null;
  adminRepliedAt: string | null;
  submittedAt: string;
  seenAt: string | null;
  canReply: boolean;
  canRemoveMessage: boolean;
};

type AdminFeedbackResponse = {
  feedback?: AdminFeedback | null;
  error?: string;
};

type AdminOrderFeedbackProps = {
  orderId: number;
};

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function AdminOrderFeedback({
  orderId,
}: AdminOrderFeedbackProps) {
  const router = useRouter();

  const [feedback, setFeedback] = useState<AdminFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");

  const [replying, setReplying] = useState(false);
  const [removingMessage, setRemovingMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchFeedback = async () => {
      try {
        const response = await fetch(`/api/admin/orders/${orderId}/feedback`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (response.status === 401) {
          router.replace(
            `/auth?redirect=${encodeURIComponent(
              `/admin/feedback/${orderId}`,
            )}`,
          );

          return;
        }

        const payload = (await response
          .json()
          .catch(() => null)) as AdminFeedbackResponse | null;

        if (!response.ok || !payload) {
          throw new Error(payload?.error || "Feedback kunne ikke hentes.");
        }

        if (!controller.signal.aborted) {
          setFeedback(payload.feedback ?? null);
          setErrorMessage("");
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          console.error("Admin feedback request failed:", error);

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Feedback kunne ikke hentes.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchFeedback();

    return () => {
      controller.abort();
    };
  }, [orderId, router]);

  const handleReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedReply = reply.trim();

    if (!normalizedReply || replying) {
      return;
    }

    setReplying(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/feedback`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action: "reply",
          reply: normalizedReply,
        }),
      });

      const payload = (await response
        .json()
        .catch(() => null)) as AdminFeedbackResponse | null;

      if (!response.ok || !payload?.feedback) {
        throw new Error(payload?.error || "Svaret kunne ikke sendes.");
      }

      setFeedback(payload.feedback);
      setReply("");
      setErrorMessage("");
    } catch (error: unknown) {
      console.error("Admin feedback reply failed:", error);

      setErrorMessage(
        error instanceof Error ? error.message : "Svaret kunne ikke sendes.",
      );
    } finally {
      setReplying(false);
    }
  };

  const handleRemoveMessage = async () => {
    if (
      removingMessage ||
      !window.confirm(
        "Vil du fjerne kundens private besked? Handlingen kan ikke fortrydes. Kundens stjernebedømmelse bevares.",
      )
    ) {
      return;
    }

    setRemovingMessage(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/feedback`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action: "remove_private_message",
        }),
      });

      const payload = (await response
        .json()
        .catch(() => null)) as AdminFeedbackResponse | null;

      if (!response.ok || !payload?.feedback) {
        throw new Error(
          payload?.error || "Den private besked kunne ikke fjernes.",
        );
      }

      setFeedback(payload.feedback);
      setErrorMessage("");
    } catch (error: unknown) {
      console.error("Admin private-message removal failed:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Den private besked kunne ikke fjernes.",
      );
    } finally {
      setRemovingMessage(false);
    }
  };

  if (loading) {
    return (
      <section className={`${styles.section} noPrint`}>
        <p className={styles.loading}>Henter feedback...</p>
      </section>
    );
  }

  if (!feedback) {
    return errorMessage ? (
      <section className={`${styles.section} noPrint`}>
        <p className={styles.error}>{errorMessage}</p>
      </section>
    ) : null;
  }

  return (
    <section
      className={`${styles.section} noPrint`}
      aria-labelledby="admin-order-feedback-title"
    >
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Kundefeedback</p>

          <h2 id="admin-order-feedback-title" className={styles.title}>
            Feedback til ordre #{orderId}
          </h2>

          <p className={styles.meta}>
            Modtaget {formatDate(feedback.submittedAt)}
          </p>
        </div>

        <span className={styles.statusBadge}>
          <BadgeCheck size={16} aria-hidden="true" />
          {feedback.adminReply ? "Besvaret" : "Afventer svar"}
        </span>
      </div>

      <div className={styles.ratingRow}>
        <span
          className={styles.stars}
          aria-label={`${feedback.rating} ud af 5 stjerner`}
        >
          {STAR_VALUES.map((starValue) => (
            <span
              key={starValue}
              className={`${styles.starBox} ${
                starValue <= feedback.rating ? styles.starBoxActive : ""
              }`}
            >
              <RatingStar size={19} />
            </span>
          ))}
        </span>

        <span className={styles.ratingValue}>{feedback.rating} ud af 5</span>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <strong className={styles.panelTitle}>Kundens private besked</strong>

          {feedback.canRemoveMessage && (
            <button
              type="button"
              className={styles.removeButton}
              disabled={removingMessage}
              onClick={() => void handleRemoveMessage()}
            >
              <Trash2 size={15} aria-hidden="true" />
              {removingMessage ? "Fjerner..." : "Fjern besked"}
            </button>
          )}
        </div>

        {feedback.privateMessageRemoved ? (
          <p className={styles.removedMessage}>
            Beskeden blev fjernet på grund af upassende indhold.
          </p>
        ) : feedback.privateMessage ? (
          <p>{feedback.privateMessage}</p>
        ) : (
          <p className={styles.removedMessage}>
            Kunden skrev ingen privat besked.
          </p>
        )}
      </div>

      {feedback.adminReply ? (
        <div className={`${styles.panel} ${styles.replyPanel}`}>
          <strong className={styles.panelTitle}>Restaurantens svar</strong>

          <p>{feedback.adminReply}</p>

          {feedback.adminRepliedAt && (
            <p className={styles.meta}>
              Sendt {formatDate(feedback.adminRepliedAt)}
            </p>
          )}
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleReply}>
          <label htmlFor="admin-feedback-reply" className={styles.label}>
            Skriv ét privat svar til kunden
          </label>

          <textarea
            id="admin-feedback-reply"
            className={styles.textarea}
            value={reply}
            maxLength={MAX_ADMIN_REPLY_LENGTH}
            placeholder="Skriv restaurantens svar..."
            onChange={(event) => setReply(event.target.value)}
          />

          <div className={styles.formFooter}>
            <span className={styles.counter}>
              {Array.from(reply).length}/{MAX_ADMIN_REPLY_LENGTH}
            </span>

            <button
              type="submit"
              className={styles.replyButton}
              disabled={!reply.trim() || replying}
            >
              <Send size={16} aria-hidden="true" />
              {replying ? "Sender..." : "Send svar"}
            </button>
          </div>
        </form>
      )}

      <p className={styles.publicState}>
        {feedback.publicNameConsent
          ? "Kunden har givet samtykke til offentlig visning af fornavn og stjerner."
          : "Kundens navn vises ikke offentligt. Stjernebedømmelsen indgår stadig i gennemsnittet."}
      </p>

      {errorMessage && (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
