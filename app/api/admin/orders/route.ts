import { NextRequest, NextResponse } from "next/server";
import {
  sendOrderAcceptedEmail,
  sendOrderRejectedEmail,
} from "@/lib/email/orderEmails";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createFulfillmentTiming } from "@/lib/orders/fulfillmentTiming";

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

    const previousOrderCounts = new Map<string, number>();

    const ordersWithHistory = [...(orders ?? [])]
      .reverse()
      .map((order) => {
        if (!order.user_id) {
          return {
            ...order,
            previous_orders_count: null,
          };
        }

        const previousOrdersCount = previousOrderCounts.get(order.user_id) ?? 0;

        previousOrderCounts.set(order.user_id, previousOrdersCount + 1);

        return {
          ...order,
          previous_orders_count: previousOrdersCount,
        };
      })
      .reverse();

    return NextResponse.json(
      {
        orders: ordersWithHistory,
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

    /*
     * All cancellations must use the order-specific route, where
     * paid orders receive refund processing and concurrency guards.
     */
    if (status === "cancelled") {
      return NextResponse.json(
        {
          error: "Cancellation must use the order-specific endpoint.",
        },
        { status: 409 },
      );
    }

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

    const supabaseAdmin = createAdminClient();

    const { data: currentOrder, error: currentOrderError } = await supabaseAdmin
      .from("orders")
      .select("id, requested_time")
      .eq("id", orderId)
      .eq("status", "pending")
      .maybeSingle();

    if (currentOrderError) {
      console.error("Order timing lookup failed:", currentOrderError);

      return NextResponse.json(
        { error: "Order timing lookup failed" },
        { status: 500 },
      );
    }

    if (!currentOrder) {
      return NextResponse.json(
        {
          error: "Order was not found or is no longer pending.",
        },
        { status: 409 },
      );
    }

    let fulfillmentTiming: ReturnType<typeof createFulfillmentTiming>;

    try {
      fulfillmentTiming = createFulfillmentTiming({
        estimatedTimeMinutes: useRequestedTime ? null : estimatedTime,
        requestedTime:
          typeof currentOrder.requested_time === "string"
            ? currentOrder.requested_time
            : null,
        useRequestedTime,
      });
    } catch (timingError: unknown) {
      console.error("Order fulfillment timing failed:", timingError);

      return NextResponse.json(
        {
          error:
            timingError instanceof Error
              ? timingError.message
              : "Could not determine fulfillment time.",
        },
        { status: 400 },
      );
    }

    const updateData = {
      status: "accepted",
      estimated_time: useRequestedTime ? null : estimatedTime,
      cancel_reason: null,
      accepted_at: fulfillmentTiming.acceptedAt,
      fulfillment_due_at: fulfillmentTiming.fulfillmentDueAt,
      completed_at: null,
    };

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
    // ==== validate reject order ====
    if (order.status === "cancelled") {
      try {
        const origin = (process.env.SITE_URL ?? request.nextUrl.origin).replace(
          /\/+$/,
          "",
        );

        const receiptUrl = `${origin}/order/${encodeURIComponent(
          String(order.public_token),
        )}`;

        await sendOrderRejectedEmail({
          to: order.customer_email,
          customerName: order.customer_name,
          orderId: order.id,
          receiptUrl,
          cancelReason: order.cancel_reason,
        });

        const { error: emailTimestampError } = await supabaseAdmin
          .from("orders")
          .update({
            rejected_email_sent_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        if (emailTimestampError) {
          console.error(
            "Rejected email timestamp update failed:",
            emailTimestampError,
          );
        }
      } catch (emailError: unknown) {
        console.error("Rejected order email failed:", emailError);
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
