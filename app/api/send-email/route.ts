import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// Simple HTML to plain text conversion (fallback)
function htmlToText(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, text, attachments, from } = await request.json();
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const htmlContent = html;
    const plainText = text || (htmlContent ? htmlToText(htmlContent) : undefined);
    // Build payload dynamically
    const payload: any = {};
    if (from) payload.from = from;
    if (to) payload.to = to;
    if (subject) payload.subject = subject;
    if (htmlContent) payload.html = htmlContent;
    if (plainText) payload.text = plainText;
    if (attachments) payload.attachments = attachments;
    // Log payload for development only
    if (process.env.NODE_ENV !== "production") {
      console.log("[send-email] Payload:", payload);
    }
    const result = await resend.emails.send(payload);
    if (result.error) {
      console.error("[send-email] Resend error:", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true, payload: process.env.NODE_ENV !== "production" ? payload : undefined });
  } catch (err: any) {
    console.error("[send-email] API error:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
