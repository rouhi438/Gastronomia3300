import { createAdminClient } from "@/lib/supabase/admin";

export type StoreOrderingStatus = "open" | "preorder" | "paused" | "closed";

export type StoreStatus = {
  status: StoreOrderingStatus;

  canOrder: boolean;
  canOrderAsap: boolean;
  canSchedule: boolean;

  message: string;

  openingTime: string | null;
  closingTime: string | null;
  firstScheduledTime: string | null;
  lastScheduledTime: string | null;
  slotIntervalMinutes: number;

  overrideUntil: string | null;
  overrideReason: string | null;
};

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);

  return hours * 60 + minutes;
}

function getCopenhagenTime() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Copenhagen",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };

  const dayOfWeek = weekday ? weekdayMap[weekday] : undefined;

  if (!dayOfWeek || !Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new Error("Could not determine Copenhagen time.");
  }

  return {
    dayOfWeek,
    currentMinutes: hour * 60 + minute,
  };
}

export async function getStoreStatus(): Promise<StoreStatus> {
  const supabaseAdmin = createAdminClient();

  const { dayOfWeek, currentMinutes } = getCopenhagenTime();

  const [
    { data: settings, error: settingsError },
    { data: hours, error: hoursError },
  ] = await Promise.all([
    supabaseAdmin
      .from("store_settings")
      .select(
        `
          ordering_mode,
          override_until,
          override_reason
        `,
      )
      .eq("id", 1)
      .single(),

    supabaseAdmin
      .from("store_hours")
      .select(
        `
          is_open,
          preorder_start,
          opening_time,
          first_scheduled_time,
          last_scheduled_time,
          closing_time,
          slot_interval_minutes
        `,
      )
      .eq("day_of_week", dayOfWeek)
      .single(),
  ]);

  if (settingsError || !settings) {
    throw new Error(
      settingsError?.message ?? "Store settings could not be loaded.",
    );
  }

  if (hoursError || !hours) {
    throw new Error(hoursError?.message ?? "Store hours could not be loaded.");
  }

  const openingTime = hours.opening_time.slice(0, 5);
  const closingTime = hours.closing_time.slice(0, 5);
  const firstScheduledTime = hours.first_scheduled_time.slice(0, 5);
  const lastScheduledTime = hours.last_scheduled_time.slice(0, 5);

  const base = {
    openingTime,
    closingTime,
    firstScheduledTime,
    lastScheduledTime,
    slotIntervalMinutes: hours.slot_interval_minutes,
    overrideUntil: settings.override_until,
    overrideReason: settings.override_reason,
  };

  const overrideUntil =
    settings.override_until !== null ? new Date(settings.override_until) : null;

  const overrideIsActive =
    overrideUntil === null || overrideUntil.getTime() > Date.now();

  if (settings.ordering_mode === "closed" && overrideIsActive) {
    return {
      ...base,
      status: "closed",
      canOrder: false,
      canOrderAsap: false,
      canSchedule: false,
      message:
        settings.override_reason || "Online bestilling er midlertidigt lukket.",
    };
  }

  if (settings.ordering_mode === "paused" && overrideIsActive) {
    return {
      ...base,
      status: "paused",
      canOrder: false,
      canOrderAsap: false,
      canSchedule: false,
      message:
        settings.override_reason ||
        "Vi holder en kort pause fra online bestillinger.",
    };
  }

  if (!hours.is_open) {
    return {
      ...base,
      status: "closed",
      canOrder: false,
      canOrderAsap: false,
      canSchedule: false,
      message: "Online bestilling er lukket i dag.",
    };
  }

  const preorderStart = timeToMinutes(hours.preorder_start);
  const opening = timeToMinutes(hours.opening_time);
  const closing = timeToMinutes(hours.closing_time);

  if (currentMinutes < preorderStart) {
    return {
      ...base,
      status: "closed",
      canOrder: false,
      canOrderAsap: false,
      canSchedule: false,
      message: `Online bestilling åbner kl. ${hours.preorder_start.slice(0, 5)}.`,
    };
  }

  if (currentMinutes < opening) {
    return {
      ...base,
      status: "preorder",
      canOrder: true,
      canOrderAsap: false,
      canSchedule: true,
      message: `Forudbestilling er åben. Første tidspunkt er kl. ${firstScheduledTime}.`,
    };
  }

  if (currentMinutes < closing) {
    return {
      ...base,
      status: "open",
      canOrder: true,
      canOrderAsap: true,
      canSchedule: true,
      message: `Vi har åbent for online bestilling til kl. ${closingTime}.`,
    };
  }

  return {
    ...base,
    status: "closed",
    canOrder: false,
    canOrderAsap: false,
    canSchedule: false,
    message: "Online bestilling er lukket for i dag.",
  };
}
