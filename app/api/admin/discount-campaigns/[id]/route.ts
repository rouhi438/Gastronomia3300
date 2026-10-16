import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdateCampaignBody = {
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
  if (value === null || value === "") {
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

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const authError = await requireAdmin();

    if (authError) {
      return authError;
    }

    const { id } = await context.params;

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
    ) {
      return NextResponse.json(
        { error: "Ugyldigt kampagne-id." },
        { status: 400 },
      );
    }

    const body: UpdateCampaignBody = await request.json();

    const updates: Record<string, string | number | boolean | null> = {};

    if (body.name !== undefined) {
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

      updates.name = body.name.trim();
    }

    if (body.code !== undefined) {
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

      updates.code = code;
    }

    if (body.discount_percent !== undefined) {
      if (
        typeof body.discount_percent !== "number" ||
        !Number.isInteger(body.discount_percent) ||
        body.discount_percent < 1 ||
        body.discount_percent > 100
      ) {
        return NextResponse.json(
          { error: "Rabatprocent skal være mellem 1 og 100." },
          { status: 400 },
        );
      }

      updates.discount_percent = body.discount_percent;
    }

    if (body.is_active !== undefined) {
      if (typeof body.is_active !== "boolean") {
        return NextResponse.json(
          { error: "Ugyldig kampagnestatus." },
          { status: 400 },
        );
      }

      updates.is_active = body.is_active;
    }

    if (body.starts_at !== undefined) {
      const parsed = parseOptionalDate(body.starts_at);

      if (!parsed.valid) {
        return NextResponse.json(
          { error: "Ugyldig startdato." },
          { status: 400 },
        );
      }

      updates.starts_at = parsed.value;
    }

    if (body.ends_at !== undefined) {
      const parsed = parseOptionalDate(body.ends_at);

      if (!parsed.valid) {
        return NextResponse.json(
          { error: "Ugyldig slutdato." },
          { status: 400 },
        );
      }

      updates.ends_at = parsed.value;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Ingen ændringer angivet." },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("discount_campaigns")
      .select("starts_at, ends_at")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("Discount campaign fetch failed:", fetchError);

      return NextResponse.json(
        { error: "Kunne ikke hente rabatkampagnen." },
        { status: 500 },
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: "Rabatkampagnen findes ikke." },
        { status: 404 },
      );
    }

    const startsAt =
      updates.starts_at !== undefined ? updates.starts_at : existing.starts_at;

    const endsAt =
      updates.ends_at !== undefined ? updates.ends_at : existing.ends_at;

    if (
      typeof startsAt === "string" &&
      typeof endsAt === "string" &&
      new Date(endsAt).getTime() <= new Date(startsAt).getTime()
    ) {
      return NextResponse.json(
        { error: "Slutdato skal være efter startdato." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("discount_campaigns")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
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

      console.error("Discount campaign update failed:", error);

      return NextResponse.json(
        { error: "Kunne ikke opdatere rabatkampagnen." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { campaign: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Unexpected discount campaign update error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
