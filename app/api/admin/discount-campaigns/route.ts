import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CreateCampaignBody = {
  name?: unknown;
  code?: unknown;
  discount_percent?: unknown;
  is_active?: unknown;
  starts_at?: unknown;
  ends_at?: unknown;
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

function parseOptionalDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return { valid: true, value: null as string | null };
  }

  if (typeof value !== "string") {
    return { valid: false, value: null };
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return { valid: false, value: null };
  }

  return {
    valid: true,
    value: new Date(timestamp).toISOString(),
  };
}

export async function GET() {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from("discount_campaigns")
      .select(
        "id, name, code, discount_percent, is_active, starts_at, ends_at, created_at, updated_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Discount campaigns fetch failed:", error);

      return NextResponse.json(
        { error: "Kunne ikke hente rabatkampagner." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { campaigns: data ?? [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Unexpected discount campaigns error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdmin();
    if (authError) return authError;

    const body: CreateCampaignBody = await request.json();

    if (
      typeof body.name !== "string" ||
      body.name.trim().length < 1 ||
      body.name.trim().length > 120
    ) {
      return NextResponse.json(
        { error: "Ugyldigt kampagnenavn." },
        { status: 400 },
      );
    }

    if (typeof body.code !== "string") {
      return NextResponse.json(
        { error: "Ugyldig rabatkode." },
        { status: 400 },
      );
    }

    const code = body.code.trim().toUpperCase();

    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
      return NextResponse.json(
        { error: "Rabatkoden skal være 3-32 tegn." },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(body.discount_percent) ||
      typeof body.discount_percent !== "number" ||
      body.discount_percent < 1 ||
      body.discount_percent > 100
    ) {
      return NextResponse.json(
        { error: "Rabatprocent skal være mellem 1 og 100." },
        { status: 400 },
      );
    }

    if (body.is_active !== undefined && typeof body.is_active !== "boolean") {
      return NextResponse.json(
        { error: "Ugyldig kampagnestatus." },
        { status: 400 },
      );
    }

    const startsAt = parseOptionalDate(body.starts_at);
    const endsAt = parseOptionalDate(body.ends_at);

    if (!startsAt.valid || !endsAt.valid) {
      return NextResponse.json({ error: "Ugyldig dato." }, { status: 400 });
    }

    if (
      startsAt.value &&
      endsAt.value &&
      new Date(endsAt.value).getTime() <= new Date(startsAt.value).getTime()
    ) {
      return NextResponse.json(
        { error: "Slutdato skal være efter startdato." },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from("discount_campaigns")
      .insert({
        name: body.name.trim(),
        code,
        discount_percent: body.discount_percent,
        is_active: body.is_active ?? false,
        starts_at: startsAt.value,
        ends_at: endsAt.value,
      })
      .select(
        "id, name, code, discount_percent, is_active, starts_at, ends_at, created_at, updated_at",
      )
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Rabatkoden findes allerede." },
          { status: 409 },
        );
      }

      console.error("Discount campaign creation failed:", error);

      return NextResponse.json(
        { error: "Kunne ikke oprette rabatkampagne." },
        { status: 500 },
      );
    }

    return NextResponse.json({ campaign: data }, { status: 201 });
  } catch (error) {
    console.error("Unexpected discount campaign creation error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
