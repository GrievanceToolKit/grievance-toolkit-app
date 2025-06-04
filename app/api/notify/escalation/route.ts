import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { generateGrievancePDF } from '@/lib/pdf/generator';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const { grievanceId, step2Memo, stewardEmail, pdfInput } = await req.json();

  const emailText = `
Hi Steward,

A grievance has been escalated to Step 2.

🆔 Grievance ID: ${grievanceId}

📄 Memo Preview:
----------------------------
${step2Memo.slice(0, 400)}...

Please log into GrievanceToolkit to review the full escalation memo.

– GrievanceToolkit System
  `;

  // Generate PDF if pdfInput is provided
  let attachments = [];
  if (pdfInput) {
    const { base64 } = await generateGrievancePDF(pdfInput);
    attachments.push({
      filename: `step2_grievance_${grievanceId}.pdf`,
      content: base64,
      contentType: 'application/pdf',
      encoding: 'base64',
    });
  }

  const response = await resend.emails.send({
    from: 'notices@grievancetoolkit.com',
    to: stewardEmail,
    subject: `📤 Step 2 Escalation – Grievance ${grievanceId}`,
    text: emailText,
    attachments: attachments.length > 0 ? attachments : undefined,
  });

  return NextResponse.json({ success: true, response });
}
