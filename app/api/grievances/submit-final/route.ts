import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { ensureUserExists } from "@/lib/auth/ensureUserExists";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memo, violations, summary, description, case_number, grievance_type, employee_name, craft, building } = body;
    const session = await auth();
    const clerkUserId = session?.userId || null;
    await ensureUserExists();

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Look up Supabase user ID
    let supabaseUserId: string | null = null;
    if (clerkUserId) {
      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_user_id", clerkUserId)
        .single();
      if (data?.id) supabaseUserId = data.id;
    }

    const grievanceInsert = {
      summary,
      description,
      case_number,
      grievance_type,
      employee_name,
      craft,
      building,
      memo,
      violations,
      created_by_user_id: clerkUserId,
      supabase_user_id: supabaseUserId || null,
      submitted_at: new Date().toISOString(),
      status: "submitted",
    };
    const { error } = await supabase.from("grievances").insert(grievanceInsert);
    if (error) {
      console.error("[submit-final] Supabase insert error:", error, grievanceInsert);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    // TODO: Replace 'unknown' with a more specific error type if possible
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[submit-final] API error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
