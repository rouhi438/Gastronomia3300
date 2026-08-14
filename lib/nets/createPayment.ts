import { netsEasyConfig } from "./config";

export type NetsCreatePaymentResponse = {
  paymentId: string;
  hostedPaymentPageUrl?: string;
};

export async function createNetsPayment(
  payload: unknown,
): Promise<NetsCreatePaymentResponse> {
  const response = await fetch(`${netsEasyConfig.apiBaseUrl}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: netsEasyConfig.secretKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Nets Easy create payment failed (${response.status}): ${errorBody}`,
    );
  }

  return (await response.json()) as NetsCreatePaymentResponse;
}
