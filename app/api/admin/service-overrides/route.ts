import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ServiceType = "pickup" | "delivery";

type OverrideAction = "pause_30" | "pause_60" | "close_today" | "reopen";

type RequestBody = {
  service_type?: unknown;
  action?: unknown;
};

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }

  if (user.app_metadata?.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      user: null,
    };
  }

  return {
    error: null,
    user,
  };
}

function isServiceType(value: unknown): value is ServiceType {
  return value === "pickup" || value === "delivery";
}

function isOverrideAction(value: unknown): value is OverrideAction {
  return (
    value === "pause_30" ||
    value === "pause_60" ||
    value === "close_today" ||
    value === "reopen"
  );
}

function getCopenhagenEndOfDay() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === "year")?.value);

  const month = Number(parts.find((part) => part.type === "month")?.value);

  const day = Number(parts.find((part) => part.type === "day")?.value);

  /*
   * August = UTC+2 in Copenhagen.
   * We avoid hardcoding the offset by finding
   * tomorrow's Copenhagen midnight through Intl.
   */

  const tomorrowApprox = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0));

  const tomorrowParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(tomorrowApprox);

  const tomorrowYear = Number(
    tomorrowParts.find((part) => part.type === "year")?.value,
  );

  const tomorrowMonth = Number(
    tomorrowParts.find((part) => part.type === "month")?.value,
  );

  const tomorrowDay = Number(
    tomorrowParts.find((part) => part.type === "day")?.value,
  );

  const searchStart = Date.UTC(
    tomorrowYear,
    tomorrowMonth - 1,
    tomorrowDay,
    0,
    0,
    0,
  );

  for (let offsetMinutes = -180; offsetMinutes <= 180; offsetMinutes++) {
    const candidate = new Date(searchStart + offsetMinutes * 60_000);

    const candidateParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Copenhagen",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(candidate);

    const candidateHour = Number(
      candidateParts.find((part) => part.type === "hour")?.value,
    );

    const candidateMinute = Number(
      candidateParts.find((part) => part.type === "minute")?.value,
    );

    const candidateYear = Number(
      candidateParts.find((part) => part.type === "year")?.value,
    );

    const candidateMonth = Number(
      candidateParts.find((part) => part.type === "month")?.value,
    );

    const candidateDay = Number(
      candidateParts.find((part) => part.type === "day")?.value,
    );

    if (
      candidateYear === tomorrowYear &&
      candidateMonth === tomorrowMonth &&
      candidateDay === tomorrowDay &&
      candidateHour === 0 &&
      candidateMinute === 0
    ) {
      return candidate;
    }
  }

  throw new Error("Could not determine Copenhagen end of day.");
}

export async function GET() {
  const auth = await requireAdmin();

  if (auth.error) {
    return auth.error;
  }

  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from("store_service_overrides")
    .select("service_type,mode,override_until,reason,created_at,updated_at")
    .order("service_type");

  if (error) {
    console.error("Service override GET error:", error);

    return NextResponse.json(
      { error: "Kunne ikke hente service overrides." },
      { status: 500 },
    );
  }

  const now = Date.now();

  const overrides = (data ?? []).filter((item) => {
    return new Date(item.override_until).getTime() > now;
  });

  return NextResponse.json(
    { overrides },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();

  if (auth.error) {
    return auth.error;
  }

  const body = (await request.json()) as RequestBody;

  if (!isServiceType(body.service_type)) {
    return NextResponse.json(
      { error: "Invalid service type" },
      { status: 400 },
    );
  }

  if (!isOverrideAction(body.action)) {
    return NextResponse.json(
      { error: "Invalid override action" },
      { status: 400 },
    );
  }

  const serviceType = body.service_type;
  const action = body.action;

  const supabaseAdmin = createAdminClient();

  if (action === "reopen") {
    const { error } = await supabaseAdmin
      .from("store_service_overrides")
      .delete()
      .eq("service_type", serviceType);

    if (error) {
      console.error("Service override reopen error:", error);

      return NextResponse.json(
        { error: "Kunne ikke genåbne servicen." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      override: null,
    });
  }

  const now = new Date();

  let mode: "paused" | "closed";
  let overrideUntil: Date;
  let reason: string;

  if (action === "pause_30") {
    mode = "paused";

    overrideUntil = new Date(now.getTime() + 30 * 60_000);

    reason = "Midlertidigt pauset i 30 minutter.";
  } else if (action === "pause_60") {
    mode = "paused";

    overrideUntil = new Date(now.getTime() + 60 * 60_000);

    reason = "Midlertidigt pauset i 60 minutter.";
  } else {
    mode = "closed";
    overrideUntil = getCopenhagenEndOfDay();
    reason = "Lukket resten af dagen.";
  }

  const { data, error } = await supabaseAdmin
    .from("store_service_overrides")
    .upsert(
      {
        service_type: serviceType,
        mode,
        override_until: overrideUntil.toISOString(),
        reason,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "service_type",
      },
    )
    .select("service_type,mode,override_until,reason,created_at,updated_at")
    .single();

  if (error) {
    console.error("Service override PATCH error:", error);

    return NextResponse.json(
      { error: "Kunne ikke opdatere service override." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    override: data,
  });
}
