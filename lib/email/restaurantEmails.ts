import "server-only";

import { Resend } from "resend";

type SendRestaurantNewOrderEmailInput = {
  orderId: number;
  adminUrl: string;
  deliveryMethod: "pickup" | "delivery";
  requestedTime: string | null;
  totalPrice: number;
};

type SendOperationalAlertEmailInput = {
  severity: "warning" | "critical";
  category: string;
  summary: string;
  checkoutSessionId?: string | null;
  orderId?: number | null;
  detectedAt: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[character] ?? character;
  });
}

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const to = process.env.RESTAURANT_ALERT_EMAIL;

  if (!apiKey || !from || !to) {
    throw new Error(
      "RESEND_API_KEY, EMAIL_FROM or RESTAURANT_ALERT_EMAIL is missing.",
    );
  }

  return {
    resend: new Resend(apiKey),
    from,
    to,
  };
}

export async function sendRestaurantNewOrderEmail({
  orderId,
  adminUrl,
  deliveryMethod,
  requestedTime,
  totalPrice,
}: SendRestaurantNewOrderEmailInput) {
  const { resend, from, to } = getEmailConfig();

  const safeAdminUrl = escapeHtml(adminUrl);
  const safeRequestedTime = escapeHtml(requestedTime ?? "Hurtigst muligt");
  const deliveryLabel =
    deliveryMethod === "delivery" ? "Levering" : "Afhentning";
  const formattedTotal = totalPrice.toFixed(2).replace(".", ",");

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: `[Ny ordre] Ordre #${orderId}`,
    html: `
      <!doctype html>
      <html lang="da">
        <body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#1f2937;">
          <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
            <div style="background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
              <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">
                Gastronomia 3300 — fallback-besked
              </p>

              <h1 style="margin:0 0 20px;font-size:26px;color:#166534;">
                Ny betalt ordre #${orderId}
              </h1>

              <p style="margin:0 0 10px;line-height:1.6;">
                <strong>Type:</strong> ${deliveryLabel}
              </p>

              <p style="margin:0 0 10px;line-height:1.6;">
                <strong>Ønsket tidspunkt:</strong> ${safeRequestedTime}
              </p>

              <p style="margin:0 0 24px;line-height:1.6;">
                <strong>I alt:</strong> ${formattedTotal} kr.
              </p>

              <a
                href="${safeAdminUrl}"
                style="display:inline-block;padding:14px 22px;border-radius:10px;background:#166534;color:#ffffff;text-decoration:none;font-weight:700;"
              >
                Åbn ordreoversigten
              </a>

              <p style="margin:28px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">
                Denne e-mail er en ekstra sikkerhed, hvis browseralarmen ikke kan høres.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function sendOperationalAlertEmail({
  severity,
  category,
  summary,
  checkoutSessionId,
  orderId,
  detectedAt,
}: SendOperationalAlertEmailInput) {
  const { resend, from, to } = getEmailConfig();

  const safeCategory = escapeHtml(category);
  const safeSummary = escapeHtml(summary);
  const safeCheckoutSessionId = checkoutSessionId
    ? escapeHtml(checkoutSessionId)
    : "—";
  const severityLabel = severity === "critical" ? "KRITISK" : "ADVARSEL";

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: `[${severityLabel}] Gastronomia ordreovervågning`,
    html: `
      <!doctype html>
      <html lang="da">
        <body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#1f2937;">
          <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
            <div style="background:#ffffff;border-radius:16px;padding:32px;border-top:6px solid ${severity === "critical" ? "#b91c1c" : "#b45309"};">
              <h1 style="margin:0 0 20px;font-size:24px;">
                ${severityLabel}: ordreovervågning
              </h1>

              <p style="margin:0 0 10px;"><strong>Kategori:</strong> ${safeCategory}</p>
              <p style="margin:0 0 10px;"><strong>Beskrivelse:</strong> ${safeSummary}</p>
              <p style="margin:0 0 10px;"><strong>Ordre:</strong> ${orderId ?? "—"}</p>
              <p style="margin:0 0 10px;"><strong>Checkout-session:</strong> ${safeCheckoutSessionId}</p>
              <p style="margin:0;color:#6b7280;"><strong>Registreret:</strong> ${escapeHtml(detectedAt)}</p>

              <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">
                Kontrollér Supabase, Nets Easy og adminpanelet. Denne besked indeholder ingen kunde- eller betalingsoplysninger.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

type SendRestaurantFeedbackEmailInput = {
  orderId: number;
  rating: number;
  hasPrivateMessage: boolean;
  adminUrl: string;
};

export async function sendRestaurantFeedbackEmail({
  orderId,
  rating,
  hasPrivateMessage,
  adminUrl,
}: SendRestaurantFeedbackEmailInput) {
  const { resend, from, to } = getEmailConfig();

  const safeAdminUrl = escapeHtml(adminUrl);
  const messageLabel = hasPrivateMessage
    ? "Kunden har også skrevet en privat besked."
    : "Kunden har ikke skrevet en privat besked.";

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: `[Ny feedback] Ordre #${orderId}`,
    html: `
      <!doctype html>
      <html lang="da">
        <body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#1f2937;">
          <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
            <div style="background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
              <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">
                Gastronomia 3300
              </p>

              <h1 style="margin:0 0 20px;font-size:26px;color:#b45309;">
                Ny feedback til ordre #${orderId}
              </h1>

              <p style="margin:0 0 16px;line-height:1.6;">
                Kunden har givet ordren
                <strong>${rating} ud af 5 stjerner</strong>.
              </p>

              <p style="margin:0 0 24px;line-height:1.6;">
                ${messageLabel}
              </p>

              <a
                href="${safeAdminUrl}"
                style="
                  display:inline-block;
                  padding:14px 22px;
                  border-radius:10px;
                  background:#166534;
                  color:#ffffff;
                  text-decoration:none;
                  font-weight:700;
                "
              >
                Se feedback i admin
              </a>

              <p style="margin:28px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">
                Kundens private besked vises ikke i denne e-mail.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
