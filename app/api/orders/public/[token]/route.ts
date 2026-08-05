import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const normalizedToken = token.trim().toLowerCase();

    if (!UUID_PATTERN.test(normalizedToken)) {
      return NextResponse.json(
        {
          error: "Ugyldigt link til ordren.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(
        `
          id,
          created_at,
          updated_at,
          status,
          estimated_time,
          requested_time,

          delivery_method,
          payment_method,

          customer_name,
          customer_phone,
          customer_email,

          customer_address,
          customer_address_line1,
          customer_postal_code,
          customer_city,
          customer_floor_door,

          order_note,
          cancel_reason,

          subtotal,
          bag_included,
          bag_fee,
          service_fee,
          delivery_fee,
          total_price,

          order_items (
            id,
            item_name,
            quantity,
            unit_price,
            size,
            extras
          )
        `,
      )
      .eq("public_token", normalizedToken)
      .maybeSingle();

    if (orderError) {
      console.error("Public order fetch error:", orderError);

      return NextResponse.json(
        {
          error: "Ordren kunne ikke hentes.",
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          error: "Ordren blev ikke fundet.",
        },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const sortedOrderItems = Array.isArray(order.order_items)
      ? [...order.order_items].sort(
          (firstItem, secondItem) => firstItem.id - secondItem.id,
        )
      : [];

    return NextResponse.json(
      {
        order: {
          ...order,
          order_items: sortedOrderItems,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error: unknown) {
    console.error("Unexpected public order fetch error:", error);

    return NextResponse.json(
      {
        error: "Der opstod en uventet fejl.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
