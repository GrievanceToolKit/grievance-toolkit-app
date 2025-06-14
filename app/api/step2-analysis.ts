import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { extractTextFromFile } from "@/lib/extractTextFromFile";
import OpenAI from "openai";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is missing.');
    return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 500 });
  }
  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch {
    console.error('❌ Supabase env vars are missing.');
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { grievanceId } = await request.json();
  if (!grievanceId) {
    return NextResponse.json({ error: "Missing grievanceId" }, { status: 400 });
  }

  // Fetch grievance row
  const { data: grievance, error: grievanceError } = await supabase
    .from("grievances")
    .select("summary, description, step1_memo")
    .eq("id", grievanceId)
    .single();

  if (grievanceError || !grievance) {
    return NextResponse.json({ error: "Grievance not found" }, { status: 404 });
  }
  if (!grievance.step1_memo) {
    return NextResponse.json({ error: "No Step 1 memo found for this grievance." }, { status: 400 });
  }

  // Fetch uploaded denial/evidence files
  let supportingDocuments = "";
  const { data: files, error: filesError } = await supabase
    .from("grievance_files")
    .select("file_name, file_type")
    .eq("grievance_id", grievanceId);

  if (filesError) {
    console.error("❌ Failed to fetch grievance files:", filesError.message);
  } else if (files?.length) {
    for (const file of files) {
      const path = `denials/${grievanceId}/${file.file_name}`;
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from("denials")
        .download(path);
      if (downloadError || !fileBlob) {
        console.warn(`⚠️ Could not download: ${file.file_name}`);
        continue;
      }
      const text = await extractTextFromFile(fileBlob, file.file_type);
      supportingDocuments += `\n\n[${file.file_name}]\n${text}`;
    }
  }

  // Build OpenAI prompt
  const prompt = `You are a USPS Step 2 grievance escalation expert.\n\nOriginal Step 1 Memo:\n${grievance.step1_memo}\n\nSupporting Documents:${supportingDocuments || " (None)"}\n\nInstructions: Respond to the denial, recommend escalation or resolution, and cite relevant articles and remedies. Format as a professional Step 2 memo.`;

  const aiResponse = await openai.chat.completions.create({
    model: "gpt-4",
    temperature: 0.3,
    max_tokens: 2000,
    messages: [
      { role: "system", content: "You are a USPS Step 2 grievance escalation expert." },
      { role: "user", content: prompt }
    ]
  });

  const step2Memo = aiResponse.choices[0]?.message?.content || "⚠️ No memo returned.";

  // Optionally extract violations (reuse JSON extraction logic if needed)
  // For now, return empty array
  return NextResponse.json({ step2Memo, violations: [] });
}
