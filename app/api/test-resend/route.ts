import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    const result = await resend.emails.send({
      from: "GrievanceToolkit <noreply@grievancetoolkit.com>",
      to: "f.swagga43@gmail.com", // 🔁 Replace this with your actual test inbox
      subject: "✅ Resend Email Test Successful!",
      html: `
        <h1>GrievanceToolkit Email Test</h1>
        <p>This confirms Resend is fully integrated and your domain is verified.</p>
        <p>You’re now ready to deliver Step 2 memos, alerts, and user notifications.</p>
      `,
    });

    console.log("📤 Email sent:", result);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("❌ Email failed to send:", error);
    return NextResponse.json({ error: "Email failed to send." }, { status: 500 });
  }
}
