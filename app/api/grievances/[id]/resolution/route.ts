import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 500 });
    }
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from("grievances")
      .select("resolution_text, steward_notes, resolution_file_url, resolved_at, is_resolved")
      .eq("id", params.id)
      .single();
    if (error) throw error;
    return NextResponse.json({ ...data });
  } catch (err: any) {
    console.error("[get-resolution] API error:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
