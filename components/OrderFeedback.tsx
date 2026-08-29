"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BadgeCheck } from "lucide-react";
import RatingStar from "@/components/RatingStar";

import styles from "./OrderFeedback.module.css";

const MAX_PRIVATE_MESSAGE_LENGTH = 2000;
const STAR_VALUES = [1, 2, 3, 4, 5] as const;

type EligibilityReason = "not_completed" | "submitted" | "expired" | null;

type FeedbackEligibility = {
  canSubmit: boolean;
  closesAt: string | null;
  reason: EligibilityReason;
};

type CustomerFeedback = {
  rating: number;
  privateMessage: string | null;
  privateMessageRemoved: boolean;
  publicNameConsent: boolean;
  adminReply: string | null;
  adminRepliedAt: string | null;
  submittedAt: string;
  updatedAt: string;
};

type FeedbackApiResponse = {
  eligibility?: FeedbackEligibility;
  feedback?: CustomerFeedback | null;
  error?: string;
};

type OrderFeedbackProps = {
  token: string;
};

export default function OrderFeedback({ token }: OrderFeedbackProps) {
  const t = useTranslations("OrderFeedback");

  const [result, setResult] = useState<FeedbackApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [privateMessage, setPrivateMessage] = useState("");
  const [publicNameConsent, setPublicNameConsent] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchFeedback = async () => {
      try {
        const response = await fetch(
          `/api/orders/public/${encodeURIComponent(token)}/feedback`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          },
        );

        const payload = (await response
          .json()
          .catch(() => null)) as FeedbackApiResponse | null;

        if (!response.ok || !payload) {
          throw new Error(payload?.error || "Feedback request failed.");
        }

        if (!controller.signal.aborted) {
          setResult(payload);
          setErrorMessage("");
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          console.error("Customer feedback request failed:", error);
          setErrorMessage(t("errors.load"));
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
  }, [t, token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!rating || submitting) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/orders/public/${encodeURIComponent(token)}/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            rating,
            privateMessage,
            publicNameConsent,
          }),
        },
      );

      const payload = (await response
        .json()
        .catch(() => null)) as FeedbackApiResponse | null;

      if (!response.ok || !payload?.feedback) {
        throw new Error(payload?.error || "Feedback submission failed.");
      }

      setResult(payload);
      setPrivateMessage("");
      setErrorMessage("");
    } catch (error: unknown) {
      console.error("Customer feedback submission failed:", error);
      setErrorMessage(t("errors.submit"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawPublicName = async () => {
    if (withdrawing || !window.confirm(t("publicName.withdrawConfirmation"))) {
      return;
    }

    setWithdrawing(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/orders/public/${encodeURIComponent(token)}/feedback`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            publicNameConsent: false,
          }),
        },
      );

      const payload = (await response
        .json()
        .catch(() => null)) as FeedbackApiResponse | null;

      if (!response.ok || !payload?.feedback) {
        throw new Error(payload?.error || "Consent withdrawal failed.");
      }

      setResult((currentResult) =>
        currentResult
          ? {
              ...currentResult,
              feedback: payload.feedback,
            }
          : currentResult,
      );

      setErrorMessage("");
    } catch (error: unknown) {
      console.error("Public-name consent withdrawal failed:", error);
      setErrorMessage(t("errors.withdraw"));
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return null;
  }

  if (errorMessage && !result) {
    return (
      <section className={styles.feedbackSection} aria-live="polite">
        <p className={styles.error}>{errorMessage}</p>
      </section>
    );
  }

  if (!result) {
    return null;
  }

  const feedback = result.feedback ?? null;
  const eligibility = result.eligibility;

  if (!feedback && eligibility?.reason === "not_completed") {
    return null;
  }

  if (feedback) {
    return (
      <section
        className={styles.feedbackSection}
        aria-labelledby="order-feedback-title"
      >
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{t("eyebrow")}</p>

            <h2 id="order-feedback-title" className={styles.title}>
              {t("submitted.title")}
            </h2>

            <p className={styles.description}>{t("submitted.description")}</p>
          </div>

          <span className={styles.verifiedBadge}>
            <BadgeCheck size={16} aria-hidden="true" />
            {t("verifiedOrder")}
          </span>
        </div>

        <div className={styles.ratingSummary}>
          <span
            className={styles.ratingStars}
            aria-label={t("submitted.ratingAria", {
              rating: feedback.rating,
            })}
          >
            {STAR_VALUES.map((starValue) => (
              <span
                key={starValue}
                className={`${styles.ratingStarBox} ${
                  starValue <= feedback.rating ? styles.ratingStarBoxActive : ""
                }`}
              >
                <RatingStar size={18} />
              </span>
            ))}
          </span>

          <span className={styles.ratingValue}>
            {t("submitted.ratingValue", {
              rating: feedback.rating,
            })}
          </span>
        </div>

        {feedback.privateMessageRemoved ? (
          <div className={styles.panel}>
            <strong className={styles.panelTitle}>
              {t("submitted.privateMessageTitle")}
            </strong>

            <p className={styles.removedMessage}>
              {t("submitted.removedMessage")}
            </p>
          </div>
        ) : feedback.privateMessage ? (
          <div className={styles.panel}>
            <strong className={styles.panelTitle}>
              {t("submitted.privateMessageTitle")}
            </strong>

            <p>{feedback.privateMessage}</p>
          </div>
        ) : null}

        {feedback.adminReply && (
          <div className={`${styles.panel} ${styles.replyPanel}`}>
            <strong className={styles.panelTitle}>
              {t("submitted.adminReplyTitle")}
            </strong>

            <p>{feedback.adminReply}</p>
          </div>
        )}

        <div className={styles.publicState}>
          <p>
            {feedback.publicNameConsent
              ? t("publicName.active")
              : t("publicName.private")}
          </p>

          {feedback.publicNameConsent && (
            <button
              type="button"
              className={styles.withdrawButton}
              disabled={withdrawing}
              onClick={() => void handleWithdrawPublicName()}
            >
              {withdrawing
                ? t("publicName.withdrawing")
                : t("publicName.withdraw")}
            </button>
          )}
        </div>

        {errorMessage && (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        )}
      </section>
    );
  }

  if (eligibility?.reason === "expired") {
    return (
      <section
        className={styles.feedbackSection}
        aria-labelledby="order-feedback-expired-title"
      >
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{t("eyebrow")}</p>

            <h2 id="order-feedback-expired-title" className={styles.title}>
              {t("expired.title")}
            </h2>
          </div>

          <span className={styles.verifiedBadge}>
            <BadgeCheck size={16} aria-hidden="true" />
            {t("verifiedOrder")}
          </span>
        </div>

        <p className={styles.expired}>{t("expired.description")}</p>
      </section>
    );
  }

  if (!eligibility?.canSubmit) {
    return null;
  }

  const displayedRating = hoveredRating ?? rating ?? 0;

  return (
    <section
      className={styles.feedbackSection}
      aria-labelledby="order-feedback-title"
    >
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{t("eyebrow")}</p>

          <h2 id="order-feedback-title" className={styles.title}>
            {t("form.title")}
          </h2>

          <p className={styles.description}>{t("form.description")}</p>
        </div>

        <span className={styles.verifiedBadge}>
          <BadgeCheck size={16} aria-hidden="true" />
          {t("verifiedOrder")}
        </span>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <span className={styles.label}>{t("form.ratingLabel")}</span>

          <div
            className={styles.stars}
            role="radiogroup"
            aria-label={t("form.ratingLabel")}
            onMouseLeave={() => setHoveredRating(null)}
          >
            {STAR_VALUES.map((starValue) => (
              <button
                key={starValue}
                type="button"
                role="radio"
                aria-checked={rating === starValue}
                aria-label={t("form.starLabel", {
                  rating: starValue,
                })}
                className={`${styles.starButton} ${
                  starValue <= displayedRating ? styles.starSelected : ""
                }`}
                onClick={() => setRating(starValue)}
                onMouseEnter={() => setHoveredRating(starValue)}
                onFocus={() => setHoveredRating(starValue)}
                onBlur={() => setHoveredRating(null)}
              >
                <RatingStar size={27} />
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="order-feedback-message" className={styles.label}>
            {t("form.privateMessageLabel")}
          </label>

          <textarea
            id="order-feedback-message"
            className={styles.textarea}
            value={privateMessage}
            maxLength={MAX_PRIVATE_MESSAGE_LENGTH}
            placeholder={t("form.privateMessagePlaceholder")}
            onChange={(event) => setPrivateMessage(event.target.value)}
          />

          <div className={styles.fieldFooter}>
            <p className={styles.moderationNotice}>
              {t("form.moderationNotice")}
            </p>

            <span className={styles.counter}>
              {Array.from(privateMessage).length}/{MAX_PRIVATE_MESSAGE_LENGTH}
            </span>
          </div>
        </div>

        <label className={styles.consent}>
          <input
            type="checkbox"
            checked={publicNameConsent}
            onChange={(event) => setPublicNameConsent(event.target.checked)}
          />

          <span className={styles.consentText}>
            <strong>{t("form.publicNameTitle")}</strong>
            <span>{t("form.publicNameDescription")}</span>
          </span>
        </label>

        <p className={styles.moderationNotice}>{t("form.aggregateNotice")}</p>

        {errorMessage && (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          className={styles.submitButton}
          disabled={!rating || submitting}
        >
          {submitting ? t("form.submitting") : t("form.submit")}
        </button>
      </form>
    </section>
  );
}
