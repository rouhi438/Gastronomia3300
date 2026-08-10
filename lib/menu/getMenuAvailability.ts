import { createAdminClient } from "@/lib/supabase/admin";

type AvailabilityStatus = "active" | "until_next_opening" | "manual_off";

type ItemAvailabilityRow = {
  menu_item_id: number;
  status: AvailabilityStatus;
  available_again_at: string | null;
};

type OptionAvailabilityRow = {
  menu_item_id: number;
  option_key: string;
  status: AvailabilityStatus;
  available_again_at: string | null;
};

function optionNameToKey(name: string) {
  return name.toLowerCase().replace(/\s+/g, "");
}

function isUnavailable(
  status: AvailabilityStatus,
  availableAgainAt: string | null,
) {
  if (status === "manual_off") {
    return true;
  }

  if (status === "until_next_opening" && availableAgainAt) {
    return new Date(availableAgainAt).getTime() > Date.now();
  }

  return false;
}

export async function getMenuAvailability() {
  const supabase = createAdminClient();

  const [
    { data: itemRows, error: itemError },
    { data: optionRows, error: optionError },
  ] = await Promise.all([
    supabase
      .from("menu_item_availability")
      .select("menu_item_id,status,available_again_at"),

    supabase
      .from("menu_item_option_availability")
      .select("menu_item_id,option_key,status,available_again_at"),
  ]);

  if (itemError) {
    throw itemError;
  }

  if (optionError) {
    throw optionError;
  }

  const unavailableItems = new Set<number>();

  for (const row of (itemRows ?? []) as ItemAvailabilityRow[]) {
    if (isUnavailable(row.status, row.available_again_at)) {
      unavailableItems.add(row.menu_item_id);
    }
  }

  const unavailableOptions = new Set<string>();

  for (const row of (optionRows ?? []) as OptionAvailabilityRow[]) {
    if (isUnavailable(row.status, row.available_again_at)) {
      unavailableOptions.add(
        `${row.menu_item_id}:${optionNameToKey(row.option_key)}`,
      );
    }
  }

  return {
    isItemAvailable(menuItemId: number) {
      return !unavailableItems.has(menuItemId);
    },

    isOptionAvailable(menuItemId: number, optionName: string) {
      const key = `${menuItemId}:${optionNameToKey(optionName)}`;

      return !unavailableOptions.has(key);
    },
  };
}
