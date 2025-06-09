import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// Use require for Clerk to avoid type errors
const Clerk = require('@clerk/clerk-sdk-node');
const clerk = new Clerk({ apiKey: process.env.CLERK_SECRET_KEY! });

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(req: Request) {
  const { memberName, stewardEmail, pdfBuffer } = await req.json();

  // Check if steward is registered
  let stewardExists = false;
  try {
    const users = await clerk.users.getUserList({ emailAddress: [stewardEmail] });
    stewardExists = users.length > 0;
  } catch (e) {
    stewardExists = false;
  }

  // If not registered, invite
  let joinLink = '';
  if (!stewardExists) {
    const invite = await clerk.invitations.createInvitation({
      emailAddress: stewardEmail,
      role: 'Steward',
    });
    joinLink = invite?.url || '';
  }

  // Send email
  const msg = {
    to: stewardEmail,
    from: process.env.SENDGRID_FROM_EMAIL!,
    subject: 'New Witness Statement Submitted',
    text: `Member ${memberName} has submitted a witness statement.\n${joinLink ? `Join here: ${joinLink}` : ''}`,
    html: `<p>Member <strong>${memberName}</strong> has submitted a witness statement.</p>${joinLink ? `<p>Join here: <a href='${joinLink}'>${joinLink}</a></p>` : ''}`,
    attachments: [
      {
        content: Buffer.from(pdfBuffer, 'base64').toString('base64'),
        filename: 'witness-statement.pdf',
        type: 'application/pdf',
        disposition: 'attachment',
      },
    ],
  };
  await sgMail.send(msg);
  return NextResponse.json({ message: 'Email sent', invited: !stewardExists });
}
