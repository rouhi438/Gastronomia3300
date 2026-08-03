import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getProfileCompletionStatus,
  getProfileDestination,
} from "@/lib/profile";

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

  const { isComplete, error: profileError } = await getProfileCompletionStatus(
    supabase,
    user.id,
  );

  if (profileError) {
    console.error("OAuth callback profile error:", profileError.message);

    return NextResponse.redirect(`${origin}/complete-profile`);
  }

  return NextResponse.redirect(`${origin}${getProfileDestination(isComplete)}`);
}
