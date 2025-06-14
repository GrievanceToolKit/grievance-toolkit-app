import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is missing.');
    return NextResponse.json({ error: 'Missing Resend API key' }, { status: 500 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { grievanceId, stewardEmail, step2Memo } = body;
  if (!grievanceId || !stewardEmail || !step2Memo) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const emailContent = `
    Hi Steward,

    A Step 2 escalation has been filed for Grievance ${grievanceId}.
    
    Memo Preview:
    ----------------------------
    ${step2Memo.slice(0, 300)}...

    Log into the dashboard to review the full memo and prepare for arbitration.

    – GrievanceToolkit
  `;

  try {
    const response = await resend.emails.send({
      from: 'notifications@grievancetoolkit.com',
      to: stewardEmail,
      subject: `Step 2 Escalation – Grievance ${grievanceId}`,
      text: emailContent
    });
    return NextResponse.json({ success: true, data: response });
  } catch {
    return NextResponse.json({ error: 'Failed to send escalation email.' }, { status: 500 });
  }
}
