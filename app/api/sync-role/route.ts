import { auth } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { role } = await req.json();
  const { userId, session } = auth();
  const email = session?.user?.emailAddresses?.[0]?.emailAddress;

  const { error } = await supabase
    .from("users")
    .update({ role, email })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Role synced." }, { status: 200 });
}
