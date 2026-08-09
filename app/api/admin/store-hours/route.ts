import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export async function GET() {
  try {
    const authError = await requireAdmin();

    if (authError) {
      return authError;
    }

    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from("store_service_hours")
      .select(
        `
        id,
        day_of_week,
        service_type,
        is_enabled,
        preorder_start,
        opening_time,
        first_scheduled_time,
        last_scheduled_time,
        closing_time,
        slot_interval_minutes
      `,
      )
      .order("day_of_week", { ascending: true })
      .order("service_type", { ascending: true });

    if (error) {
      console.error("Store hours fetch error:", error);

      return NextResponse.json(
        { error: "Kunne ikke hente åbningstider." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      hours: data ?? [],
    });
  } catch (error) {
    console.error("Unexpected store hours error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
