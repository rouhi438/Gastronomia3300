import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refundNetsCharge } from "@/lib/nets/refundCharge";

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

  const role = user.app_metadata?.role;

  if (role !== "admin") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { error: null, user };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();

    if (auth.error) {
      return auth.error;
    }

    const { id } = await params;
    const orderId = Number(id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body = (await request.json()) as UpdateOrderBody;
    const status = body.status?.trim().toLowerCase();

    const estimatedTime =
      body.estimated_time === null ||
      body.estimated_time === undefined ||
      body.estimated_time === ""
        ? null
        : Number(body.estimated_time);

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 },
      );
    }

    if (!VALID_STATUSES.includes(status as OrderStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

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

    const supabaseAdmin = createAdminClient();

    /*
     * Always load the current payment/refund state before changing
     * the restaurant order.
     */
    const { data: currentOrder, error: currentOrderError } = await supabaseAdmin
      .from("orders")
      .select(
        `
          id,
          status,
          checkout_session_id,
          nets_payment_id,
          nets_charge_id,
          nets_refund_id,
          refund_status,
          refund_amount_minor,
          refund_requested_at
        `,
      )
      .eq("id", orderId)
      .maybeSingle();

    if (currentOrderError) {
      console.error("Order lookup error:", currentOrderError);

      return NextResponse.json(
        { error: "Failed to load order" },
        { status: 500 },
      );
    }

    if (!currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    /*
     * Once refund processing has started, the restaurant order
     * must not be moved back to accepted/ready/completed.
     *
     * refund_requested_at is also used as the pre-refund claim,
     * so this guard closes the race before the external Nets call.
     */
    const refundHasStarted =
      Boolean(currentOrder.refund_requested_at) ||
      Boolean(currentOrder.nets_refund_id) ||
      currentOrder.refund_status !== null;

    if (status !== "cancelled" && refundHasStarted) {
      return NextResponse.json(
        {
          error:
            "This order has entered refund processing and its status cannot be changed.",
        },
        { status: 409 },
      );
    }

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

    /*
     * If this becomes non-null, cancellation is allowed only while
     * this exact refund is pending or completed.
     */
    let expectedRefundId: string | null = null;

    if (status === "cancelled") {
      const hasAnyNetsPaymentReference =
        Boolean(currentOrder.checkout_session_id) ||
        Boolean(currentOrder.nets_payment_id) ||
        Boolean(currentOrder.nets_charge_id);

      /*
       * Historical orders without Nets references can still be
       * cancelled normally because there is no Nets charge to refund.
       */
      if (hasAnyNetsPaymentReference) {
        if (
          !currentOrder.checkout_session_id ||
          !currentOrder.nets_payment_id ||
          !currentOrder.nets_charge_id
        ) {
          console.error("Incomplete Nets payment reference on order:", {
            orderId,
            checkoutSessionId: currentOrder.checkout_session_id,
            paymentId: currentOrder.nets_payment_id,
            chargeId: currentOrder.nets_charge_id,
          });

          return NextResponse.json(
            {
              error:
                "The order payment information is incomplete. The order was not cancelled.",
            },
            { status: 409 },
          );
        }

        /*
         * An already-known refund must never create another refund.
         */
        if (
          currentOrder.refund_status === "pending" ||
          currentOrder.refund_status === "completed"
        ) {
          if (!currentOrder.nets_refund_id) {
            console.error("Refund state is missing refund ID:", {
              orderId,
              refundStatus: currentOrder.refund_status,
            });

            return NextResponse.json(
              {
                error:
                  "The refund state is inconsistent. The order was not changed.",
              },
              { status: 409 },
            );
          }

          expectedRefundId = currentOrder.nets_refund_id;
        } else {
          if (currentOrder.refund_status === "failed") {
            return NextResponse.json(
              {
                error:
                  "The previous refund failed. The order requires manual review.",
              },
              { status: 409 },
            );
          }

          /*
           * A refund ID without a refund status is inconsistent.
           */
          if (currentOrder.nets_refund_id) {
            console.error("Unexpected refund ID without refund status:", {
              orderId,
              refundId: currentOrder.nets_refund_id,
            });

            return NextResponse.json(
              {
                error:
                  "The refund state is inconsistent. The order was not changed.",
              },
              { status: 409 },
            );
          }

          const { data: checkoutSession, error: checkoutSessionError } =
            await supabaseAdmin
              .from("checkout_sessions")
              .select(
                `
              id,
              amount_minor,
              currency,
              nets_payment_id,
              nets_charge_id
            `,
              )
              .eq("id", currentOrder.checkout_session_id)
              .maybeSingle();

          if (checkoutSessionError) {
            console.error(
              "Refund checkout session lookup failed:",
              checkoutSessionError,
            );

            return NextResponse.json(
              {
                error:
                  "Failed to verify the payment. The order was not cancelled.",
              },
              { status: 500 },
            );
          }

          if (!checkoutSession) {
            return NextResponse.json(
              {
                error:
                  "Checkout session not found. The order was not cancelled.",
              },
              { status: 409 },
            );
          }

          if (
            checkoutSession.currency !== "DKK" ||
            !Number.isInteger(checkoutSession.amount_minor) ||
            checkoutSession.amount_minor <= 0
          ) {
            console.error("Invalid checkout session refund amount:", {
              orderId,
              checkoutSessionId: checkoutSession.id,
              amountMinor: checkoutSession.amount_minor,
              currency: checkoutSession.currency,
            });

            return NextResponse.json(
              {
                error:
                  "The payment amount could not be verified. The order was not cancelled.",
              },
              { status: 409 },
            );
          }

          if (
            checkoutSession.nets_payment_id !== currentOrder.nets_payment_id
          ) {
            console.error("Nets payment ID mismatch during refund:", {
              orderId,
              orderPaymentId: currentOrder.nets_payment_id,
              sessionPaymentId: checkoutSession.nets_payment_id,
            });

            return NextResponse.json(
              {
                error:
                  "The payment reference could not be verified. The order was not cancelled.",
              },
              { status: 409 },
            );
          }

          if (checkoutSession.nets_charge_id !== currentOrder.nets_charge_id) {
            console.error("Nets charge ID mismatch during refund:", {
              orderId,
              orderChargeId: currentOrder.nets_charge_id,
              sessionChargeId: checkoutSession.nets_charge_id,
            });

            return NextResponse.json(
              {
                error:
                  "The payment reference could not be verified. The order was not cancelled.",
              },
              { status: 409 },
            );
          }

          /*
           * Claim refund processing before calling Nets.
           *
           * This prevents another status request from changing the
           * order while the financial request is in flight.
           */
          const refundRequestedAt =
            currentOrder.refund_requested_at ?? new Date().toISOString();

          if (!currentOrder.refund_requested_at) {
            const { data: claimedOrder, error: claimError } =
              await supabaseAdmin
                .from("orders")
                .update({
                  refund_requested_at: refundRequestedAt,
                  refund_error: null,
                })
                .eq("id", orderId)
                .eq("status", currentOrder.status)
                .is("refund_requested_at", null)
                .is("refund_status", null)
                .is("nets_refund_id", null)
                .select(
                  `
                id,
                status,
                refund_requested_at
              `,
                )
                .maybeSingle();

            if (claimError) {
              console.error("Failed to claim refund processing:", claimError);

              return NextResponse.json(
                {
                  error:
                    "Refund processing could not be started. The order was not cancelled.",
                },
                { status: 500 },
              );
            }

            if (!claimedOrder) {
              /*
               * Another request may have started or completed the
               * same refund. Reload instead of blindly calling Nets.
               */
              const { data: latestRefundState, error: latestRefundStateError } =
                await supabaseAdmin
                  .from("orders")
                  .select(
                    `
                  id,
                  status,
                  nets_refund_id,
                  refund_status,
                  refund_requested_at
                `,
                  )
                  .eq("id", orderId)
                  .maybeSingle();

              if (latestRefundStateError || !latestRefundState) {
                console.error(
                  "Failed to reload refund claim state:",
                  latestRefundStateError,
                );

                return NextResponse.json(
                  {
                    error:
                      "The refund state could not be verified. The order was not cancelled.",
                  },
                  { status: 500 },
                );
              }

              if (
                (latestRefundState.refund_status === "pending" ||
                  latestRefundState.refund_status === "completed") &&
                latestRefundState.nets_refund_id
              ) {
                expectedRefundId = latestRefundState.nets_refund_id;
              } else if (latestRefundState.refund_status === "failed") {
                return NextResponse.json(
                  {
                    error: "The refund failed. The order was not cancelled.",
                  },
                  { status: 409 },
                );
              } else if (
                latestRefundState.refund_requested_at &&
                latestRefundState.refund_status === null &&
                latestRefundState.nets_refund_id === null
              ) {
                return NextResponse.json(
                  {
                    error:
                      "Refund processing is already in progress. Reload the order and try again.",
                  },
                  { status: 409 },
                );
              } else {
                return NextResponse.json(
                  {
                    error:
                      "The order changed while refund processing was starting. Reload the order and try again.",
                  },
                  { status: 409 },
                );
              }
            }
          }

          /*
           * If another request already established the refund while
           * we were claiming it, do not call Nets again here.
           */
          if (!expectedRefundId) {
            const idempotencyKey = `order-refund-${orderId}`;

            let refund;

            try {
              refund = await refundNetsCharge({
                chargeId: currentOrder.nets_charge_id,
                amountMinor: checkoutSession.amount_minor,
                idempotencyKey,
              });
            } catch (refundError: unknown) {
              console.error("Nets refund request failed:", {
                orderId,
                chargeId: currentOrder.nets_charge_id,
                error: refundError,
              });

              /*
               * Keep refund_requested_at as a claim marker.
               *
               * A transport error can be ambiguous: the request may
               * have reached Nets even if our server did not receive
               * the response. Retrying later with the same
               * Idempotency-Key is safer than clearing the claim.
               */
              const { error: refundErrorUpdateError } = await supabaseAdmin
                .from("orders")
                .update({
                  refund_error: "Nets refund request failed.",
                })
                .eq("id", orderId)
                .is("refund_status", null)
                .is("nets_refund_id", null);

              if (refundErrorUpdateError) {
                console.error(
                  "Failed to persist refund request error:",
                  refundErrorUpdateError,
                );
              }

              return NextResponse.json(
                {
                  error:
                    "Refund failed or could not be confirmed. The order was not cancelled.",
                },
                { status: 502 },
              );
            }

            /*
             * Persist pending only if a refund webhook has not already
             * written a newer state.
             */
            const { data: persistedRefundState, error: refundStateError } =
              await supabaseAdmin
                .from("orders")
                .update({
                  nets_refund_id: refund.refundId,
                  refund_status: "pending",
                  refund_amount_minor: checkoutSession.amount_minor,
                  refund_requested_at: refundRequestedAt,
                  refund_completed_at: null,
                  refund_failed_at: null,
                  refund_error: null,
                })
                .eq("id", orderId)
                .is("refund_status", null)
                .is("nets_refund_id", null)
                .select(
                  `
                id,
                status,
                nets_refund_id,
                refund_status
              `,
                )
                .maybeSingle();

            if (refundStateError) {
              console.error(
                "Failed to persist refund state:",
                refundStateError,
              );

              return NextResponse.json(
                {
                  error:
                    "The refund was accepted but its state could not be saved. The order was not cancelled.",
                },
                { status: 500 },
              );
            }

            if (persistedRefundState) {
              expectedRefundId = refund.refundId;
            } else {
              /*
               * A webhook may have beaten this request to the update.
               * Reload and preserve the webhook's newer state.
               */
              const { data: latestRefundState, error: latestRefundStateError } =
                await supabaseAdmin
                  .from("orders")
                  .select(
                    `
                  id,
                  status,
                  nets_refund_id,
                  refund_status
                `,
                  )
                  .eq("id", orderId)
                  .maybeSingle();

              if (latestRefundStateError || !latestRefundState) {
                console.error(
                  "Failed to reload refund state:",
                  latestRefundStateError,
                );

                return NextResponse.json(
                  {
                    error:
                      "The refund state could not be verified. The order was not cancelled.",
                  },
                  { status: 500 },
                );
              }

              if (latestRefundState.nets_refund_id !== refund.refundId) {
                console.error("Unexpected refund identity:", {
                  orderId,
                  expected: refund.refundId,
                  received: latestRefundState.nets_refund_id,
                });

                return NextResponse.json(
                  {
                    error:
                      "The refund state changed unexpectedly. The order was not cancelled.",
                  },
                  { status: 409 },
                );
              }

              if (latestRefundState.refund_status === "failed") {
                return NextResponse.json(
                  {
                    error: "The refund failed. The order was not cancelled.",
                  },
                  { status: 409 },
                );
              }

              if (
                latestRefundState.refund_status !== "pending" &&
                latestRefundState.refund_status !== "completed"
              ) {
                return NextResponse.json(
                  {
                    error:
                      "The refund state could not be verified. The order was not cancelled.",
                  },
                  { status: 409 },
                );
              }

              expectedRefundId = refund.refundId;
            }
          }
        }
      }
    }

    /*
     * Restaurant status update is intentionally separate from the
     * refund-state update.
     */
    let orderUpdateQuery = supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .eq("status", currentOrder.status);

    /*
     * A paid cancellation succeeds only while the exact refund is
     * pending or completed.
     *
     * If a failed webhook wins the race, this matches zero rows and
     * the restaurant order stays unchanged.
     */
    if (status === "cancelled" && expectedRefundId) {
      orderUpdateQuery = orderUpdateQuery
        .eq("nets_refund_id", expectedRefundId)
        .in("refund_status", ["pending", "completed"]);
    }

    /*
     * A stale normal status request must fail after refund processing
     * has been claimed.
     */
    if (status !== "cancelled") {
      orderUpdateQuery = orderUpdateQuery
        .is("refund_requested_at", null)
        .is("refund_status", null)
        .is("nets_refund_id", null);
    }

    const { data: updatedOrder, error: updateError } = await orderUpdateQuery
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
      /*
       * A concurrent request may already have completed the exact
       * same cancellation. Treat that as idempotent success.
       */
      if (status === "cancelled" && expectedRefundId) {
        const { data: latestOrder, error: latestOrderError } =
          await supabaseAdmin
            .from("orders")
            .select(
              `
            *,
            order_items (*)
          `,
            )
            .eq("id", orderId)
            .maybeSingle();

        if (latestOrderError) {
          console.error(
            "Latest order lookup after cancellation race failed:",
            latestOrderError,
          );

          return NextResponse.json(
            {
              error:
                "The order changed while cancellation was being finalized.",
            },
            { status: 500 },
          );
        }

        if (
          latestOrder &&
          latestOrder.status === "cancelled" &&
          latestOrder.nets_refund_id === expectedRefundId &&
          (latestOrder.refund_status === "pending" ||
            latestOrder.refund_status === "completed")
        ) {
          return NextResponse.json({ order: latestOrder }, { status: 200 });
        }

        if (latestOrder?.refund_status === "failed") {
          return NextResponse.json(
            {
              error: "The refund failed. The order was not cancelled.",
            },
            { status: 409 },
          );
        }
      }

      return NextResponse.json(
        {
          error:
            "The order changed while this request was being processed. Reload the order and try again.",
        },
        { status: 409 },
      );
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
