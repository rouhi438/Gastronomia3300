import { NextRequest, NextResponse } from "next/server";
import { supabase, getValidToken } from "@/lib/supabaseClient";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // =Get tokens from headers
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    const refreshToken = request.headers.get("X-Refresh-Token") || "";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase is not configured" },
        { status: 500 },
      );
    }

    // =Refresh token if needed =
    let validToken: string = token;

    try {
      const refreshedToken = await getValidToken(token, refreshToken);

      if (!refreshedToken) {
        return NextResponse.json(
          { error: "Session expired. Please login again." },
          { status: 401 },
        );
      }

      validToken = refreshedToken;
    } catch {
      return NextResponse.json(
        { error: "Session expired. Please login again." },
        { status: 401 },
      );
    }

    // ==Verify user
    const { data: userData, error: userError } =
      await supabase.auth.getUser(validToken);
    if (userError || !userData.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // =Check admin role =
    const role = userData.user.user_metadata?.role;
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ====Get order ID
    const { id: orderId } = await params;

    // ==Parse request body
    const { status, estimated_time } = await request.json();

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 },
      );
    }

    const validStatuses = [
      "pending",
      "accepted",
      "ready",
      "completed",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // ===== Build update data
    const updateData: any = { status };
    if (estimated_time !== undefined && status === "accepted") {
      updateData.estimated_time = estimated_time;
    }

    // ===== 8. Update order in database =====
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) {
      console.error("Order update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ order: updatedOrder }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
