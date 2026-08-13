import { NextRequest, NextResponse } from "next/server";

import { createNetsPayment } from "@/lib/nets/createPayment";
import { prepareCheckout } from "@/lib/orders/prepareCheckout";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { netsEasyConfig } from "@/lib/nets/config";

const VAT_RATE = 2500;

type NetsOrderItem = {
  reference: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  grossTotalAmount: number;
  netTotalAmount: number;
};

function sanitizeNetsText(value: string): string {
  return value
    .replace(/[<>'"&\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 128);
}

function createNetsOrderItem({
  reference,
  name,
  quantity,
  grossUnitPriceMinor,
}: {
  reference: string;
  name: string;
  quantity: number;
  grossUnitPriceMinor: number;
}): NetsOrderItem {
  const netUnitPrice = Math.round(
    (grossUnitPriceMinor * 10000) / (10000 + VAT_RATE),
  );

  const netTotalAmount = netUnitPrice * quantity;

  const grossTotalAmount = grossUnitPriceMinor * quantity;

  const taxAmount = grossTotalAmount - netTotalAmount;

  return {
    reference: sanitizeNetsText(reference),
    name: sanitizeNetsText(name),
    quantity,
    unit: "stk",
    unitPrice: netUnitPrice,
    taxRate: VAT_RATE,
    taxAmount,
    grossTotalAmount,
    netTotalAmount,
  };
}

export async function POST(request: NextRequest) {
  const supabaseAdmin = createAdminClient();

  let checkoutSessionId: string | null = null;

  try {
    const body = await request.json();

    const preparedCheckout = await prepareCheckout(body);

    if (!preparedCheckout.ok) {
      return NextResponse.json(
        {
          error: preparedCheckout.error,
        },
        { status: 400 },
      );
    }

    const checkout = preparedCheckout.data;

    const amountMinor = Math.round(checkout.pricing.totalPrice * 100);

    if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
      return NextResponse.json(
        {
          error: "Invalid payment amount",
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: checkoutSession, error: sessionError } = await supabaseAdmin
      .from("checkout_sessions")
      .insert({
        user_id: user?.id ?? null,
        status: "created",
        order_payload: checkout,
        amount_minor: amountMinor,
        currency: "DKK",
      })
      .select("id")
      .single();

    if (sessionError || !checkoutSession) {
      console.error("Checkout session insert failed:", sessionError);

      return NextResponse.json(
        {
          error: "Kunne ikke starte betalingen.",
        },
        { status: 500 },
      );
    }

    checkoutSessionId = checkoutSession.id;

    const netsItems: NetsOrderItem[] = checkout.pricing.items.map(
      (item, index) => {
        const details = [
          item.item_name,
          item.size !== "normal" ? item.size : null,
          item.extras.length > 0 ? item.extras.join(", ") : null,
        ]
          .filter(Boolean)
          .join(" - ");

        return createNetsOrderItem({
          reference: `item-${index + 1}`,
          name: details,
          quantity: item.quantity,
          grossUnitPriceMinor: Math.round(item.unit_price * 100),
        });
      },
    );

    if (checkout.pricing.bagFee > 0) {
      netsItems.push(
        createNetsOrderItem({
          reference: "bag-fee",
          name: "Pose",
          quantity: 1,
          grossUnitPriceMinor: Math.round(checkout.pricing.bagFee * 100),
        }),
      );
    }

    if (checkout.pricing.serviceFee > 0) {
      netsItems.push(
        createNetsOrderItem({
          reference: "service-fee",
          name: "Servicegebyr",
          quantity: 1,
          grossUnitPriceMinor: Math.round(checkout.pricing.serviceFee * 100),
        }),
      );
    }

    if (checkout.pricing.deliveryFee > 0) {
      netsItems.push(
        createNetsOrderItem({
          reference: "delivery-fee",
          name: "Levering",
          quantity: 1,
          grossUnitPriceMinor: Math.round(checkout.pricing.deliveryFee * 100),
        }),
      );
    }

    const netsItemsTotal = netsItems.reduce(
      (total, item) => total + item.grossTotalAmount,
      0,
    );

    if (netsItemsTotal !== amountMinor) {
      console.error("Nets amount mismatch:", {
        amountMinor,
        netsItemsTotal,
      });

      await supabaseAdmin
        .from("checkout_sessions")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkoutSession.id);

      return NextResponse.json(
        {
          error: "Betalingsbeløbet kunne ikke beregnes.",
        },
        { status: 500 },
      );
    }

    const origin = (process.env.SITE_URL ?? request.nextUrl.origin).replace(
      /\/+$/,
      "",
    );

    const paymentMethodsConfiguration =
      checkout.paymentMethod === "mobilepay"
        ? [
            {
              name: "MobilePay",
              enabled: true,
            },
          ]
        : [
            {
              name: "Visa",
              enabled: true,
            },
            {
              name: "MasterCard",
              enabled: true,
            },
            {
              name: "Dankort",
              enabled: true,
            },
          ];

    const netsPayment = await createNetsPayment({
      order: {
        items: netsItems,
        amount: amountMinor,
        currency: "DKK",
        reference: checkoutSession.id,
      },

      checkout: {
        integrationType: "HostedPaymentPage",

        returnUrl:
          `${origin}/payment/return` +
          `?session=${encodeURIComponent(checkoutSession.id)}`,

        cancelUrl:
          `${origin}/payment/cancelled` +
          `?session=${encodeURIComponent(checkoutSession.id)}`,

        termsUrl: `${origin}/terms`,
        merchantTermsUrl: `${origin}/privacy`,

        merchantHandlesConsumerData: true,

        charge: true,

        countryCode: "DNK",

        appearance: {
          textOptions: {
            completePaymentButtonText: "pay",
          },
        },
      },

      paymentMethodsConfiguration,

      notifications: {
        webHooks: [
          {
            eventName: "payment.charge.created.v2",
            url: `${origin}/api/payments/nets/webhook`,
            authorization: netsEasyConfig.webhookAuthorization,
          },
        ],
      },

      myReference: checkoutSession.id,
    });

    if (!netsPayment.hostedPaymentPageUrl) {
      throw new Error("Nets did not return hostedPaymentPageUrl.");
    }

    const { error: paymentUpdateError } = await supabaseAdmin
      .from("checkout_sessions")
      .update({
        status: "payment_created",
        nets_payment_id: netsPayment.paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", checkoutSession.id);

    if (paymentUpdateError) {
      console.error("Failed to save Nets payment id:", paymentUpdateError);

      throw new Error("Failed to persist Nets payment.");
    }

    return NextResponse.json(
      {
        checkout_session_id: checkoutSession.id,
        payment_id: netsPayment.paymentId,
        payment_url: netsPayment.hostedPaymentPageUrl,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Nets payment creation failed:", error);

    if (checkoutSessionId) {
      const { error: failedStatusError } = await supabaseAdmin
        .from("checkout_sessions")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkoutSessionId)
        .neq("status", "payment_created");

      if (failedStatusError) {
        console.error(
          "Checkout failure status update failed:",
          failedStatusError,
        );
      }
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "Invalid request body",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Kunne ikke oprette betalingen.",
      },
      { status: 502 },
    );
  }
}
