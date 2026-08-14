export type NetsEasyEnvironment = "test" | "live";

const environment = process.env.NETS_EASY_ENV;

if (environment !== "test" && environment !== "live") {
  throw new Error('NETS_EASY_ENV must be either "test" or "live".');
}

const secretKey = process.env.NETS_EASY_SECRET_KEY;

if (!secretKey) {
  throw new Error("NETS_EASY_SECRET_KEY is not configured.");
}

const webhookAuthorization = process.env.NETS_EASY_WEBHOOK_AUTH;

if (!webhookAuthorization) {
  throw new Error("NETS_EASY_WEBHOOK_AUTH is not configured.");
}

export const netsEasyConfig = {
  environment,
  secretKey,
  webhookAuthorization,
  apiBaseUrl:
    environment === "test"
      ? "https://test.api.dibspayment.eu"
      : "https://api.dibspayment.eu",
} as const;
