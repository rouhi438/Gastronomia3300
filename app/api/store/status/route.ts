import { NextResponse } from "next/server";

import { getStoreStatus } from "@/lib/store/getStoreStatus";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const storeStatus = await getStoreStatus();

    return NextResponse.json(storeStatus, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("Store status error:", error);

    return NextResponse.json(
      {
        error: "Store status could not be loaded.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
