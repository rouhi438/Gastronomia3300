import { NextRequest, NextResponse } from "next/server";

import { validateDiscount } from "@/lib/discounts/validateDiscount";
import {
  prepareOrderPricing,
  type DeliveryMethod,
} from "@/lib/orders/prepareOrder";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ugyldig forespørgsel." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Ugyldig forespørgsel." },
      { status: 400 },
    );
  }

  const input = body as Record<string, unknown>;

  if (
    !Array.isArray(input.items) ||
    typeof input.bag_included !== "boolean" ||
    (input.delivery_method !== "pickup" && input.delivery_method !== "delivery")
  ) {
    return NextResponse.json(
      { error: "Ugyldige ordreoplysninger." },
      { status: 400 },
    );
  }

  const pricingResult = await prepareOrderPricing(
    input.items,
    input.bag_included,
    input.delivery_method as DeliveryMethod,
  );

  if (!pricingResult.ok) {
    return NextResponse.json({ error: pricingResult.error }, { status: 400 });
  }

  const discountResult = await validateDiscount(
    input.discount_code,
    pricingResult.data.subtotal,
  );

  if (!discountResult.ok) {
    return NextResponse.json({ error: discountResult.error }, { status: 400 });
  }

  const discount = discountResult.discount;
  const discountAmount = discount?.discountAmount ?? 0;

  return NextResponse.json({
    code: discount?.code ?? null,
    discount_percent: discount?.discountPercent ?? 0,
    subtotal: pricingResult.data.subtotal,
    discount_amount: discountAmount,
    total_price: pricingResult.data.totalPrice - discountAmount,
  });
}
