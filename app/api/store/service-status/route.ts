import { NextResponse } from "next/server";
import { getStoreServiceStatuses } from "@/lib/store/getStoreStatus";

export async function GET() {
  try {
    const statuses = await getStoreServiceStatuses();

    const previewBypassEnabled =
      process.env.VERCEL_ENV === "preview" &&
      process.env.PREVIEW_BYPASS_SERVICE_HOURS === "true";

    if (previewBypassEnabled) {
      return NextResponse.json({
        pickup: {
          ...statuses.pickup,
          status: "open",
          canOrder: true,
          canOrderAsap: true,
          canSchedule: true,
          message: "Preview test mode: afhentning er åben.",
        },
        delivery: {
          ...statuses.delivery,
          status: "open",
          canOrder: true,
          canOrderAsap: true,
          canSchedule: true,
          message: "Preview test mode: levering er åben.",
        },
      });
    }

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
