import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_STATUSES = [
  "pending",
  "accepted",
  "ready",
  "completed",
  "cancelled",
] as const;

type OrderStatus = (typeof VALID_STATUSES)[number];

type UpdateOrderBody = {
  status?: string;
  estimated_time?: number | string | null;
};

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const role = user.app_metadata?.role ?? user.user_metadata?.role;

  if (role !== "admin") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    error: null,
    user,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // ===== Verify admin =====
    const auth = await requireAdmin();

    if (auth.error) {
      return auth.error;
    }

    // ===== Read and validate order ID =====
    const { id } = await params;
    const orderId = Number(id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    // ===== Parse request body =====
    const body = (await request.json()) as UpdateOrderBody;

    const status = body.status?.trim().toLowerCase();
    const estimatedTime =
      body.estimated_time === null ||
      body.estimated_time === undefined ||
      body.estimated_time === ""
        ? null
        : Number(body.estimated_time);

    // ===== Validate status =====
    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 },
      );
    }

    if (!VALID_STATUSES.includes(status as OrderStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // ===== Validate estimated time =====
    if (status === "accepted") {
      if (
        estimatedTime === null ||
        !Number.isInteger(estimatedTime) ||
        estimatedTime < 1 ||
        estimatedTime > 240
      ) {
        return NextResponse.json(
          {
            error:
              "Estimated time must be a whole number between 1 and 240 minutes.",
          },
          { status: 400 },
        );
      }
    }

    // ===== Build update data =====
    const updateData: {
      status: OrderStatus;
      estimated_time?: number | null;
    } = {
      status: status as OrderStatus,
    };

    if (status === "accepted") {
      updateData.estimated_time = estimatedTime;
    } else {
      updateData.estimated_time = null;
    }

    // ===== Update order =====
    const supabaseAdmin = createAdminClient();

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select(
        `
            *,
            order_items (*)
          `,
      )
      .maybeSingle();

    if (updateError) {
      console.error("Order update error:", updateError);

      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order: updatedOrder }, { status: 200 });
  } catch (error) {
    console.error("Unexpected order update error:", error);

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
