import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createAdminClient();

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select(
        `
          id,
          created_at,
          delivery_method,
          total_price,
          status,
          public_token
        `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Profile orders fetch failed:", ordersError);

      return NextResponse.json(
        { error: "Kunne ikke hente dine ordrer." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        orders: orders ?? [],
        total: orders?.length ?? 0,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Unexpected profile orders error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
