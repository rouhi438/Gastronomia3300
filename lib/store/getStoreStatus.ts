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

export type StoreServiceType = "pickup" | "delivery";

export type StoreServiceStatus = {
  serviceType: StoreServiceType;
  status: StoreOrderingStatus;

  canOrder: boolean;
  canOrderAsap: boolean;
  canSchedule: boolean;

  message: string;

  preorderStart: string;
  openingTime: string;
  closingTime: string;
  firstScheduledTime: string;
  lastScheduledTime: string;
  slotIntervalMinutes: number;

  overrideUntil: string | null;
  overrideReason: string | null;
};

export type StoreServiceStatuses = Record<StoreServiceType, StoreServiceStatus>;

type StoreServiceHoursRow = {
  service_type: StoreServiceType;
  is_enabled: boolean;
  preorder_start: string;
  opening_time: string;
  first_scheduled_time: string;
  last_scheduled_time: string;
  closing_time: string;
  slot_interval_minutes: number;
};

type StoreSettingsRow = {
  ordering_mode: string;
  override_until: string | null;
  override_reason: string | null;
};

type StoreServiceOverrideRow = {
  service_type: StoreServiceType;
  mode: "paused" | "closed";
  override_until: string;
  reason: string | null;
};

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);

  return hours * 60 + minutes;
}

function shortTime(value: string): string {
  return value.slice(0, 5);
}

function getServiceLabel(serviceType: StoreServiceType): string {
  return serviceType === "pickup" ? "Afhentning" : "Levering";
}

function buildServiceStatus(
  hours: StoreServiceHoursRow,
  settings: StoreSettingsRow,
  currentMinutes: number,
  serviceOverride: StoreServiceOverrideRow | null = null,
): StoreServiceStatus {
  const preorderStart = shortTime(hours.preorder_start);

  const openingTime = shortTime(hours.opening_time);

  const firstScheduledTime = shortTime(hours.first_scheduled_time);

  const lastScheduledTime = shortTime(hours.last_scheduled_time);

  const closingTime = shortTime(hours.closing_time);

  const serviceLabel = getServiceLabel(hours.service_type);

  const base = {
    serviceType: hours.service_type,

    preorderStart,
    openingTime,
    closingTime,
    firstScheduledTime,
    lastScheduledTime,

    slotIntervalMinutes: hours.slot_interval_minutes,

    overrideUntil: settings.override_until,

    overrideReason: settings.override_reason,
  };

  /*
   * Global store override.
   * This still has priority over
   * pickup/delivery specific overrides.
   */

  const globalOverrideUntil =
    settings.override_until !== null ? new Date(settings.override_until) : null;

  const globalOverrideIsActive =
    globalOverrideUntil === null || globalOverrideUntil.getTime() > Date.now();

  if (settings.ordering_mode === "closed" && globalOverrideIsActive) {
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

  if (settings.ordering_mode === "paused" && globalOverrideIsActive) {
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

  /*
   * Service-specific override.
   *
   * Pickup and delivery are independent.
   * An expired override is ignored
   * automatically, so no cron job is needed.
   */

  const serviceOverrideIsActive =
    serviceOverride !== null &&
    new Date(serviceOverride.override_until).getTime() > Date.now();

  if (serviceOverride && serviceOverrideIsActive) {
    if (serviceOverride.mode === "paused") {
      return {
        ...base,

        status: "paused",

        canOrder: false,
        canOrderAsap: false,
        canSchedule: false,

        overrideUntil: serviceOverride.override_until,

        overrideReason: serviceOverride.reason,

        message:
          serviceOverride.reason || `${serviceLabel} er midlertidigt pauset.`,
      };
    }

    if (serviceOverride.mode === "closed") {
      return {
        ...base,

        status: "closed",

        canOrder: false,
        canOrderAsap: false,
        canSchedule: false,

        overrideUntil: serviceOverride.override_until,

        overrideReason: serviceOverride.reason,

        message:
          serviceOverride.reason || `${serviceLabel} er midlertidigt lukket.`,
      };
    }
  }

  /*
   * Normal service hours.
   */

  if (!hours.is_enabled) {
    return {
      ...base,

      status: "closed",

      canOrder: false,
      canOrderAsap: false,
      canSchedule: false,

      message: `${serviceLabel} er lukket i dag.`,
    };
  }

  const preorderStartMinutes = timeToMinutes(hours.preorder_start);

  const openingMinutes = timeToMinutes(hours.opening_time);

  const lastScheduledMinutes = timeToMinutes(hours.last_scheduled_time);

  const closingMinutes = timeToMinutes(hours.closing_time);

  if (currentMinutes < preorderStartMinutes) {
    return {
      ...base,

      status: "closed",

      canOrder: false,
      canOrderAsap: false,
      canSchedule: false,

      message: `${serviceLabel} åbner for bestilling kl. ${preorderStart}.`,
    };
  }

  if (currentMinutes < openingMinutes) {
    return {
      ...base,

      status: "preorder",

      canOrder: true,
      canOrderAsap: false,
      canSchedule: true,

      message: `Forudbestilling til ${serviceLabel.toLowerCase()} er åben. Første tidspunkt er kl. ${firstScheduledTime}.`,
    };
  }

  if (currentMinutes < closingMinutes) {
    const canSchedule = currentMinutes <= lastScheduledMinutes;

    return {
      ...base,

      status: "open",

      canOrder: true,
      canOrderAsap: true,
      canSchedule,

      message: canSchedule
        ? `${serviceLabel} er åben til kl. ${closingTime}.`
        : `${serviceLabel} er åben til kl. ${closingTime}. Planlagte tider er lukket for i dag.`,
    };
  }

  return {
    ...base,

    status: "closed",

    canOrder: false,
    canOrderAsap: false,
    canSchedule: false,

    message: `${serviceLabel} er lukket for i dag.`,
  };
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

      message: `Online bestilling åbner kl. ${hours.preorder_start.slice(
        0,
        5,
      )}.`,
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

export async function getStoreServiceStatuses(): Promise<StoreServiceStatuses> {
  const supabaseAdmin = createAdminClient();

  const { dayOfWeek, currentMinutes } = getCopenhagenTime();

  const [
    { data: settings, error: settingsError },

    { data: serviceHours, error: serviceHoursError },

    { data: serviceOverrides, error: serviceOverridesError },
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
      .from("store_service_hours")
      .select(
        `
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
      .eq("day_of_week", dayOfWeek),

    supabaseAdmin.from("store_service_overrides").select(
      `
          service_type,
          mode,
          override_until,
          reason
        `,
    ),
  ]);

  if (settingsError || !settings) {
    throw new Error(
      settingsError?.message ?? "Store settings could not be loaded.",
    );
  }

  if (serviceHoursError || !serviceHours) {
    throw new Error(
      serviceHoursError?.message ?? "Store service hours could not be loaded.",
    );
  }

  if (serviceOverridesError) {
    throw new Error(
      serviceOverridesError.message ??
        "Store service overrides could not be loaded.",
    );
  }

  const typedSettings = settings as StoreSettingsRow;

  const typedServiceHours = serviceHours as StoreServiceHoursRow[];

  const typedServiceOverrides = (serviceOverrides ??
    []) as StoreServiceOverrideRow[];

  const pickupHours = typedServiceHours.find(
    (hours) => hours.service_type === "pickup",
  );

  const deliveryHours = typedServiceHours.find(
    (hours) => hours.service_type === "delivery",
  );

  if (!pickupHours || !deliveryHours) {
    throw new Error("Store service hours are incomplete for today.");
  }

  const now = Date.now();

  const pickupOverride =
    typedServiceOverrides.find(
      (override) =>
        override.service_type === "pickup" &&
        new Date(override.override_until).getTime() > now,
    ) ?? null;

  const deliveryOverride =
    typedServiceOverrides.find(
      (override) =>
        override.service_type === "delivery" &&
        new Date(override.override_until).getTime() > now,
    ) ?? null;

  return {
    pickup: buildServiceStatus(
      pickupHours,
      typedSettings,
      currentMinutes,
      pickupOverride,
    ),

    delivery: buildServiceStatus(
      deliveryHours,
      typedSettings,
      currentMinutes,
      deliveryOverride,
    ),
  };
}
