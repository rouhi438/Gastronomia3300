import { Resend } from "resend";

type SendOrderReceivedEmailInput = {
  to: string;
  customerName: string;
  orderId: number;
  receiptUrl: string;
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

export async function sendOrderReceivedEmail({
  to,
  customerName,
  orderId,
  receiptUrl,
}: SendOrderReceivedEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY eller EMAIL_FROM mangler.");
  }

  const resend = new Resend(apiKey);

  const safeCustomerName = escapeHtml(customerName);
  const safeReceiptUrl = escapeHtml(receiptUrl);

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: `Vi har modtaget din ordre #${orderId}`,
    html: `
      <!doctype html>
      <html lang="da">
        <body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#1f2937;">
          <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
            <div style="background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
              <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">
                Gastronomia 3300
              </p>

              <h1 style="margin:0 0 20px;font-size:26px;">
                Vi har modtaget din ordre
              </h1>

              <p style="margin:0 0 16px;line-height:1.6;">
                Hej ${safeCustomerName},
              </p>

              <p style="margin:0 0 16px;line-height:1.6;">
                Din ordre <strong>#${orderId}</strong> er modtaget og
                afventer restaurantens bekræftelse.
              </p>

              <p style="margin:0 0 24px;line-height:1.6;">
                Du kan følge ordrestatus på din kvitteringsside.
              </p>

              <a
                href="${safeReceiptUrl}"
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
                Se din ordre
              </a>

              <p style="margin:28px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">
                Du modtager en ny besked, når restauranten accepterer
                eller afviser ordren.
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
