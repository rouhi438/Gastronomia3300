import { createAdminClient } from "@/lib/supabase/admin";

const TIME_ZONE = "Europe/Copenhagen";

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function getDateParts(date: Date): DateParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);

  const getPart = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  };
}

function addDays(date: DateParts, days: number): DateParts {
  const value = new Date(Date.UTC(date.year, date.month - 1, date.day + days));

  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
  };
}

function getIsoWeekday(date: DateParts) {
  const weekday = new Date(
    Date.UTC(date.year, date.month - 1, date.day),
  ).getUTCDay();

  return weekday === 0 ? 7 : weekday;
}

function getTimeZoneOffset(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);

  const getPart = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  const asUtc = Date.UTC(
    getPart("year"),
    getPart("month") - 1,
    getPart("day"),
    getPart("hour"),
    getPart("minute"),
    getPart("second"),
  );

  return asUtc - date.getTime();
}

function localDateTimeToUtc(date: DateParts, time: string) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);

  const utcGuess = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    hours,
    minutes,
    0,
  );

  let result = new Date(utcGuess);

  let offset = getTimeZoneOffset(result);
  result = new Date(utcGuess - offset);

  offset = getTimeZoneOffset(result);
  result = new Date(utcGuess - offset);

  return result;
}

export async function getNextOpening(): Promise<Date | null> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from("store_service_hours")
    .select(
      `
      day_of_week,
      service_type,
      is_enabled,
      opening_time
    `,
    )
    .eq("is_enabled", true);

  if (error) {
    console.error("Next opening fetch error:", error);
    throw new Error("Could not load store opening hours.");
  }

  const now = new Date();
  const today = getDateParts(now);

  let nextOpening: Date | null = null;

  for (let offset = 0; offset <= 7; offset += 1) {
    const date = addDays(today, offset);
    const weekday = getIsoWeekday(date);

    const rows = (data ?? []).filter((row) => row.day_of_week === weekday);

    for (const row of rows) {
      const candidate = localDateTimeToUtc(date, row.opening_time);

      if (candidate <= now) {
        continue;
      }

      if (!nextOpening || candidate < nextOpening) {
        nextOpening = candidate;
      }
    }

    if (nextOpening) {
      break;
    }
  }

  return nextOpening;
}
