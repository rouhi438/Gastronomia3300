import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LoginRequestBody = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginRequestBody;

    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    // ===== Validation =====
    if (!email || !password) {
      return NextResponse.json(
        {
          error: "Email and password are required",
        },
        { status: 400 },
      );
    }

    // ===== Create cookie-based Supabase client =====
    const supabase = await createClient();

    // ===== Login =====
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login error:", error);

      let message = error.message;

      if (error.message.toLowerCase().includes("invalid login credentials")) {
        message = "Invalid email or password";
      }

      return NextResponse.json(
        {
          error: message,
        },
        { status: 401 },
      );
    }

    if (!data.user || !data.session) {
      return NextResponse.json(
        {
          error: "Login failed. No session was created.",
        },
        { status: 401 },
      );
    }

    // Session cookies are written automatically by createServerClient
    return NextResponse.json(
      {
        message: "Login successful",
        user: {
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name ?? "",
          phone: data.user.user_metadata?.phone ?? "",
          address: data.user.user_metadata?.address ?? "",
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Unexpected login error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "Invalid request body",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
