import OpenAI from "openai";
import { NextResponse, NextRequest } from "next/server";
import { extractTextFromFile } from "@/lib/extractTextFromFile";
import { createClient } from "@supabase/supabase-js";

const systemPrompt = `
You are a USPS arbitration grievance writer trained under the APWU National Agreement. Generate a full grievance with these sections:

1. Step and Grievance Classification (e.g., Step 1 Class Action Grievance)
2. Remedy Requested
3. Statement of Facts (include timestamps, location, and named parties)
4. Union Contentions:
   - For each article or handbook cited:
     - What It Conveys (from contract)
     - Union/Grievant’s Position (why it applies here)
5. Compensation and Make-Whole Relief Demanded
6. Reminder on 14-day filing deadline

Format clearly, use bold section headers, no disclaimers. Language must be professional, factual, and legally persuasive.
`;


// Helper to extract Clerk and Supabase user IDs from the request
async function extractUserIdsFromRequest(request: NextRequest) {
  const clerkUserId: string | null = null;
  let supabaseUserId: string | null = null;
  // Only fallback JWT logic, since getAuth is not available
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const jwt = authHeader.replace("Bearer ", "");
    try {
      const { data: { user } } = await supabase.auth.getUser(jwt);
      if (user && user.id) {
        supabaseUserId = user.id;
      }
    } catch {}
  }
  return { clerkUserId, supabaseUserId };
}

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is missing.');
    return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 500 });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase env vars");
  }
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const body = await request.json();
  const { summary, description, grievanceId, case_number } = body;
  if (!summary || !description) {
    return NextResponse.json({ error: "Missing summary or description" }, { status: 400 });
  }

  // Extract user IDs
  const { clerkUserId, supabaseUserId } = await extractUserIdsFromRequest(request);
  if (!clerkUserId && !supabaseUserId) {
    return NextResponse.json({ error: "Missing Clerk and Supabase user ID" }, { status: 401 });
  }

  let supportingDocuments = "";

  if (grievanceId) {
    const { data: files, error } = await supabase
      .from("grievance_files")
      .select("file_name, file_type")
      .eq("grievance_id", grievanceId);

    if (!error && files?.length) {
      for (const file of files) {
        const path = `denials/${grievanceId}/${file.file_name}`;
        const { data: fileBlob } = await supabase.storage
          .from("denials")
          .download(path);

        if (fileBlob) {
          const text = await extractTextFromFile(fileBlob, file.file_type);
          supportingDocuments += `\n\n[${file.file_name}]\n${text}`;
        }
      }
    }
  }

  const fullPrompt = `Summary:\n${summary}\n\nDescription:\n${description}\n\nSupporting Documents:\n${supportingDocuments || "(None found)"}`;

  const memoResponse = await openai.chat.completions.create({
    model: "gpt-4",
    temperature: 0.3,
    max_tokens: 2000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: fullPrompt }
    ]
  });

  const memo = memoResponse.choices[0]?.message?.content || "⚠️ No memo returned.";

  const jsonPrompt = `
${fullPrompt}

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
  } catch {
    console.error("❌ Failed to parse violations JSON:");
  }

  // Insert grievance as usual
  const { error: insertError } = await supabase.from("grievances").insert({
    ...body,
    case_number: case_number || `GT-${Date.now()}`,
    created_by_user_id: clerkUserId,
    supabase_user_id: supabaseUserId || null,
    submitted_at: new Date().toISOString(),
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ memo, violations });
}
