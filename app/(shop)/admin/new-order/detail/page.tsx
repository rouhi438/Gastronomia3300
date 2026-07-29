"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./detail.module.css";

interface OrderItem {
  id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  size: string;
  extras: string[];
}

interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  order_note: string | null;
  cancel_reason?: string | null;
  total_price: number;
  status: string;
  estimated_time?: number | null;
  created_at: string;
  order_items: OrderItem[];
}

type OrderAction = "accepted" | "cancelled";

const statusLabels: Record<string, string> = {
  pending: "Afventer",
  accepted: "Accepteret",
  ready: "Klar",
  completed: "Leveret",
  cancelled: "Annulleret",
};

const estimatedTimeOptions = [15, 20, 25, 30, 35, 40, 45, 50, 60];

const cancellationReasons = [
  "Strømafbrydelse",
  "Meget travlt",
  "Udsolgt",
  "Kunden annullerede",
  "Uden for leveringsområde",
  "Teknisk problem",
  "Andet",
];

function getSizeLabel(size?: string) {
  if (!size || size === "normal") return null;

  if (size === "family") return "Family";
  if (size === "children") return "Børn";
  if (size === "deepPan") return "Deep Pan";

  return size;
}

export default function OrderDetailPage() {
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isAcceptSheetOpen, setIsAcceptSheetOpen] = useState(false);
  const [selectedEstimatedTime, setSelectedEstimatedTime] =
    useState<number | null>(null);
  const [useCustomEstimatedTime, setUseCustomEstimatedTime] = useState(false);
  const [customEstimatedTime, setCustomEstimatedTime] = useState("");

  const [isCancelSheetOpen, setIsCancelSheetOpen] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState("");
  const [customCancelReason, setCustomCancelReason] = useState("");

  const [actionError, setActionError] = useState("");
  const [submittingAction, setSubmittingAction] =
    useState<OrderAction | null>(null);

  useEffect(() => {
    const fetchLatestPendingOrder = async () => {
      const token = localStorage.getItem("access_token");
      const refreshToken = localStorage.getItem("refresh_token");

      if (!token) {
        router.push("/auth");
        return;
      }

      try {
        const res = await fetch("/api/admin/orders", {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Refresh-Token": refreshToken || "",
          },
          cache: "no-store",
        });

        if (res.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          router.push("/auth");
          return;
        }

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch orders");
        }

        const pendingOrders = data.orders.filter(
          (item: Order) => item.status === "pending",
        );

        if (pendingOrders.length === 0) {
          router.push("/admin/new-order");
          return;
        }

        setOrder(pendingOrders[0]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Kunne ikke hente ordren",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLatestPendingOrder();
  }, [router]);

  useEffect(() => {
    const isAnySheetOpen = isAcceptSheetOpen || isCancelSheetOpen;

    if (!isAnySheetOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || submittingAction) return;

      if (isAcceptSheetOpen) {
        closeAcceptSheet();
      }

      if (isCancelSheetOpen) {
        closeCancelSheet();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isAcceptSheetOpen, isCancelSheetOpen, submittingAction]);

  const updateOrderStatus = async ({
    status,
    cancelReason,
    estimatedTime,
  }: {
    status: OrderAction;
    cancelReason?: string;
    estimatedTime?: number;
  }) => {
    if (!order || submittingAction) return;

    const token = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");

    if (!token) {
      router.push("/auth");
      return;
    }

    setActionError("");
    setSubmittingAction(status);

    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Refresh-Token": refreshToken || "",
        },
        body: JSON.stringify({
          orderId: order.id,
          status,
          cancelReason: status === "cancelled" ? cancelReason : null,
          estimatedTime: status === "accepted" ? estimatedTime : null,
        }),
      });

      if (res.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        router.push("/auth");
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Kunne ikke opdatere ordren");
      }

      setOrder(data.order);
      setIsAcceptSheetOpen(false);
      setIsCancelSheetOpen(false);

      router.push("/admin/orders");
      router.refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Kunne ikke opdatere ordren",
      );
    } finally {
      setSubmittingAction(null);
    }
  };

  const openAcceptSheet = () => {
    if (submittingAction) return;

    setActionError("");
    setSelectedEstimatedTime(null);
    setUseCustomEstimatedTime(false);
    setCustomEstimatedTime("");
    setIsAcceptSheetOpen(true);
  };

  const closeAcceptSheet = () => {
    if (submittingAction) return;

    setIsAcceptSheetOpen(false);
    setSelectedEstimatedTime(null);
    setUseCustomEstimatedTime(false);
    setCustomEstimatedTime("");
    setActionError("");
  };

  const handleConfirmAccept = async () => {
    const parsedCustomTime = Number(customEstimatedTime);

    const finalEstimatedTime = useCustomEstimatedTime
      ? parsedCustomTime
      : selectedEstimatedTime;

    if (
      finalEstimatedTime === null ||
      !Number.isInteger(finalEstimatedTime) ||
      finalEstimatedTime < 1 ||
      finalEstimatedTime > 240
    ) {
      setActionError("Vælg en tid mellem 1 og 240 minutter.");
      return;
    }

    await updateOrderStatus({
      status: "accepted",
      estimatedTime: finalEstimatedTime,
    });
  };

  const openCancelSheet = () => {
    if (submittingAction) return;

    setActionError("");
    setSelectedCancelReason("");
    setCustomCancelReason("");
    setIsCancelSheetOpen(true);
  };

  const closeCancelSheet = () => {
    if (submittingAction) return;

    setIsCancelSheetOpen(false);
    setSelectedCancelReason("");
    setCustomCancelReason("");
    setActionError("");
  };

  const handleConfirmCancel = async () => {
    const finalReason =
      selectedCancelReason === "Andet"
        ? customCancelReason.trim()
        : selectedCancelReason.trim();

    if (!selectedCancelReason) {
      setActionError("Vælg en årsag til annulleringen.");
      return;
    }

    if (selectedCancelReason === "Andet" && !customCancelReason.trim()) {
      setActionError("Skriv årsagen til annulleringen.");
      return;
    }

    await updateOrderStatus({
      status: "cancelled",
      cancelReason: finalReason,
    });
  };

  if (loading) {
    return <div className={styles.loading}>Indlæser ordre...</div>;
  }

  if (error) {
    return <div className={styles.error}>Fejl: {error}</div>;
  }

  if (!order) {
    return <div className={styles.error}>Ingen ordre fundet.</div>;
  }

  const formattedDate = new Date(order.created_at).toLocaleString("da-DK");
  const isSubmitting = submittingAction !== null;

  return (
    <div className={styles.container}>
      <article className={styles.card}>
        <header className={styles.top}>
          <div className={styles.orderHeading}>
            <div>
              <span className={styles.orderEyebrow}>Ny ordre</span>
              <h1 className={styles.orderId}>Ordre #{order.id}</h1>
            </div>

            <strong className={styles.totalPrice}>
              {order.total_price} kr.
            </strong>
          </div>

          <div className={styles.customerInfo}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Telefon</span>

              <a className={styles.phone} href={`tel:${order.customer_phone}`}>
                {order.customer_phone}
              </a>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Kunde</span>
              <span className={styles.infoValue}>{order.customer_name}</span>
            </div>

            {order.customer_address && (
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Adresse</span>
                <span className={styles.infoValue}>
                  {order.customer_address}
                </span>
              </div>
            )}
          </div>
        </header>

        <section className={styles.itemsSection}>
          <div className={styles.sectionHeading}>
            <h2 className={styles.sectionTitle}>Bestilling</h2>

            <span className={styles.itemCount}>
              {order.order_items.reduce(
                (total, item) => total + item.quantity,
                0,
              )}{" "}
              varer
            </span>
          </div>

          <div className={styles.items}>
            {order.order_items.map((item) => {
              const sizeLabel = getSizeLabel(item.size);

              return (
                <div className={styles.item} key={item.id}>
                  <div className={styles.itemMain}>
                    <div className={styles.itemTitleRow}>
                      <span className={styles.quantity}>{item.quantity}×</span>

                      <strong className={styles.itemName}>
                        {item.item_name}
                      </strong>

                      {sizeLabel && (
                        <span className={styles.sizeBadge}>{sizeLabel}</span>
                      )}
                    </div>

                    {item.extras && item.extras.length > 0 && (
                      <div className={styles.extras}>
                        {item.extras.map((extra, index) => (
                          <span
                            className={styles.extra}
                            key={`${item.id}-${extra}-${index}`}
                          >
                            + {extra}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <strong className={styles.itemPrice}>
                    {item.unit_price * item.quantity} kr.
                  </strong>
                </div>
              );
            })}
          </div>
        </section>

        {order.order_note && (
          <section className={styles.orderNoteSection}>
            <div className={styles.orderNoteLabel}>Kommentar:</div>
            <div className={styles.orderNoteBox}>{order.order_note}</div>
          </section>
        )}

        <footer className={styles.orderFooter}>
          <div className={styles.orderMeta}>
            <div className={styles.footerRow}>
              <span className={styles.footerLabel}>Dato</span>
              <span className={styles.footerValue}>{formattedDate}</span>
            </div>

            <div className={styles.footerRow}>
              <span className={styles.footerLabel}>Status</span>

              <span
                className={`${styles.statusBadge} ${
                  order.status === "cancelled"
                    ? styles.statusCancelled
                    : order.status === "accepted"
                      ? styles.statusAccepted
                      : styles.statusPending
                }`}
              >
                {statusLabels[order.status] || order.status}
              </span>
            </div>

            {order.estimated_time && (
              <div className={styles.footerRow}>
                <span className={styles.footerLabel}>Forventet tid</span>

                <strong className={styles.estimatedTime}>
                  {order.estimated_time} min
                </strong>
              </div>
            )}
          </div>

          {actionError &&
            !isAcceptSheetOpen &&
            !isCancelSheetOpen && (
              <div className={styles.actionError} role="alert">
                {actionError}
              </div>
            )}

          {order.status === "pending" && (
            <div className={styles.actionBar}>
              <button
                className={styles.acceptButton}
                type="button"
                onClick={openAcceptSheet}
                disabled={isSubmitting}
              >
                <span className={styles.buttonIcon} aria-hidden="true">
                  ✓
                </span>

                <span>Accept ordre</span>
              </button>

              <button
                className={styles.cancelButton}
                type="button"
                onClick={openCancelSheet}
                disabled={isSubmitting}
              >
                <span className={styles.buttonIcon} aria-hidden="true">
                  ×
                </span>

                <span>Annuller ordre</span>
              </button>
            </div>
          )}
        </footer>
      </article>

      {isAcceptSheetOpen && (
        <div
          className={styles.sheetOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAcceptSheet();
            }
          }}
        >
          <section
            className={styles.cancelSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="accept-sheet-title"
          >
            <div className={styles.sheetHandle} aria-hidden="true" />

            <div className={styles.sheetHeader}>
              <div>
                <span className={styles.acceptSheetEyebrow}>
                  Ordre #{order.id}
                </span>

                <h2 className={styles.sheetTitle} id="accept-sheet-title">
                  Acceptér ordre
                </h2>

                <p className={styles.sheetDescription}>
                  Vælg hvor mange minutter kunden skal vente.
                </p>
              </div>

              <button
                className={styles.closeSheetButton}
                type="button"
                onClick={closeAcceptSheet}
                disabled={isSubmitting}
                aria-label="Luk"
              >
                ×
              </button>
            </div>

            <div className={styles.timeGrid}>
              {estimatedTimeOptions.map((time) => {
                const isSelected =
                  !useCustomEstimatedTime &&
                  selectedEstimatedTime === time;

                return (
                  <button
                    className={`${styles.timeOption} ${
                      isSelected ? styles.timeOptionSelected : ""
                    }`}
                    type="button"
                    key={time}
                    disabled={isSubmitting}
                    onClick={() => {
                      setSelectedEstimatedTime(time);
                      setUseCustomEstimatedTime(false);
                      setCustomEstimatedTime("");
                      setActionError("");
                    }}
                  >
                    <strong>{time}</strong>
                    <span>min</span>
                  </button>
                );
              })}

              <button
                className={`${styles.timeOption} ${
                  useCustomEstimatedTime
                    ? styles.timeOptionSelected
                    : ""
                }`}
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setUseCustomEstimatedTime(true);
                  setSelectedEstimatedTime(null);
                  setActionError("");
                }}
              >
                <strong>+</strong>
                <span>Anden tid</span>
              </button>
            </div>

            {useCustomEstimatedTime && (
              <div className={styles.customTimeGroup}>
                <label
                  className={styles.customReasonLabel}
                  htmlFor="custom-estimated-time"
                >
                  Antal minutter
                </label>

                <div className={styles.customTimeInputWrapper}>
                  <input
                    className={styles.customTimeInput}
                    id="custom-estimated-time"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={240}
                    step={1}
                    value={customEstimatedTime}
                    onChange={(event) => {
                      setCustomEstimatedTime(event.target.value);
                      setActionError("");
                    }}
                    placeholder="For eksempel 70"
                    disabled={isSubmitting}
                    autoFocus
                  />

                  <span className={styles.customTimeSuffix}>min</span>
                </div>
              </div>
            )}

            {actionError && (
              <div className={styles.sheetError} role="alert">
                {actionError}
              </div>
            )}

            <div className={styles.sheetActions}>
              <button
                className={styles.backButton}
                type="button"
                onClick={closeAcceptSheet}
                disabled={isSubmitting}
              >
                Tilbage
              </button>

              <button
                className={styles.confirmAcceptButton}
                type="button"
                onClick={handleConfirmAccept}
                disabled={isSubmitting}
              >
                {submittingAction === "accepted"
                  ? "Accepterer..."
                  : "Bekræft accept"}
              </button>
            </div>
          </section>
        </div>
      )}

      {isCancelSheetOpen && (
        <div
          className={styles.sheetOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCancelSheet();
            }
          }}
        >
          <section
            className={styles.cancelSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-sheet-title"
          >
            <div className={styles.sheetHandle} aria-hidden="true" />

            <div className={styles.sheetHeader}>
              <div>
                <span className={styles.sheetEyebrow}>Ordre #{order.id}</span>

                <h2 className={styles.sheetTitle} id="cancel-sheet-title">
                  Annuller ordre
                </h2>

                <p className={styles.sheetDescription}>
                  Vælg årsagen til, at ordren bliver annulleret.
                </p>
              </div>

              <button
                className={styles.closeSheetButton}
                type="button"
                onClick={closeCancelSheet}
                disabled={isSubmitting}
                aria-label="Luk"
              >
                ×
              </button>
            </div>

            <div className={styles.reasonList}>
              {cancellationReasons.map((reason) => {
                const isSelected = selectedCancelReason === reason;

                return (
                  <label
                    className={`${styles.reasonOption} ${
                      isSelected ? styles.reasonOptionSelected : ""
                    }`}
                    key={reason}
                  >
                    <input
                      className={styles.reasonRadio}
                      type="radio"
                      name="cancelReason"
                      value={reason}
                      checked={isSelected}
                      onChange={() => {
                        setSelectedCancelReason(reason);
                        setActionError("");
                      }}
                      disabled={isSubmitting}
                    />

                    <span className={styles.customRadio} aria-hidden="true" />
                    <span className={styles.reasonText}>{reason}</span>
                  </label>
                );
              })}
            </div>

            {selectedCancelReason === "Andet" && (
              <div className={styles.customReasonGroup}>
                <label
                  className={styles.customReasonLabel}
                  htmlFor="custom-cancel-reason"
                >
                  Skriv årsagen
                </label>

                <textarea
                  className={styles.customReasonInput}
                  id="custom-cancel-reason"
                  value={customCancelReason}
                  onChange={(event) => {
                    setCustomCancelReason(event.target.value);
                    setActionError("");
                  }}
                  placeholder="Skriv hvorfor ordren annulleres..."
                  maxLength={300}
                  rows={4}
                  disabled={isSubmitting}
                  autoFocus
                />

                <span className={styles.characterCount}>
                  {customCancelReason.length}/300
                </span>
              </div>
            )}

            {actionError && (
              <div className={styles.sheetError} role="alert">
                {actionError}
              </div>
            )}

            <div className={styles.sheetActions}>
              <button
                className={styles.backButton}
                type="button"
                onClick={closeCancelSheet}
                disabled={isSubmitting}
              >
                Tilbage
              </button>

              <button
                className={styles.confirmCancelButton}
                type="button"
                onClick={handleConfirmCancel}
                disabled={isSubmitting}
              >
                {submittingAction === "cancelled"
                  ? "Annullerer..."
                  : "Annuller ordre"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}