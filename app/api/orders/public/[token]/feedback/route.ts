import { NextRequest, NextResponse } from "next/server";

import { ensureRestaurantFeedbackNotification } from "@/lib/feedback/restaurantFeedbackNotification";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FEEDBACK_SUBMISSION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PRIVATE_MESSAGE_LENGTH = 2000;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CUSTOMER_FEEDBACK_FIELDS = `
  id,
  rating,
  private_message,
  public_name_consent,
  private_message_removed_at,
  admin_reply,
  admin_replied_at,
  created_at,
  updated_at
`;

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

type CreateFeedbackBody = {
  rating?: unknown;
  privateMessage?: unknown;
  publicNameConsent?: unknown;
};

type WithdrawConsentBody = {
  publicNameConsent?: unknown;
};

type CustomerFeedbackRecord = {
  id: number;
  rating: number;
  private_message: string | null;
  public_name_consent: boolean;
  private_message_removed_at: string | null;
  admin_reply: string | null;
  admin_replied_at: string | null;
  created_at: string;
  updated_at: string;
};

function jsonNoStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

async function getNormalizedToken(
  context: RouteContext,
): Promise<string | null> {
  const { token } = await context.params;
  const normalizedToken = token.trim().toLowerCase();

  return UUID_PATTERN.test(normalizedToken) ? normalizedToken : null;
}

function getPublicFirstName(customerName: string): string | null {
  const normalizedName = customerName.trim().replace(/\s+/g, " ");
  const firstName = normalizedName.split(" ")[0]?.trim();

  if (!firstName) {
    return null;
  }

  return Array.from(firstName).slice(0, 80).join("");
}

function serializeCustomerFeedback(feedback: CustomerFeedbackRecord) {
  const privateMessageRemoved = Boolean(feedback.private_message_removed_at);

  return {
    rating: feedback.rating,
    privateMessage: privateMessageRemoved ? null : feedback.private_message,
    privateMessageRemoved,
    publicNameConsent: feedback.public_name_consent,
    adminReply: feedback.admin_reply,
    adminRepliedAt: feedback.admin_replied_at,
    submittedAt: feedback.created_at,
    updatedAt: feedback.updated_at,
  };
}

function getSubmissionWindow({
  status,
  completedAt,
  hasFeedback,
}: {
  status: string;
  completedAt: string | null;
  hasFeedback: boolean;
}) {
  if (status !== "completed" || !completedAt) {
    return {
      canSubmit: false,
      closesAt: null,
      reason: "not_completed" as const,
    };
  }

  const completedTime = new Date(completedAt).getTime();

  if (!Number.isFinite(completedTime)) {
    return {
      canSubmit: false,
      closesAt: null,
      reason: "not_completed" as const,
    };
  }

  const closesAt = new Date(
    completedTime + FEEDBACK_SUBMISSION_WINDOW_MS,
  ).toISOString();

  if (hasFeedback) {
    return {
      canSubmit: false,
      closesAt,
      reason: "submitted" as const,
    };
  }

  if (Date.now() >= new Date(closesAt).getTime()) {
    return {
      canSubmit: false,
      closesAt,
      reason: "expired" as const,
    };
  }

  return {
    canSubmit: true,
    closesAt,
    reason: null,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const token = await getNormalizedToken(context);

    if (!token) {
      return jsonNoStore({ error: "Ugyldigt ordrelink." }, 400);
    }

    const supabaseAdmin = createAdminClient();

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, completed_at")
      .eq("public_token", token)
      .maybeSingle();

    if (orderError) {
      console.error("Customer feedback order lookup failed:", orderError);

      return jsonNoStore({ error: "Feedback kunne ikke hentes." }, 500);
    }

    if (!order) {
      return jsonNoStore({ error: "Ordren blev ikke fundet." }, 404);
    }

    const { data: feedback, error: feedbackError } = await supabaseAdmin
      .from("order_feedback")
      .select(CUSTOMER_FEEDBACK_FIELDS)
      .eq("order_id", order.id)
      .maybeSingle();

    if (feedbackError) {
      console.error("Customer feedback lookup failed:", feedbackError);

      return jsonNoStore({ error: "Feedback kunne ikke hentes." }, 500);
    }

    const typedFeedback = feedback as CustomerFeedbackRecord | null;

    return jsonNoStore({
      eligibility: getSubmissionWindow({
        status: order.status,
        completedAt: order.completed_at,
        hasFeedback: Boolean(typedFeedback),
      }),
      feedback: typedFeedback ? serializeCustomerFeedback(typedFeedback) : null,
    });
  } catch (error: unknown) {
    console.error("Unexpected customer feedback GET error:", error);

    return jsonNoStore({ error: "Der opstod en uventet fejl." }, 500);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const token = await getNormalizedToken(context);

    if (!token) {
      return jsonNoStore({ error: "Ugyldigt ordrelink." }, 400);
    }

    const body = (await request
      .json()
      .catch(() => null)) as CreateFeedbackBody | null;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonNoStore({ error: "Ugyldig feedback." }, 400);
    }

    if (
      typeof body.rating !== "number" ||
      !Number.isInteger(body.rating) ||
      body.rating < 1 ||
      body.rating > 5
    ) {
      return jsonNoStore(
        { error: "Bedømmelsen skal være mellem 1 og 5." },
        400,
      );
    }

    if (
      body.privateMessage !== undefined &&
      body.privateMessage !== null &&
      typeof body.privateMessage !== "string"
    ) {
      return jsonNoStore({ error: "Den private besked er ugyldig." }, 400);
    }

    if (
      body.publicNameConsent !== undefined &&
      typeof body.publicNameConsent !== "boolean"
    ) {
      return jsonNoStore({ error: "Samtykkeværdien er ugyldig." }, 400);
    }

    const privateMessage =
      typeof body.privateMessage === "string"
        ? body.privateMessage.trim() || null
        : null;

    if (
      privateMessage &&
      Array.from(privateMessage).length > MAX_PRIVATE_MESSAGE_LENGTH
    ) {
      return jsonNoStore(
        {
          error: `Den private besked må højst være ${MAX_PRIVATE_MESSAGE_LENGTH} tegn.`,
        },
        400,
      );
    }

    const publicNameConsent = body.publicNameConsent === true;
    const supabaseAdmin = createAdminClient();

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, completed_at, customer_name")
      .eq("public_token", token)
      .maybeSingle();

    if (orderError) {
      console.error("Feedback order lookup failed:", orderError);

      return jsonNoStore({ error: "Feedback kunne ikke gemmes." }, 500);
    }

    if (!order) {
      return jsonNoStore({ error: "Ordren blev ikke fundet." }, 404);
    }

    const eligibility = getSubmissionWindow({
      status: order.status,
      completedAt: order.completed_at,
      hasFeedback: false,
    });

    if (eligibility.reason === "not_completed") {
      return jsonNoStore({ error: "Kun afsluttede ordrer kan bedømmes." }, 409);
    }

    if (eligibility.reason === "expired") {
      return jsonNoStore(
        { error: "Fristen for at bedømme denne ordre er udløbet." },
        410,
      );
    }

    const publicDisplayName = publicNameConsent
      ? getPublicFirstName(order.customer_name)
      : null;

    if (publicNameConsent && !publicDisplayName) {
      return jsonNoStore(
        { error: "Dit fornavn kunne ikke klargøres til offentlig visning." },
        400,
      );
    }

    const submittedAt = new Date().toISOString();

    const { data: feedback, error: insertError } = await supabaseAdmin
      .from("order_feedback")
      .insert({
        order_id: order.id,
        rating: body.rating,
        private_message: privateMessage,
        public_name_consent: publicNameConsent,
        public_display_name: publicDisplayName,
        public_name_consent_at: publicNameConsent ? submittedAt : null,
        created_at: submittedAt,
        updated_at: submittedAt,
      })
      .select(CUSTOMER_FEEDBACK_FIELDS)
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: existingFeedback, error: existingFeedbackError } =
          await supabaseAdmin
            .from("order_feedback")
            .select("id")
            .eq("order_id", order.id)
            .maybeSingle();

        if (existingFeedbackError) {
          console.error(
            "Existing customer feedback lookup failed:",
            existingFeedbackError,
          );
        } else if (existingFeedback) {
          try {
            await ensureRestaurantFeedbackNotification({
              feedbackId: existingFeedback.id,
              orderId: order.id,
              origin: process.env.SITE_URL ?? request.nextUrl.origin,
            });
          } catch (notificationError: unknown) {
            console.error(
              "Unexpected restaurant feedback notification retry error:",
              notificationError,
            );
          }
        }

        return jsonNoStore(
          { error: "Denne ordre er allerede blevet bedømt." },
          409,
        );
      }

      console.error("Customer feedback insert failed:", insertError);

      return jsonNoStore({ error: "Feedback kunne ikke gemmes." }, 500);
    }

    try {
      await ensureRestaurantFeedbackNotification({
        feedbackId: feedback.id,
        orderId: order.id,
        origin: process.env.SITE_URL ?? request.nextUrl.origin,
      });
    } catch (notificationError: unknown) {
      console.error(
        "Unexpected restaurant feedback notification error:",
        notificationError,
      );
    }

    return jsonNoStore(
      {
        eligibility: getSubmissionWindow({
          status: order.status,
          completedAt: order.completed_at,
          hasFeedback: true,
        }),
        feedback: serializeCustomerFeedback(feedback as CustomerFeedbackRecord),
      },
      201,
    );
  } catch (error: unknown) {
    console.error("Unexpected customer feedback POST error:", error);

    return jsonNoStore({ error: "Der opstod en uventet fejl." }, 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const token = await getNormalizedToken(context);

    if (!token) {
      return jsonNoStore({ error: "Ugyldigt ordrelink." }, 400);
    }

    const body = (await request
      .json()
      .catch(() => null)) as WithdrawConsentBody | null;

    if (!body || body.publicNameConsent !== false) {
      return jsonNoStore(
        {
          error: "Kun tilbagetrækning af offentligt navnesamtykke er tilladt.",
        },
        400,
      );
    }

    const supabaseAdmin = createAdminClient();

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("public_token", token)
      .maybeSingle();

    if (orderError) {
      console.error("Consent withdrawal order lookup failed:", orderError);

      return jsonNoStore({ error: "Samtykket kunne ikke opdateres." }, 500);
    }

    if (!order) {
      return jsonNoStore({ error: "Ordren blev ikke fundet." }, 404);
    }

    const { data: existingFeedback, error: feedbackError } = await supabaseAdmin
      .from("order_feedback")
      .select(CUSTOMER_FEEDBACK_FIELDS)
      .eq("order_id", order.id)
      .maybeSingle();

    if (feedbackError) {
      console.error(
        "Consent withdrawal feedback lookup failed:",
        feedbackError,
      );

      return jsonNoStore({ error: "Samtykket kunne ikke opdateres." }, 500);
    }

    if (!existingFeedback) {
      return jsonNoStore({ error: "Feedback blev ikke fundet." }, 404);
    }

    if (!existingFeedback.public_name_consent) {
      return jsonNoStore({
        feedback: serializeCustomerFeedback(
          existingFeedback as CustomerFeedbackRecord,
        ),
      });
    }

    const { data: updatedFeedback, error: updateError } = await supabaseAdmin
      .from("order_feedback")
      .update({
        public_name_consent: false,
        public_display_name: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingFeedback.id)
      .eq("order_id", order.id)
      .select(CUSTOMER_FEEDBACK_FIELDS)
      .single();

    if (updateError) {
      console.error("Public-name consent withdrawal failed:", updateError);

      return jsonNoStore({ error: "Samtykket kunne ikke opdateres." }, 500);
    }

    return jsonNoStore({
      feedback: serializeCustomerFeedback(
        updatedFeedback as CustomerFeedbackRecord,
      ),
    });
  } catch (error: unknown) {
    console.error("Unexpected customer feedback PATCH error:", error);

    return jsonNoStore({ error: "Der opstod en uventet fejl." }, 500);
  }
}
