import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const to = process.env.EMAIL_TEST_TO;

  if (!apiKey || !from || !to) {
    return NextResponse.json(
      {
        error: "RESEND_API_KEY, EMAIL_FROM eller EMAIL_TEST_TO mangler.",
      },
      { status: 500 },
    );
  }

  try {
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: "Test fra Gastronomia 3300",
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h1>Resend virker 🎉</h1>
          <p>Denne testmail blev sendt fra Gastronomia 3300.</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend test error:", error);

      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      emailId: data?.id,
    });
  } catch (error: unknown) {
    console.error("Unexpected email test error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "E-mailen kunne ikke sendes.",
      },
      { status: 500 },
    );
  }
}
