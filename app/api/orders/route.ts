import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Direct order creation is disabled. Payment must be completed first.",
    },
    { status: 410 },
  );
}
