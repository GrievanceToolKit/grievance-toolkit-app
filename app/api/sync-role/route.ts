import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { role } = await req.json();
  const sessionAuth = await auth();
  const userId = sessionAuth.userId;

  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Role synced." }, { status: 200 });
}
