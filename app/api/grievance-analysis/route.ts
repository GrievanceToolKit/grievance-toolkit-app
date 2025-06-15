import OpenAI from "openai";
import { NextResponse, NextRequest } from "next/server";
import { extractTextFromFile } from "@/lib/extractTextFromFile";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { ensureUserExists } from "@/lib/auth/ensureUserExists";

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

async function extractUserIdsFromRequest(supabase: SupabaseClient) {
  const session = await auth();
  const clerkUserId = session?.userId || null;
  let supabaseUserId: string | null = null;

  if (clerkUserId) {
    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .single();
    if (data?.id) {
      supabaseUserId = data.id;
    } else {
      console.warn("[WARN] No Supabase user found for Clerk user ID:", clerkUserId);
    }
  }

  console.log("[DEBUG] Clerk ID:", clerkUserId);
  console.log("[DEBUG] Supabase ID:", supabaseUserId);

  return { clerkUserId, supabaseUserId };
}

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is missing.');
    return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 500 });
  }
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    // ✅ Ensure user exists in Supabase before any insert
    await ensureUserExists();

    // Parse multipart/form-data
    const formData = await request.formData();
    const summary = formData.get('summary')?.toString() || '';
    const description = formData.get('description')?.toString() || '';
    let grievance_number = formData.get('grievance_number')?.toString() || '';
    let grievance_type = (formData.get('grievance_type')?.toString() || '').toLowerCase();
    let employee_name = formData.get('employee_name')?.toString() || '';
    let craft = formData.get('usps_craft')?.toString() || '';
    let building = formData.get('facility')?.toString() || '';

    // Fallbacks for required fields
    if (!grievance_number) grievance_number = `GT-AUTO-${Date.now()}`;
    if (!grievance_type || (grievance_type !== 'individual' && grievance_type !== 'class action')) grievance_type = 'class action';
    if (!craft) craft = 'unspecified';
    if (!building) building = 'unspecified';
    if (!employee_name) employee_name = 'unspecified';

    // Debug log all fields
    console.log('[API] summary:', summary);
    console.log('[API] description:', description);
    console.log('[API] grievance_number:', grievance_number);
    console.log('[API] grievance_type:', grievance_type);
    console.log('[API] employee_name:', employee_name);
    console.log('[API] craft:', craft);
    console.log('[API] building:', building);

    // Extract up to 6 files
    const files: { name: string, type: string, content: string }[] = [];
    for (let i = 0; i < 6; i++) {
      const file = formData.get(`file${i+1}`) as File | null;
      if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
        try {
          const text = await extractTextFromFile(file, file.type);
          files.push({ name: file.name, type: file.type, content: text });
          console.log(`[API] Extracted file: ${file.name}, type: ${file.type}`);
        } catch {
          console.error(`[API] Failed to extract file: ${file?.name}`);
        }
      }
    }

    // Combine all text for AI
    let combinedText = `Summary:\n${summary}\n\nDescription:\n${description}`;
    if (grievance_number) combinedText += `\n\nGrievance Number: ${grievance_number}`;
    if (grievance_type) combinedText += `\n\nGrievance Type: ${grievance_type}`;
    if (grievance_type === 'individual') {
      if (employee_name) combinedText += `\nEmployee Name: ${employee_name}`;
      if (craft) combinedText += `\nUSPS Craft: ${craft}`;
      if (building) combinedText += `\nBuilding/Facility: ${building}`;
    }
    if (files.length) {
      combinedText += '\n\nSupporting Documents:';
      for (const f of files) {
        combinedText += `\n[${f.name}]\n${f.content}`;
      }
    }

    // Extract user IDs
    const { clerkUserId, supabaseUserId } = await extractUserIdsFromRequest(supabase);
    if (!clerkUserId && !supabaseUserId) {
      return NextResponse.json({ error: "Missing Clerk and Supabase user ID" }, { status: 401 });
    }

    // AI Memo (with try/catch)
    let memo = "⚠️ No memo returned.";
    try {
      const memoResponse = await openai.chat.completions.create({
        model: "gpt-4",
        temperature: 0.3,
        max_tokens: 2000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: combinedText }
        ]
      });
      memo = memoResponse.choices[0]?.message?.content || memo;
    } catch (err) {
      console.error("❌ OpenAI memo error:", err);
      return NextResponse.json({ error: "OpenAI memo generation failed", details: String(err) }, { status: 502 });
    }

    // AI Violations (with try/catch and logging)
    let violations = [];
    try {
      const jsonPrompt = `\n${combinedText}\n\nReturn JSON only:\n{\n  \"violations\": [\n    {\n      \"article_number\": \"Article X\",\n      \"article_title\": \"Title\",\n      \"violation_reason\": \"Explanation\"\n    }\n  ]\n}`;
      const jsonResponse = await openai.chat.completions.create({
        model: "gpt-4",
        temperature: 0,
        max_tokens: 1000,
        messages: [
          { role: "system", content: "You are a USPS grievance analyst. Reply only in valid JSON." },
          { role: "user", content: jsonPrompt }
        ]
      });
      const rawContent = jsonResponse.choices[0]?.message?.content || "{}";
      console.log("🧪 Violations JSON raw output:", rawContent);
      try {
        const parsed = JSON.parse(rawContent);
        if (parsed?.violations && Array.isArray(parsed.violations)) {
          violations = parsed.violations;
        } else {
          console.warn("⚠️ Violations key missing or not an array:", parsed);
        }
      } catch (err) {
        console.error("❌ Failed to parse violations JSON:", err, rawContent);
      }
    } catch (err) {
      console.error("❌ OpenAI violations error:", err);
    }

    // Insert grievance as usual, with validation and logging
    const grievanceInsert = {
      summary,
      description,
      case_number: grievance_number, // ✅ Map grievance_number to case_number
      grievance_type,
      employee_name,
      craft,
      building,
      created_by_user_id: clerkUserId,
      supabase_user_id: supabaseUserId || null,
      submitted_at: new Date().toISOString(),
    };
    const { error: insertError } = await supabase.from("grievances").insert(grievanceInsert);
    if (insertError) {
      console.error("❌ Supabase insert error:", insertError, grievanceInsert);
      return NextResponse.json({ error: insertError.message, grievance: grievanceInsert }, { status: 500 });
    }

    return NextResponse.json({
      memo,
      violations,
      grievance_number,
      grievance_type,
      employee_name,
      craft,
      building,
      files: files.map(f => ({ name: f.name, type: f.type })),
    });
  } catch (err: unknown) {
    // TODO: Replace 'unknown' with a more specific error type if possible
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[grievance-analysis] API error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
