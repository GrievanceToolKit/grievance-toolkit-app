import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";

export async function ensureUserExists() {
  const session = await auth();
  const userId = session?.userId;
  if (!userId) throw new Error("No Clerk userId found");

  // Fetch Clerk user profile from the public API
  const userRes = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!userRes.ok) throw new Error("Failed to fetch Clerk user profile");
  const user = await userRes.json();

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Check if user exists
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();

  if (!data) {
    // Insert user with all required fields and fallbacks
    const insertUser = {
      id: randomUUID(),
      name: (user.first_name || "Unregistered") + " " + (user.last_name || ""),
      email: user.email_addresses?.[0]?.email_address || 'unknown@local.usps',
      clerk_user_id: user.id,
      craft: "unspecified",
      role: "member",
      local_id: "unknown",
      local_name: "unspecified",
    };
    const { error: insertError } = await supabase.from("users").insert(insertUser);
    if (insertError) {
      console.error("[ensureUserExists] Failed to insert default user:", insertError.message);
      throw new Error("Failed to insert default user: " + insertError.message);
    } else {
      console.log("[ensureUserExists] Inserted default user:", insertUser);
    }
    return true;
  }
  return false;
}
