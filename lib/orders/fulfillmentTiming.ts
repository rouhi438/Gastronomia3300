const STORE_TIME_ZONE = "Europe/Copenhagen";
const MAX_ESTIMATED_MINUTES = 240;
const MINUTE_MS = 60_000;

/*
 * Searching actual UTC minutes avoids incorrect deadlines during
 * Copenhagen daylight-saving-time transitions.
 */
const storeClockFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: STORE_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function getStoreClock(date: Date): string {
  const parts = storeClockFormatter.formatToParts(date);

  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;

  if (!hour || !minute) {
    throw new Error("Could not determine the store clock time.");
  }

  return `${hour}:${minute}`;
}

function getNextRequestedDate(requestedTime: string, acceptedAt: Date): Date {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(requestedTime)) {
    throw new Error("Requested time must use HH:mm format.");
  }

  const candidate = new Date(acceptedAt);
  candidate.setUTCSeconds(0, 0);

  if (candidate.getTime() < acceptedAt.getTime()) {
    candidate.setTime(candidate.getTime() + MINUTE_MS);
  }

  /*
   * A local clock time always occurs within the next 26 real hours,
   * including daylight-saving-time transition days.
   */
  for (let minute = 0; minute <= 26 * 60; minute += 1) {
    if (getStoreClock(candidate) === requestedTime) {
      return candidate;
    }

    candidate.setTime(candidate.getTime() + MINUTE_MS);
  }

  throw new Error("Could not resolve the requested fulfillment time.");
}

export function createFulfillmentTiming({
  estimatedTimeMinutes,
  requestedTime,
  useRequestedTime,
  acceptedAt = new Date(),
}: {
  estimatedTimeMinutes: number | null;
  requestedTime: string | null;
  useRequestedTime: boolean;
  acceptedAt?: Date;
}): {
  acceptedAt: string;
  fulfillmentDueAt: string;
} {
  if (!Number.isFinite(acceptedAt.getTime())) {
    throw new Error("Accepted timestamp is invalid.");
  }

  let fulfillmentDueAt: Date;

  if (useRequestedTime) {
    if (!requestedTime || requestedTime === "asap") {
      throw new Error("A scheduled requested time is required.");
    }

    fulfillmentDueAt = getNextRequestedDate(requestedTime, acceptedAt);
  } else {
    if (
      !Number.isInteger(estimatedTimeMinutes) ||
      estimatedTimeMinutes === null ||
      estimatedTimeMinutes < 1 ||
      estimatedTimeMinutes > MAX_ESTIMATED_MINUTES
    ) {
      throw new Error(
        "Estimated time must be a whole number between 1 and 240 minutes.",
      );
    }

    fulfillmentDueAt = new Date(
      acceptedAt.getTime() + estimatedTimeMinutes * MINUTE_MS,
    );
  }

  return {
    acceptedAt: acceptedAt.toISOString(),
    fulfillmentDueAt: fulfillmentDueAt.toISOString(),
  };
}
