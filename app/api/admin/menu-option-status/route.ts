import { NextRequest, NextResponse } from "next/server";

import { extraGroups, menuData } from "@/data/menu";
import { getNextOpening } from "@/lib/store/getNextOpening";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AvailabilityStatus = "active" | "until_next_opening" | "manual_off";

type UpdateOptionStatusBody = {
  menu_item_id: number;
  option_key: string;
  status: AvailabilityStatus;
};

const validStatuses: AvailabilityStatus[] = [
  "active",
  "until_next_opening",
  "manual_off",
];

const drinkOptionGroupIds = new Set<keyof typeof extraGroups>([
  "drinkSizes",
  "cocaColaSizes",
  "faxeKondiSizes",
]);

function optionNameToKey(name: string) {
  return name.toLowerCase().replace(/\s+/g, "");
}

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
      .from("menu_item_option_availability")
      .select(
        `
        menu_item_id,
        option_key,
        status,
        available_again_at,
        updated_at
      `,
      )
      .order("menu_item_id", { ascending: true })
      .order("option_key", { ascending: true });

    if (error) {
      console.error("Menu option status fetch error:", error);

      return NextResponse.json(
        { error: "Kunne ikke hente variantstatus." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      statuses: data ?? [],
    });
  } catch (error) {
    console.error("Unexpected menu option status error:", error);

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

    const body = (await request.json()) as UpdateOptionStatusBody;

    if (!Number.isInteger(body.menu_item_id) || body.menu_item_id <= 0) {
      return NextResponse.json(
        { error: "Ugyldigt produkt-id." },
        { status: 400 },
      );
    }

    const menuItem = menuData.find((item) => item.id === body.menu_item_id);

    if (!menuItem) {
      return NextResponse.json(
        { error: "Produktet findes ikke." },
        { status: 404 },
      );
    }

    if (!drinkOptionGroupIds.has(menuItem.extraGroupId)) {
      return NextResponse.json(
        {
          error:
            "Produktet understøtter ikke individuelle størrelsesstatusser.",
        },
        { status: 400 },
      );
    }

    const validOptionKeys = new Set(
      extraGroups[menuItem.extraGroupId].map((option) =>
        optionNameToKey(option.name),
      ),
    );

    if (
      typeof body.option_key !== "string" ||
      !validOptionKeys.has(body.option_key)
    ) {
      return NextResponse.json(
        { error: "Ugyldig størrelse." },
        { status: 400 },
      );
    }

    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Ugyldig status." }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    if (body.status === "active") {
      const { error } = await supabaseAdmin
        .from("menu_item_option_availability")
        .delete()
        .eq("menu_item_id", body.menu_item_id)
        .eq("option_key", body.option_key);

      if (error) {
        console.error("Menu option status delete error:", error);

        return NextResponse.json(
          { error: "Kunne ikke aktivere størrelsen." },
          { status: 500 },
        );
      }

      return NextResponse.json({
        status: {
          menu_item_id: body.menu_item_id,
          option_key: body.option_key,
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
      .from("menu_item_option_availability")
      .upsert(
        {
          menu_item_id: body.menu_item_id,
          option_key: body.option_key,
          status: body.status,
          available_again_at: availableAgainAt,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "menu_item_id,option_key",
        },
      )
      .select(
        `
        menu_item_id,
        option_key,
        status,
        available_again_at,
        updated_at
      `,
      )
      .single();

    if (error) {
      console.error("Menu option status update error:", error);

      return NextResponse.json(
        { error: "Kunne ikke gemme størrelsesstatus." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: data,
    });
  } catch (error) {
    console.error("Unexpected menu option status update error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
