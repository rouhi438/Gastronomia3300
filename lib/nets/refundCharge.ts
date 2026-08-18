import "server-only";

import { netsEasyConfig } from "./config";

export type NetsRefundChargeResponse = {
  refundId: string;
};

type RefundNetsChargeInput = {
  chargeId: string;
  amountMinor: number;
  idempotencyKey: string;
};

export async function refundNetsCharge({
  chargeId,
  amountMinor,
  idempotencyKey,
}: RefundNetsChargeInput): Promise<NetsRefundChargeResponse> {
  const normalizedChargeId = chargeId.trim();
  const normalizedIdempotencyKey = idempotencyKey.trim();

  if (!normalizedChargeId) {
    throw new Error("Nets charge ID is required.");
  }

  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("Refund amount must be a positive integer.");
  }

  if (!normalizedIdempotencyKey || normalizedIdempotencyKey.length > 64) {
    throw new Error(
      "Refund idempotency key must be between 1 and 64 characters.",
    );
  }

  const response = await fetch(
    `${netsEasyConfig.apiBaseUrl}/v1/charges/${encodeURIComponent(
      normalizedChargeId,
    )}/refunds`,
    {
      method: "POST",

      headers: {
        Authorization: netsEasyConfig.secretKey,
        "Content-Type": "application/json",
        "Idempotency-Key": normalizedIdempotencyKey,
      },

      body: JSON.stringify({
        amount: amountMinor,
      }),

      cache: "no-store",
    },
  );

  const responseBody = await response.text();

  if (!response.ok) {
    throw new Error(
      `Nets Easy refund failed (${response.status}): ${responseBody}`,
    );
  }

  let parsedResponse: unknown;

  try {
    parsedResponse = responseBody ? JSON.parse(responseBody) : null;
  } catch {
    throw new Error("Nets Easy refund returned invalid JSON.");
  }

  if (
    !parsedResponse ||
    typeof parsedResponse !== "object" ||
    typeof (parsedResponse as { refundId?: unknown }).refundId !== "string" ||
    !(parsedResponse as { refundId: string }).refundId.trim()
  ) {
    throw new Error("Nets Easy refund returned no refund ID.");
  }

  return {
    refundId: (parsedResponse as { refundId: string }).refundId,
  };
}
