import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AvailabilityRow = {
  status: "active" | "until_next_opening" | "manual_off";
  available_again_at: string | null;
};

function isCurrentlyUnavailable(row: AvailabilityRow, now: number) {
  if (row.status === "manual_off") {
    return true;
  }

  if (row.status === "until_next_opening" && row.available_again_at) {
    return new Date(row.available_again_at).getTime() > now;
  }

  return false;
}

export async function GET() {
  try {
    const supabase = createAdminClient();

    const [
      { data: itemStatuses, error: itemError },
      { data: optionStatuses, error: optionError },
    ] = await Promise.all([
      supabase
        .from("menu_item_availability")
        .select("menu_item_id,status,available_again_at,updated_at"),

      supabase
        .from("menu_item_option_availability")
        .select("menu_item_id,option_key,status,available_again_at,updated_at"),
    ]);

    if (itemError) {
      console.error("Public menu availability error:", itemError);

      return NextResponse.json(
        {
          error: "Kunne ikke hente produkttilgængelighed.",
        },
        { status: 500 },
      );
    }

    if (optionError) {
      console.error("Public menu option availability error:", optionError);

      return NextResponse.json(
        {
          error: "Kunne ikke hente størrelsestilgængelighed.",
        },
        { status: 500 },
      );
    }

    const now = Date.now();

    return NextResponse.json(
      {
        statuses: (itemStatuses ?? []).filter((row) =>
          isCurrentlyUnavailable(row, now),
        ),

        optionStatuses: (optionStatuses ?? []).filter((row) =>
          isCurrentlyUnavailable(row, now),
        ),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Unexpected public menu availability error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
