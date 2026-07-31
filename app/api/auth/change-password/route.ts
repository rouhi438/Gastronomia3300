import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ChangePasswordRequest = {
  newPassword?: string;
};

export async function POST(request: NextRequest) {
  try {
    const { newPassword } = (await request.json()) as ChangePasswordRequest;

    // ===== Validation =====
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        {
          error: "New password must be at least 6 characters long",
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // ===== Get current user =====
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    // ===== Update password =====
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error("Password update error:", error);

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        message: "Password updated successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Unexpected error:", error);

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
