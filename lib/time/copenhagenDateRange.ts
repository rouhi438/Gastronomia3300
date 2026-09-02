const TIME_ZONE = "Europe/Copenhagen";
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type DateParts = {
  year: number;
  month: number;
  day: number;
};

export type CopenhagenDateRange = {
  startUtc: Date;
  endExclusiveUtc: Date;
};

const offsetFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function parseDateKey(value: string): DateParts | null {
  if (!DATE_KEY_PATTERN.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return {
    year: parsed.getUTCFullYear(),
    month: parsed.getUTCMonth() + 1,
    day: parsed.getUTCDate(),
  };
}

function addDays(date: DateParts, days: number): DateParts {
  const result = new Date(Date.UTC(date.year, date.month - 1, date.day + days));

  return {
    year: result.getUTCFullYear(),
    month: result.getUTCMonth() + 1,
    day: result.getUTCDate(),
  };
}

function getTimeZoneOffset(date: Date): number {
  const parts = offsetFormatter.formatToParts(date);

  const getPart = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  const representedAsUtc = Date.UTC(
    getPart("year"),
    getPart("month") - 1,
    getPart("day"),
    getPart("hour"),
    getPart("minute"),
    getPart("second"),
  );

  return representedAsUtc - date.getTime();
}

function localMidnightToUtc(date: DateParts): Date {
  const utcGuess = Date.UTC(date.year, date.month - 1, date.day);

  let result = new Date(utcGuess);

  let offset = getTimeZoneOffset(result);
  result = new Date(utcGuess - offset);

  offset = getTimeZoneOffset(result);
  result = new Date(utcGuess - offset);

  return result;
}

export function getCopenhagenDateRange(
  from: string,
  to: string,
): CopenhagenDateRange | null {
  const startDate = parseDateKey(from);
  const endDate = parseDateKey(to);

  if (!startDate || !endDate) {
    return null;
  }

  const startValue = Date.UTC(
    startDate.year,
    startDate.month - 1,
    startDate.day,
  );

  const endValue = Date.UTC(endDate.year, endDate.month - 1, endDate.day);

  if (startValue > endValue) {
    return null;
  }

  return {
    startUtc: localMidnightToUtc(startDate),
    endExclusiveUtc: localMidnightToUtc(addDays(endDate, 1)),
  };
}
