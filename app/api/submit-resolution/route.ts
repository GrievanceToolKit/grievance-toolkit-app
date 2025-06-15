import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Helper: upload file to Supabase Storage
async function uploadFile(supabase: SupabaseClient, grievanceId: string, file: File): Promise<string> {
  const { data, error } = await supabase.storage
    .from("resolutions")
    .upload(`${grievanceId}/${file.name}`, file);
  if (error) throw error;
  return data?.path;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const grievanceId = body.get("grievanceId") as string;
    const resolutionText = body.get("resolutionText") as string;
    const stewardNotes = body.get("stewardNotes") as string | null;
    const file = body.get("uploadedFile");
    const userEmail = body.get("userEmail") as string;
    const memberEmail = body.get("memberEmail") as string | null;
    const managerEmail = body.get("managerEmail") as string | null;
    const grievanceType = body.get("grievanceType") as string;
    const memoHtml = body.get("memoHtml") as string;
    const memoText = body.get("memoText") as string;
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 500 });
    }
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    let fileUrl = null;
    if (file && typeof file !== 'string' && 'name' in file) {
      // file is a File instance
      const path = await uploadFile(supabase, grievanceId, file as File);
      fileUrl = supabase.storage.from("resolutions").getPublicUrl(path).data.publicUrl;
    }
    // Update grievance
    const { error: updateError } = await supabase
      .from("grievances")
      .update({
        resolution_text: resolutionText,
        resolved_at: new Date().toISOString(),
        is_resolved: true,
        steward_notes: stewardNotes,
        resolution_file_url: fileUrl,
      })
      .eq("id", grievanceId);
    if (updateError) throw updateError;
    // Send email
    const emailPayload = {
      to: userEmail,
      cc: grievanceType === "individual" ? memberEmail : undefined,
      subject: `Grievance Resolved – Case ${grievanceId}`,
      html: memoHtml,
      text: memoText,
      attachmentUrl: fileUrl,
    };
    await fetch("/api/send-resolution-email", {
      method: "POST",
      body: JSON.stringify(emailPayload),
      headers: { "Content-Type": "application/json" },
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    // TODO: Replace 'unknown' with a more specific error type if possible
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[submit-resolution] API error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
