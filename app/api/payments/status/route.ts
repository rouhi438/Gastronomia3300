import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session");

  if (!sessionId || !UUID_PATTERN.test(sessionId)) {
    return NextResponse.json(
      {
        error: "Invalid checkout session",
      },
      { status: 400 },
    );
  }

  const supabaseAdmin = createAdminClient();

  const { data: checkoutSession, error: checkoutSessionError } =
    await supabaseAdmin
      .from("checkout_sessions")
      .select("id, status")
      .eq("id", sessionId)
      .maybeSingle();

  if (checkoutSessionError) {
    console.error(
      "Payment status checkout lookup failed:",
      checkoutSessionError,
    );

    return NextResponse.json(
      {
        error: "Failed to check payment status",
      },
      { status: 500 },
    );
  }

  if (!checkoutSession) {
    return NextResponse.json(
      {
        error: "Checkout session not found",
      },
      { status: 404 },
    );
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("public_token")
    .eq("checkout_session_id", checkoutSession.id)
    .maybeSingle();

  if (orderError) {
    console.error("Payment status order lookup failed:", orderError);

    return NextResponse.json(
      {
        error: "Failed to check order status",
      },
      { status: 500 },
    );
  }

  if (
    order &&
    typeof order.public_token === "string" &&
    order.public_token.trim() !== ""
  ) {
    return NextResponse.json(
      {
        status: "completed",
        public_token: order.public_token,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  if (
    checkoutSession.status === "failed" ||
    checkoutSession.status === "cancelled"
  ) {
    return NextResponse.json(
      {
        status: checkoutSession.status,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return NextResponse.json(
    {
      status: "pending",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
