import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase env variables", { supabaseUrl, supabaseKey });
    return NextResponse.json({ error: "Missing Supabase credentials" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Clerk user ID
  const { userId: clerkUserId } = await auth();

  // Supabase user ID (UUID) extraction from JWT
  let supabaseUserId = null;
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const jwt = authHeader.replace("Bearer ", "");
    // Use Supabase client to get user from JWT
    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (user && user.id) {
      supabaseUserId = user.id;
    }
  }

  if (!clerkUserId && !supabaseUserId) {
    return NextResponse.json({ error: "Missing Clerk and Supabase user ID" }, { status: 401 });
  }

  // ⛔️ Trial case limit logic (use either ID for lookup)
  const userIdForLimit = supabaseUserId || clerkUserId;
  const { count, error: countError } = await supabase
    .from("grievances")
    .select("id", { count: "exact", head: true })
    .or(`created_by_user_id.eq.${userIdForLimit},created_by_clerk_id.eq.${clerkUserId}`);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }
  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: "Trial limit reached (5 grievances)" }, { status: 403 });
  }

  const body = await request.json();
  const { summary, description, case_number } = body;
  if (!summary || !description) {
    return NextResponse.json({ error: "Missing summary or description" }, { status: 400 });
  }
  // Insert grievance as usual
  const { error } = await supabase.from("grievances").insert({
    ...body,
    case_number: case_number || `GT-${Date.now()}`,
    created_by_user_id: supabaseUserId || null,
    created_by_clerk_id: clerkUserId || null,
    submitted_at: new Date().toISOString(),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: "Grievance submitted." }, { status: 201 });
}
