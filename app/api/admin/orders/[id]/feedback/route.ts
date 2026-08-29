import { NextRequest, NextResponse } from "next/server";

import { ensureFeedbackReplyNotification } from "@/lib/feedback/feedbackReplyNotification";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MAX_ADMIN_REPLY_LENGTH = 2000;

const ADMIN_FEEDBACK_FIELDS = `
  id,
  order_id,
  rating,
  private_message,
  public_name_consent,
  private_message_removed_at,
  admin_seen_at,
  admin_reply,
  admin_replied_at,
  created_at,
  updated_at
`;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type AdminFeedbackActionBody = {
  action?: unknown;
  reply?: unknown;
};

type AdminFeedbackRecord = {
  id: number;
  order_id: number;
  rating: number;
  private_message: string | null;
  public_name_consent: boolean;
  private_message_removed_at: string | null;
  admin_seen_at: string | null;
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

function serializeAdminFeedback(feedback: AdminFeedbackRecord) {
  const privateMessageRemoved = Boolean(feedback.private_message_removed_at);

  return {
    rating: feedback.rating,
    privateMessage: privateMessageRemoved ? null : feedback.private_message,
    privateMessageRemoved,
    publicNameConsent: feedback.public_name_consent,
    adminReply: feedback.admin_reply,
    adminRepliedAt: feedback.admin_replied_at,
    submittedAt: feedback.created_at,
    seenAt: feedback.admin_seen_at,
    canReply: !feedback.admin_reply,
    canRemoveMessage:
      !privateMessageRemoved && Boolean(feedback.private_message),
  };
}

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: jsonNoStore({ error: "Unauthorized" }, 401),
      user: null,
    };
  }

  if (user.app_metadata?.role !== "admin") {
    return {
      error: jsonNoStore({ error: "Forbidden" }, 403),
      user: null,
    };
  }

  return {
    error: null,
    user,
  };
}

async function getOrderId(context: RouteContext): Promise<number | null> {
  const { id } = await context.params;
  const orderId = Number(id);

  return Number.isInteger(orderId) && orderId > 0 ? orderId : null;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const auth = await requireAdmin();

    if (auth.error) {
      return auth.error;
    }

    const orderId = await getOrderId(context);

    if (!orderId) {
      return jsonNoStore({ error: "Ugyldigt ordrenummer." }, 400);
    }

    const supabaseAdmin = createAdminClient();

    const { data: feedback, error: feedbackError } = await supabaseAdmin
      .from("order_feedback")
      .select(ADMIN_FEEDBACK_FIELDS)
      .eq("order_id", orderId)
      .maybeSingle();

    if (feedbackError) {
      console.error("Admin feedback lookup failed:", feedbackError);

      return jsonNoStore({ error: "Feedback kunne ikke hentes." }, 500);
    }

    if (!feedback) {
      return jsonNoStore({ feedback: null });
    }

    let feedbackRecord = feedback as AdminFeedbackRecord;

    if (!feedbackRecord.admin_seen_at) {
      const seenAt = new Date().toISOString();

      const { data: seenFeedback, error: seenError } = await supabaseAdmin
        .from("order_feedback")
        .update({
          admin_seen_at: seenAt,
          updated_at: seenAt,
        })
        .eq("id", feedbackRecord.id)
        .is("admin_seen_at", null)
        .select(ADMIN_FEEDBACK_FIELDS)
        .maybeSingle();

      if (seenError) {
        console.error("Admin feedback seen-state update failed:", seenError);
      } else if (seenFeedback) {
        feedbackRecord = seenFeedback as AdminFeedbackRecord;
      }
    }

    return jsonNoStore({
      feedback: serializeAdminFeedback(feedbackRecord),
    });
  } catch (error: unknown) {
    console.error("Unexpected admin feedback GET error:", error);

    return jsonNoStore({ error: "Der opstod en uventet fejl." }, 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdmin();

    if (auth.error || !auth.user) {
      return auth.error;
    }

    const orderId = await getOrderId(context);

    if (!orderId) {
      return jsonNoStore({ error: "Ugyldigt ordrenummer." }, 400);
    }

    const body = (await request
      .json()
      .catch(() => null)) as AdminFeedbackActionBody | null;

    if (!body || typeof body.action !== "string") {
      return jsonNoStore({ error: "Ugyldig handling." }, 400);
    }

    const supabaseAdmin = createAdminClient();

    const { data: feedback, error: feedbackError } = await supabaseAdmin
      .from("order_feedback")
      .select(ADMIN_FEEDBACK_FIELDS)
      .eq("order_id", orderId)
      .maybeSingle();

    if (feedbackError) {
      console.error("Admin feedback action lookup failed:", feedbackError);

      return jsonNoStore({ error: "Feedback kunne ikke hentes." }, 500);
    }

    if (!feedback) {
      return jsonNoStore({ error: "Feedback blev ikke fundet." }, 404);
    }

    const feedbackRecord = feedback as AdminFeedbackRecord;

    if (body.action === "reply") {
      if (typeof body.reply !== "string") {
        return jsonNoStore({ error: "Svaret er ugyldigt." }, 400);
      }

      const reply = body.reply.trim();

      if (!reply) {
        return jsonNoStore({ error: "Svaret må ikke være tomt." }, 400);
      }

      if (Array.from(reply).length > MAX_ADMIN_REPLY_LENGTH) {
        return jsonNoStore(
          {
            error: `Svaret må højst være ${MAX_ADMIN_REPLY_LENGTH} tegn.`,
          },
          400,
        );
      }

      if (feedbackRecord.admin_reply) {
        try {
          await ensureFeedbackReplyNotification({
            feedbackId: feedbackRecord.id,
            orderId,
            origin: process.env.SITE_URL ?? request.nextUrl.origin,
          });
        } catch (notificationError: unknown) {
          console.error(
            "Unexpected feedback reply notification retry error:",
            notificationError,
          );
        }

        return jsonNoStore(
          { error: "Der er allerede sendt et svar på denne feedback." },
          409,
        );
      }

      const repliedAt = new Date().toISOString();

      const { data: updatedFeedback, error: updateError } = await supabaseAdmin
        .from("order_feedback")
        .update({
          admin_reply: reply,
          admin_replied_at: repliedAt,
          admin_replied_by: auth.user.id,
          admin_seen_at: feedbackRecord.admin_seen_at ?? repliedAt,
          updated_at: repliedAt,
        })
        .eq("id", feedbackRecord.id)
        .eq("order_id", orderId)
        .is("admin_reply", null)
        .select(ADMIN_FEEDBACK_FIELDS)
        .maybeSingle();

      if (updateError) {
        console.error("Admin feedback reply update failed:", updateError);

        return jsonNoStore({ error: "Svaret kunne ikke gemmes." }, 500);
      }

      if (!updatedFeedback) {
        return jsonNoStore(
          { error: "Feedbacken blev ændret. Genindlæs siden og prøv igen." },
          409,
        );
      }

      try {
        await ensureFeedbackReplyNotification({
          feedbackId: feedbackRecord.id,
          orderId,
          origin: process.env.SITE_URL ?? request.nextUrl.origin,
        });
      } catch (notificationError: unknown) {
        console.error(
          "Unexpected feedback reply notification error:",
          notificationError,
        );
      }

      return jsonNoStore({
        feedback: serializeAdminFeedback(
          updatedFeedback as AdminFeedbackRecord,
        ),
      });
    }

    if (body.action === "remove_private_message") {
      if (feedbackRecord.private_message_removed_at) {
        return jsonNoStore({
          feedback: serializeAdminFeedback(feedbackRecord),
        });
      }

      if (!feedbackRecord.private_message) {
        return jsonNoStore(
          { error: "Denne feedback har ingen privat besked." },
          409,
        );
      }

      const removedAt = new Date().toISOString();

      const { data: updatedFeedback, error: updateError } = await supabaseAdmin
        .from("order_feedback")
        .update({
          private_message: null,
          private_message_removed_at: removedAt,
          private_message_removed_by: auth.user.id,
          admin_seen_at: feedbackRecord.admin_seen_at ?? removedAt,
          updated_at: removedAt,
        })
        .eq("id", feedbackRecord.id)
        .eq("order_id", orderId)
        .is("private_message_removed_at", null)
        .not("private_message", "is", null)
        .select(ADMIN_FEEDBACK_FIELDS)
        .maybeSingle();

      if (updateError) {
        console.error("Admin private-message removal failed:", updateError);

        return jsonNoStore(
          { error: "Den private besked kunne ikke fjernes." },
          500,
        );
      }

      if (!updatedFeedback) {
        return jsonNoStore(
          { error: "Feedbacken blev ændret. Genindlæs siden og prøv igen." },
          409,
        );
      }

      return jsonNoStore({
        feedback: serializeAdminFeedback(
          updatedFeedback as AdminFeedbackRecord,
        ),
      });
    }

    return jsonNoStore({ error: "Handlingen understøttes ikke." }, 400);
  } catch (error: unknown) {
    console.error("Unexpected admin feedback PATCH error:", error);

    return jsonNoStore({ error: "Der opstod en uventet fejl." }, 500);
  }
}
