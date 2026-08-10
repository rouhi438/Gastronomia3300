import { NextRequest, NextResponse } from "next/server";

import { menuData } from "@/data/menu";
import { getNextOpening } from "@/lib/store/getNextOpening";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AvailabilityStatus = "active" | "until_next_opening" | "manual_off";

type UpdateMenuStatusBody = {
  menu_item_id: number;
  status: AvailabilityStatus;
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

const validStatuses: AvailabilityStatus[] = [
  "active",
  "until_next_opening",
  "manual_off",
];

export async function GET() {
  try {
    const authError = await requireAdmin();

    if (authError) {
      return authError;
    }

    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from("menu_item_availability")
      .select(
        `
        menu_item_id,
        status,
        available_again_at,
        updated_at
      `,
      )
      .order("menu_item_id", { ascending: true });

    if (error) {
      console.error("Menu status fetch error:", error);

      return NextResponse.json(
        { error: "Kunne ikke hente produktstatus." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      statuses: data ?? [],
    });
  } catch (error) {
    console.error("Unexpected menu status error:", error);

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

    const body = (await request.json()) as UpdateMenuStatusBody;

    if (!Number.isInteger(body.menu_item_id) || body.menu_item_id <= 0) {
      return NextResponse.json(
        { error: "Ugyldigt produkt-id." },
        { status: 400 },
      );
    }

    const menuItemExists = menuData.some(
      (item) => item.id === body.menu_item_id,
    );

    if (!menuItemExists) {
      return NextResponse.json(
        { error: "Produktet findes ikke." },
        { status: 404 },
      );
    }

    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Ugyldig produktstatus." },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();

    if (body.status === "active") {
      const { error } = await supabaseAdmin
        .from("menu_item_availability")
        .delete()
        .eq("menu_item_id", body.menu_item_id);

      if (error) {
        console.error("Menu status delete error:", error);

        return NextResponse.json(
          { error: "Kunne ikke aktivere produktet." },
          { status: 500 },
        );
      }

      return NextResponse.json({
        status: {
          menu_item_id: body.menu_item_id,
          status: "active",
          available_again_at: null,
        },
      });
    }

    let availableAgainAt: string | null = null;

    if (body.status === "until_next_opening") {
      const nextOpening = await getNextOpening();

      if (!nextOpening) {
        return NextResponse.json(
          {
            error: "Kunne ikke finde den næste åbningstid.",
          },
          { status: 400 },
        );
      }

      availableAgainAt = nextOpening.toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from("menu_item_availability")
      .upsert(
        {
          menu_item_id: body.menu_item_id,
          status: body.status,
          available_again_at: availableAgainAt,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "menu_item_id",
        },
      )
      .select(
        `
        menu_item_id,
        status,
        available_again_at,
        updated_at
      `,
      )
      .single();

    if (error) {
      console.error("Menu status update error:", error);

      return NextResponse.json(
        { error: "Kunne ikke gemme produktstatus." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: data,
    });
  } catch (error) {
    console.error("Unexpected menu status update error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
