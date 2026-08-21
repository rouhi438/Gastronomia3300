import { NextRequest, NextResponse } from "next/server";

const SUPPORTED_LOCALES = ["da", "en"] as const;

type Locale = (typeof SUPPORTED_LOCALES)[number];

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    locale?: string;
  } | null;

  if (!SUPPORTED_LOCALES.includes(body?.locale as Locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const response = NextResponse.json({
    locale: body?.locale,
  });

  response.cookies.set("NEXT_LOCALE", body!.locale!, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });

  return response;
}
