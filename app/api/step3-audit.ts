import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabaseClient';
import OpenAI from 'openai';
import { Resend } from 'resend';
import { extractTextFromFile } from '@/lib/extractTextFromFile';
import { generateGrievancePDF } from '@/lib/pdf/generator';

type Violation = { article_number: string; article_title: string; violation_reason: string };

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is missing.');
    return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 500 });
  }
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY is missing.');
    return NextResponse.json({ error: 'Missing Resend API key' }, { status: 500 });
  }
  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch {
    console.error('❌ Supabase env vars are missing.');
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { grievanceId, mbaEmail } = await request.json();
    if (!grievanceId || !mbaEmail) {
      return NextResponse.json({ error: 'Missing grievanceId or mbaEmail' }, { status: 400 });
    }

    // Fetch grievance core data
    const { data: grievance, error: grievanceError } = await supabase
      .from('grievances')
      .select('*')
      .eq('id', grievanceId)
      .single();
    if (grievanceError || !grievance) {
      return NextResponse.json({ error: 'Grievance not found' }, { status: 404 });
    }

    // Fetch step 1 and step 2 memos
    const step1Memo = grievance.step1_memo || '';
    const step2Memo = grievance.step2_memo || '';
    if (!step1Memo || !step2Memo) {
      return NextResponse.json({ error: 'Missing Step 1 or Step 2 memo' }, { status: 400 });
    }

    // Fetch uploaded files (denials/supporting)
    const { data: files } = await supabase
      .from('grievance_files')
      .select('file_name, file_type, storage_path')
      .eq('grievance_id', grievanceId);
    let supportingText = '';
    if (files && files.length) {
      for (const file of files) {
        // Download file from Supabase Storage
        const { data: fileBlob } = await supabase.storage
          .from('denials')
          .download(file.storage_path || file.file_name);
        if (fileBlob) {
          const text = await extractTextFromFile(fileBlob, file.file_type);
          supportingText += `\n---\n${file.file_name}:\n${text}`;
        }
      }
    }

    // Compose AI prompt
    const aiPrompt = `You are an APWU grievance audit expert preparing an arbitration-ready case summary for the MBA.\n\nInputs:\n- Case #: ${grievance.case_number}\n- Grievance Summary: ${grievance.summary}\n- Description: ${grievance.description}\n- Step 1 Memo: ${step1Memo}\n- Step 2 Rebuttal: ${step2Memo}\n- Supporting Documents: ${supportingText}\n\nPlease generate:\n1. Arbitration Summary (clear and legal-style)\n2. Chronology of Events\n3. Final Union Position\n4. Key Contract Articles\n5. Strategy Note to MBA\n\nUse bold headers. Be professional, persuasive, and brief.`;

    // Run OpenAI
    let auditMemo = '';
    let violations: Violation[] = [];
    try {
      const aiRes = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: aiPrompt },
        ],
        max_tokens: 1200,
        temperature: 0.2,
      });
      auditMemo = aiRes.choices[0]?.message?.content || '';
      // Optionally extract violations (simple regex or section parse)
      violations = [];
    } catch {
      return NextResponse.json({ error: 'AI failed to generate audit memo' }, { status: 500 });
    }

    // Fetch steward and member emails
    let stewardEmail = '';
    let memberEmail = '';
    if (grievance.created_by_user_id) {
      const { data: member } = await supabase.from('users').select('email').eq('id', grievance.created_by_user_id).single();
      memberEmail = member?.email || '';
    }
    if (grievance.forwarded_to_user_id) {
      const { data: steward } = await supabase.from('users').select('email').eq('id', grievance.forwarded_to_user_id).single();
      stewardEmail = steward?.email || '';
    }

    // Generate PDFs for attachments
    const pdfInputs: {
      label: string;
      content: string;
      step: "step1" | "step2" | "step3";
      step_label: string;
    }[] = [
      {
        label: 'Step 1 Memo',
        content: grievance.step1_memo,
        step: 'step1',
        step_label: 'STEP 1 MEMO',
      },
      {
        label: 'Step 2 Rebuttal',
        content: grievance.step2_memo,
        step: 'step2',
        step_label: 'STEP 2 REBUTTAL',
      },
      {
        label: 'Final Audit Memo',
        content: auditMemo,
        step: 'step3',
        step_label: 'STEP 3 ARBITRATION AUDIT',
      },
    ];
    const pdfAttachments = [];
    for (const pdfInput of pdfInputs) {
      const pdfBuffer = await generateGrievancePDF({
          title: grievance.title || '',
          summary: grievance.summary,
          description: grievance.description,
          violations: violations,
          case_number: grievance.case_number,
          content: pdfInput.content,
          step: pdfInput.step,
          step_label: pdfInput.step_label,
          date: ''
      });
      const base64 = Buffer.isBuffer(pdfBuffer)
        ? pdfBuffer.toString('base64')
        : Buffer.from(pdfBuffer as ArrayBuffer).toString('base64');
      pdfAttachments.push({
        filename: `${grievance.case_number || grievanceId}_${pdfInput.label.replace(/ /g, '_')}.pdf`,
        content: base64,
      });
    }

    // Send email via Resend
    let forwardedToMBA = false;
    try {
      await resend.emails.send({
        from: 'GrievanceToolkit <noreply@grievancetoolkit.com>',
        to: mbaEmail,
        cc: [stewardEmail, memberEmail].filter(Boolean),
        subject: `[GrievanceToolkit] Step 3 Arbitration Audit – Case #${grievance.case_number}`,
        html: `<p>The final arbitration memo for Case #${grievance.case_number} is attached.</p><p>Please review and advise before arbitration submission.</p>`,
        attachments: pdfAttachments.map(a => ({ filename: a.filename, content: a.content, contentType: 'application/pdf' })),
      });
      forwardedToMBA = true;
    } catch (err) {
      console.error('Resend email failed:', err);
      forwardedToMBA = false;
    }

    // Save to Supabase
    await supabase.from('grievances').update({
      step3_memo: auditMemo,
      step3_forwarded_at: new Date().toISOString(),
      mba_email: mbaEmail,
    }).eq('id', grievanceId);

    return NextResponse.json({ auditMemo, violations, forwardedToMBA });
  } catch {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
