import { NextRequest, NextResponse } from "next/server";
import { sendOrderAcceptedEmail } from "@/lib/email/orderEmails";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_STATUSES = ["accepted", "cancelled"] as const;

type OrderStatus = (typeof ALLOWED_STATUSES)[number];

type UpdateOrderRequest = {
  useRequestedTime?: boolean;
  orderId?: number | string;
  status?: string;
  cancelReason?: string;
  estimatedTime?: number | string;
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
      user: null,
    };
  }

  const role = user.app_metadata?.role;

  if (role !== "admin") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      user: null,
    };
  }

  return {
    error: null,
    user,
  };
}

export async function GET() {
  try {
    const auth = await requireAdmin();

    if (auth.error) {
      return auth.error;
    }

    const supabaseAdmin = createAdminClient();

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select(
        `
          *,
          order_items (*)
        `,
      )
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Orders fetch error:", ordersError);

      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        orders: orders ?? [],
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Unexpected GET orders error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();

    if (auth.error) {
      return auth.error;
    }

    const body = (await request.json()) as UpdateOrderRequest;

    const orderId = Number(body.orderId);
    const status = body.status?.trim().toLowerCase();
    const estimatedTime = Number(body.estimatedTime);
    const useRequestedTime = body.useRequestedTime === true;

    const cancelReason =
      typeof body.cancelReason === "string" ? body.cancelReason.trim() : "";

    // ===== Validate order ID =====
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    // ===== Validate status =====
    if (!status || !ALLOWED_STATUSES.includes(status as OrderStatus)) {
      return NextResponse.json(
        { error: "Invalid order status" },
        { status: 400 },
      );
    }

    // ===== Validate accepted order =====
    if (status === "accepted" && !useRequestedTime) {
      if (
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

    // ===== Validate cancelled order =====
    if (status === "cancelled" && !cancelReason) {
      return NextResponse.json(
        { error: "Cancellation reason is required" },
        { status: 400 },
      );
    }

    const updateData =
      status === "accepted"
        ? {
            status: "accepted",
            estimated_time: useRequestedTime ? null : estimatedTime,
            cancel_reason: null,
          }
        : {
            status: "cancelled",
            estimated_time: null,
            cancel_reason: cancelReason,
          };

    const supabaseAdmin = createAdminClient();

    const { data: order, error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .eq("status", "pending")
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

    if (!order) {
      return NextResponse.json(
        {
          error:
            "Order was not found or has already been accepted or cancelled.",
        },
        { status: 409 },
      );
    }
    if (status === "accepted") {
      try {
        const origin = (process.env.SITE_URL ?? request.nextUrl.origin).replace(
          /\/+$/,
          "",
        );

        const receiptUrl = `${origin}/order/${encodeURIComponent(
          String(order.public_token),
        )}`;

        await sendOrderAcceptedEmail({
          to: order.customer_email,
          customerName: order.customer_name,
          orderId: order.id,
          receiptUrl,
          estimatedTime: order.estimated_time,
          requestedTime: order.requested_time,
          deliveryMethod: order.delivery_method,
        });

        const { error: emailTimestampError } = await supabaseAdmin
          .from("orders")
          .update({
            accepted_email_sent_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        if (emailTimestampError) {
          console.error(
            "Accepted email timestamp update failed:",
            emailTimestampError,
          );
        }
      } catch (emailError: unknown) {
        console.error("Accepted order email failed:", emailError);
      }
    }
    return NextResponse.json({ order }, { status: 200 });
  } catch (error) {
    console.error("Unexpected PATCH orders error:", error);

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
