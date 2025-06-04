import { auth } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";
import { extractTextFromFile } from "@/lib/extractTextFromFile";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { Resend } from 'resend';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

const systemPrompt = `
You are a USPS Step 2 grievance escalation expert trained under the APWU National Agreement. You are assisting the union in reviewing management’s Step 1 denial and preparing a formal escalation.

Your task:
- Evaluate the original grievance and Step 1 memo
- Review all uploaded denial letters and supporting documents
- Defend against improper denial reasoning
- Recommend whether the grievance should be escalated or settled
- Cite applicable articles, and suggest make-whole remedies

Use professional, persuasive, and factual language.
Format clearly with bold section headers and contract references.
`;

export async function POST(request: Request) {
  const { session } = auth();
  const role = session?.user?.publicMetadata?.role;
  if (!role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (!["admin", "steward"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { grievanceId } = body;

  if (!grievanceId) {
    return NextResponse.json({ error: "Missing grievanceId" }, { status: 400 });
  }

  // 🗃️ Fetch grievance record
  const { data: grievance, error } = await supabase
    .from("grievances")
    .select("summary, description, step1_memo")
    .eq("id", grievanceId)
    .single();

  if (error || !grievance?.step1_memo) {
    return NextResponse.json({ error: "Grievance not found or missing Step 1 memo" }, { status: 404 });
  }

  const { summary, description, step1_memo } = grievance;

  // 📂 Fetch all uploaded denial files
  const { data: files } = await supabase
    .from("grievance_files")
    .select("file_name, file_type")
    .eq("grievance_id", grievanceId);

  let supportingDocuments = "";

  if (files?.length) {
    for (const file of files) {
      const path = `denials/${grievanceId}/${file.file_name}`;
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from("denials")
        .download(path);

      if (downloadError || !fileBlob) {
        console.warn(`⚠️ Could not download file: ${file.file_name}`);
        continue;
      }

      const text = await extractTextFromFile(fileBlob, file.file_type);
      supportingDocuments += `\n\n[${file.file_name}]\n${text}`;
    }
  }

  const escalationPrompt = `
Original Grievance Summary:
${summary}

Detailed Description:
${description}

Step 1 Memo:
${step1_memo}

Supporting Documents:
${supportingDocuments || "(No denial documents uploaded)"}

Based on this information, generate a Step 2 escalation memo with these sections:
1. Summary of Denial
2. Union Rebuttal
3. Contract Violations and Reasoning
4. Recommended Resolution or Escalation
5. Reminder of Step 2 Timeline and Union's Position
`;

  // 🔥 AI call — Step 2 Memo
  const memoResponse = await openai.chat.completions.create({
    model: "gpt-4",
    temperature: 0.3,
    max_tokens: 2000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: escalationPrompt }
    ]
  });

  const step2Memo = memoResponse.choices[0]?.message?.content || "⚠️ No memo returned.";

  // 🔁 Second GPT call — Extract JSON violation list
  const jsonPrompt = `
${escalationPrompt}

Return JSON only:
{
  "violations": [
    {
      "article_number": "Article X",
      "article_title": "Title",
      "violation_reason": "Explanation"
    }
  ]
}
`;

  let violations = [];

  try {
    const jsonResponse = await openai.chat.completions.create({
      model: "gpt-4",
      temperature: 0,
      max_tokens: 1000,
      messages: [
        { role: "system", content: "You are a USPS grievance analyst. Reply only in valid JSON." },
        { role: "user", content: jsonPrompt }
      ]
    });

    const parsed = JSON.parse(jsonResponse.choices[0].message.content || "{}");
    violations = parsed.violations || [];
  } catch (err) {
    console.error("❌ Step 2 JSON violation parse failed:", err);
  }

  // Save step2Memo, violations, and step2_escalated_at to grievances table
  await supabase.from('grievances').update({
    step2_memo: step2Memo,
    violations,
    step2_escalated_at: new Date().toISOString(),
  }).eq('id', grievanceId);

  // Fetch steward email by joining grievances.created_by_user_id -> users(id) -> users.email
  const { data: userRow } = await supabase
    .from('grievances')
    .select('created_by_user_id')
    .eq('id', grievanceId)
    .single();
  let stewardEmail = null;
  if (userRow?.created_by_user_id) {
    const { data: steward } = await supabase
      .from('users')
      .select('email')
      .eq('id', userRow.created_by_user_id)
      .single();
    stewardEmail = steward?.email;
  }

  // Send Resend notification if email found
  if (stewardEmail) {
    await resend.emails.send({
      from: 'GrievanceToolkit <noreply@grievancetoolkit.com>',
      to: stewardEmail,
      subject: 'Step 2 Grievance Memo Ready',
      html: `<p>The Step 2 memo for grievance <strong>${grievanceId}</strong> has been generated. You can now review it in the dashboard.</p>`
    });
  }

  return NextResponse.json({ step2Memo, violations });
}
