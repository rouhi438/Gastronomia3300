import { NextResponse } from "next/server";

import {
  getStoreServiceStatuses,
  type StoreServiceStatuses,
} from "@/lib/store/getStoreStatus";

export async function GET() {
  const previewBypassEnabled =
    process.env.VERCEL_ENV === "preview" &&
    process.env.PREVIEW_BYPASS_SERVICE_HOURS === "true";

  if (previewBypassEnabled) {
    const previewStatuses: StoreServiceStatuses = {
      pickup: {
        serviceType: "pickup",
        status: "open",
        canOrder: true,
        canOrderAsap: true,
        canSchedule: true,
        message: "Preview test mode: afhentning er åben.",
        preorderStart: "00:00",
        openingTime: "00:00",
        closingTime: "23:59",
        firstScheduledTime: "00:00",
        lastScheduledTime: "23:45",
        slotIntervalMinutes: 15,
        overrideUntil: null,
        overrideReason: null,
      },

      delivery: {
        serviceType: "delivery",
        status: "open",
        canOrder: true,
        canOrderAsap: true,
        canSchedule: true,
        message: "Preview test mode: levering er åben.",
        preorderStart: "00:00",
        openingTime: "00:00",
        closingTime: "23:59",
        firstScheduledTime: "00:00",
        lastScheduledTime: "23:45",
        slotIntervalMinutes: 15,
        overrideUntil: null,
        overrideReason: null,
      },
    };

    return NextResponse.json(previewStatuses);
  }

  try {
    const statuses = await getStoreServiceStatuses();

    return NextResponse.json(statuses);
  } catch (error) {
    console.error("Failed to load store service statuses:", error);

    return NextResponse.json(
      {
        error: "Store service statuses could not be loaded.",
      },
      {
        status: 500,
      },
    );
  }
}
