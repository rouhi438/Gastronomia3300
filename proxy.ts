import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },

      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  /*
   * Calling getUser() allows Supabase to use the refresh token
   * and write updated cookies when the access token has expired.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  const isApiRoute = pathname === "/api" || pathname.startsWith("/api/");

  const isAuthCallback = pathname === "/auth/callback";

  const isPasswordReset = pathname === "/auth/reset-password";

  const isFileRequest = pathname.includes(".");

  if (
    user?.app_metadata?.role === "admin" &&
    !isAdminArea &&
    !isApiRoute &&
    !isAuthCallback &&
    !isPasswordReset &&
    !isFileRequest
  ) {
    const redirectUrl = request.nextUrl.clone();

    redirectUrl.pathname = "/admin/orders";
    redirectUrl.search = "";

    const redirectResponse = NextResponse.redirect(redirectUrl);

    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });

    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Exclude static files and images from the proxy.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
