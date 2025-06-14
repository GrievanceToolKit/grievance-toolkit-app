import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import type { CreateEmailOptions } from "resend";

function htmlToText(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

export async function POST(request: NextRequest) {
  try {
    const { to, cc, subject, html, text, attachmentUrl } = await request.json();
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Missing RESEND_API_KEY" }, { status: 500 });
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const htmlContent = html;
    const plainText = text || (htmlContent ? htmlToText(htmlContent) : undefined);
    // Strictly type payload for Resend
    const payload: Partial<CreateEmailOptions> = {
      from: 'no-reply@grievancetoolkit.com',
      to,
      cc,
      subject,
      html: htmlContent,
      text: plainText,
      attachments: attachmentUrl
        ? [{ filename: attachmentUrl.split('/').pop() || 'agreement.pdf', path: attachmentUrl }]
        : undefined,
    };
    // Remove undefined fields (optional, for cleanliness)
    Object.keys(payload).forEach(key => {
      if (payload[key as keyof typeof payload] === undefined) {
        delete payload[key as keyof typeof payload];
      }
    });
    if (process.env.NODE_ENV !== "production") {
      console.log("[send-resolution-email] Payload:", payload);
    }
    // Bypass type error with 'as any' since Resend API works with html/text
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resend.emails.send(payload as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (result && (result as any).error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.error("[send-resolution-email] Resend error:", (result as any).error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return NextResponse.json({ error: (result as any).error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    // TODO: Replace 'unknown' with a more specific error type if possible
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[send-resolution-email] API error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
