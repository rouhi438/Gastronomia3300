import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const verifiedEmail = user.email?.trim();

    if (!verifiedEmail || !user.email_confirmed_at) {
      return NextResponse.json(
        { error: "A verified email is required." },
        { status: 403 },
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: claimedOrders, error: claimError } = await supabaseAdmin
      .from("orders")
      .update({
        user_id: user.id,
      })
      .is("user_id", null)
      .ilike("customer_email", escapeLikePattern(verifiedEmail))
      .select("id");

    if (claimError) {
      console.error("Guest order claim failed:", claimError);

      return NextResponse.json(
        { error: "Could not connect previous orders." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        claimed: claimedOrders?.length ?? 0,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Unexpected guest order claim error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
