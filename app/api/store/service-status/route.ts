import { NextResponse } from "next/server";
import { getStoreServiceStatuses } from "@/lib/store/getStoreStatus";

export async function GET() {
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
