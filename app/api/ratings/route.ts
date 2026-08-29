import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MINIMUM_PUBLIC_RATINGS = 5;
const MAXIMUM_PUBLIC_ENTRIES = 12;

type RatingSummaryRow = {
  total_ratings: number | string | null;
  average_rating: number | string | null;
};

function publicResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient();

    const { data: summary, error: summaryError } = await supabaseAdmin
      .rpc("get_order_feedback_rating_summary")
      .single();

    if (summaryError) {
      console.error("Public rating summary failed:", summaryError);

      return publicResponse(
        { error: "Rating summary could not be loaded." },
        500,
      );
    }

    const typedSummary = summary as RatingSummaryRow | null;

    const totalRatings = Number(typedSummary?.total_ratings ?? 0);
    const averageRating = Number(typedSummary?.average_rating ?? 0);

    if (!Number.isFinite(totalRatings) || !Number.isFinite(averageRating)) {
      console.error("Public rating summary returned invalid values.");

      return publicResponse(
        { error: "Rating summary could not be loaded." },
        500,
      );
    }

    if (totalRatings < MINIMUM_PUBLIC_RATINGS) {
      return publicResponse({
        available: false,
        minimumRatings: MINIMUM_PUBLIC_RATINGS,
      });
    }

    const { data: publicEntries, error: publicEntriesError } =
      await supabaseAdmin
        .from("order_feedback")
        .select("rating, public_display_name")
        .eq("public_name_consent", true)
        .not("public_display_name", "is", null)
        .order("created_at", { ascending: false })
        .limit(MAXIMUM_PUBLIC_ENTRIES);

    if (publicEntriesError) {
      console.error("Public rating entries failed:", publicEntriesError);

      return publicResponse(
        { error: "Public ratings could not be loaded." },
        500,
      );
    }

    return publicResponse({
      available: true,
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings,
      entries: (publicEntries ?? []).map((entry) => ({
        firstName: entry.public_display_name,
        rating: entry.rating,
      })),
    });
  } catch (error: unknown) {
    console.error("Unexpected public rating GET error:", error);

    return publicResponse(
      { error: "Rating summary could not be loaded." },
      500,
    );
  }
}
