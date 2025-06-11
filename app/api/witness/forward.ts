import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import * as Clerk from '@clerk/clerk-sdk-node';

// Initialize Clerk and SendGrid
const clerk = Clerk;
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(req: Request) {
  const { memberName, stewardEmail, pdfBuffer } = await req.json();

  // Check if steward is registered
  let stewardExists = false;
  try {
    const users = await clerk.users.getUserList({ emailAddress: [stewardEmail] });
    stewardExists = users.length > 0;
  } catch {
    stewardExists = false;
  }

  // If not registered, invite
  let joinLink = '';
  if (!stewardExists) {
    await clerk.invitations.createInvitation({
      emailAddress: stewardEmail,
      publicMetadata: {
        role: 'Steward',
      },
    });
    // TODO: Inspect invite object to find the correct join link property
    // console.log('Clerk invite object:', invite, Object.keys(invite));
    joinLink = '';
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
