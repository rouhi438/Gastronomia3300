import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient"; // ← استفاده از supabaseAdmin

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, phone, address } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          error:
            "Supabase admin client is not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 },
      );
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || "",
        phone: phone || "",
        address: address || "",
      },
    });

    if (error) {
      console.error("Admin signup error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // ==create profiles in table =====
    if (data.user) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: data.user.id,
          full_name: full_name || "",
          phone: phone || "",
          address: address || "",
        });

      if (profileError) {
        console.error("Profile insert error:", profileError);
        return NextResponse.json(
          { error: profileError.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { message: "User registered successfully", user: data.user },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
