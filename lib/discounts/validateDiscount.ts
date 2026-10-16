import { createAdminClient } from "@/lib/supabase/admin";

export type ValidatedDiscount = {
  campaignId: string;
  code: string;
  discountPercent: number;
  discountAmount: number;
};

export type ValidateDiscountResult =
  | {
      ok: true;
      discount: ValidatedDiscount | null;
    }
  | {
      ok: false;
      error: string;
    };

export async function validateDiscount(
  input: unknown,
  subtotal: number,
): Promise<ValidateDiscountResult> {
  if (input === undefined || input === null || input === "") {
    return {
      ok: true,
      discount: null,
    };
  }

  if (typeof input !== "string") {
    return {
      ok: false,
      error: "Ugyldig rabatkode.",
    };
  }

  const code = input.trim().toUpperCase();

  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    return {
      ok: false,
      error: "Ugyldig rabatkode.",
    };
  }

  if (!Number.isSafeInteger(subtotal) || subtotal < 0) {
    return {
      ok: false,
      error: "Ugyldigt ordrebeløb.",
    };
  }

  const supabase = createAdminClient();

  const { data: campaign, error } = await supabase
    .from("discount_campaigns")
    .select("id, code, discount_percent, is_active, starts_at, ends_at")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("Discount validation failed:", error);

    return {
      ok: false,
      error: "Rabatkoden kunne ikke kontrolleres.",
    };
  }

  if (!campaign || !campaign.is_active) {
    return {
      ok: false,
      error: "Rabatkoden er ikke gyldig.",
    };
  }

  const now = Date.now();

  if (
    (campaign.starts_at && Date.parse(campaign.starts_at) > now) ||
    (campaign.ends_at && Date.parse(campaign.ends_at) <= now)
  ) {
    return {
      ok: false,
      error: "Rabatkoden er ikke aktiv i denne periode.",
    };
  }

  const percent = campaign.discount_percent;

  if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
    return {
      ok: false,
      error: "Ugyldig rabatprocent.",
    };
  }

  // Prices are currently stored as whole DKK.
  const discountAmount = Math.round((subtotal * percent) / 100);

  return {
    ok: true,
    discount: {
      campaignId: campaign.id,
      code: campaign.code,
      discountPercent: percent,
      discountAmount,
    },
  };
}
