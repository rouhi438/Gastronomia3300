import { getCopenhagenDateRange } from "./copenhagenDateRange";

export type CampaignDateRange = {
  startsAt: string | null;
  endsAt: string | null;
};

export function getCampaignDateRange(
  startDate: string,
  endDate: string,
): CampaignDateRange | null {
  const start = startDate ? getCopenhagenDateRange(startDate, startDate) : null;

  const end = endDate ? getCopenhagenDateRange(endDate, endDate) : null;

  if ((startDate && !start) || (endDate && !end)) {
    return null;
  }

  const startsAt = start?.startUtc.toISOString() ?? null;
  const endsAt = end?.endExclusiveUtc.toISOString() ?? null;

  if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
    return null;
  }

  return { startsAt, endsAt };
}

const campaignDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Copenhagen",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getCopenhagenDateInput(
  value: string | null,
  isEndDate = false,
): string {
  if (!value) return "";

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) return "";

  // End dates are stored as the exclusive start of the following day.
  const date = new Date(timestamp - (isEndDate ? 1 : 0));

  const parts = campaignDateFormatter.formatToParts(date);

  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return [getPart("year"), getPart("month"), getPart("day")].join("-");
}
