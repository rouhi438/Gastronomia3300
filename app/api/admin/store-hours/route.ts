import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type UpdateStoreHourBody = {
  id: number;
  is_enabled: boolean;
  preorder_start: string;
  opening_time: string;
  first_scheduled_time: string;
  last_scheduled_time: string;
  closing_time: string;
  slot_interval_minutes: number;
};

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

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function isValidTime(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value.slice(0, 5))
  );
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

export async function PATCH(request: NextRequest) {
  try {
    const authError = await requireAdmin();

    if (authError) {
      return authError;
    }

    const body = (await request.json()) as UpdateStoreHourBody;

    if (!Number.isInteger(body.id) || body.id <= 0) {
      return NextResponse.json({ error: "Ugyldigt id." }, { status: 400 });
    }

    if (typeof body.is_enabled !== "boolean") {
      return NextResponse.json({ error: "Ugyldig status." }, { status: 400 });
    }

    const times = [
      body.preorder_start,
      body.opening_time,
      body.first_scheduled_time,
      body.last_scheduled_time,
      body.closing_time,
    ];

    if (!times.every(isValidTime)) {
      return NextResponse.json(
        { error: "En eller flere tider er ugyldige." },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(body.slot_interval_minutes) ||
      body.slot_interval_minutes < 5 ||
      body.slot_interval_minutes > 120
    ) {
      return NextResponse.json(
        { error: "Ugyldigt tidsinterval." },
        { status: 400 },
      );
    }

    const preorder = timeToMinutes(body.preorder_start);
    const opening = timeToMinutes(body.opening_time);
    const firstScheduled = timeToMinutes(body.first_scheduled_time);
    const lastScheduled = timeToMinutes(body.last_scheduled_time);
    const closing = timeToMinutes(body.closing_time);

    if (
      !(
        preorder <= opening &&
        opening <= firstScheduled &&
        firstScheduled <= lastScheduled &&
        lastScheduled <= closing
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Tiderne skal være i rækkefølgen: forudbestilling, åbning, første tid, sidste tid og lukning.",
        },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from("store_service_hours")
      .update({
        is_enabled: body.is_enabled,
        preorder_start: body.preorder_start,
        opening_time: body.opening_time,
        first_scheduled_time: body.first_scheduled_time,
        last_scheduled_time: body.last_scheduled_time,
        closing_time: body.closing_time,
        slot_interval_minutes: body.slot_interval_minutes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
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
      .single();

    if (error) {
      console.error("Store hours update error:", error);

      return NextResponse.json(
        { error: "Kunne ikke gemme åbningstider." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      hour: data,
    });
  } catch (error) {
    console.error("Unexpected store hours update error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
