import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendUnionLinkEmail({
  to,
  fromName,
  summary,
}: {
  to: string;
  fromName: string;
  summary: string;
}) {
  return resend.emails.send({
    from: 'GrievanceToolkit <noreply@grievancetoolkit.com>',
    to,
    subject: '📨 New Grievance Submitted by a Union Member',
    html: `
      <p><strong>${fromName}</strong> has submitted a new issue via the GrievanceToolkit platform.</p>
      <p><em>Summary:</em><br/>${summary}</p>
      <p><a href="https://grievancetoolkit.com/dashboard/inbox" style="padding: 10px 15px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 5px;">View in Inbox</a></p>
    `,
  });
}
