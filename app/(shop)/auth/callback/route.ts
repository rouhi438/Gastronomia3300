import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { origin } = requestUrl;

  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=oauth`);
  }

  const supabase = await createClient();

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("OAuth callback exchange error:", exchangeError);

    return NextResponse.redirect(`${origin}/auth?error=oauth`);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("OAuth callback user error:", userError);

    return NextResponse.redirect(`${origin}/auth?error=oauth`);
  }

  return NextResponse.redirect(`${origin}/menu`);
}
