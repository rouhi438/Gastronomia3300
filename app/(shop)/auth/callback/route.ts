import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { origin } = requestUrl;

  const requestedNext = requestUrl.searchParams.get("next");

  const nextPath =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/menu";

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

  const isPasswordReset = nextPath === "/auth/reset-password";

  const destination = isPasswordReset
    ? nextPath
    : user.app_metadata?.role === "admin"
      ? "/admin/orders"
      : nextPath;

  return NextResponse.redirect(new URL(destination, origin));
}
