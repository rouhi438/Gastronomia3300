import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminRegisterRequest = {
  email?: string;
  password?: string;
  full_name?: string;
  phone?: string;
  address?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AdminRegisterRequest;

    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const fullName = body.full_name?.trim() ?? "";
    const phone = body.phone?.trim() ?? "";
    const address = body.address?.trim() ?? "";

    // ===== Validation =====
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();

    // ===== Create auth user =====
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        address,
      },
    });

    if (error) {
      console.error("Admin register error:", error);

      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json(
        { error: "User could not be created" },
        { status: 500 },
      );
    }

    // ===== Create profile =====
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: data.user.id,
        full_name: fullName,
        phone,
        address,
      });

    if (profileError) {
      console.error("Profile insert error:", profileError);

      // جلوگیری از باقی ماندن کاربر ناقص در Auth
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
        data.user.id,
      );

      if (deleteError) {
        console.error("Failed to delete incomplete auth user:", deleteError);
      }

      return NextResponse.json(
        { error: profileError.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          phone,
          address,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unexpected admin register error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
