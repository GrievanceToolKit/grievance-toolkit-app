<<<<<<< HEAD
"use client";
import { useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SHARED_SECRET_PASSWORD = process.env.NEXT_PUBLIC_SHARED_SECRET_PASSWORD!;

export default function AppInitializer() {
  const { user } = useUser();
  const { isSignedIn } = useAuth();

  useEffect(() => {
    async function signInSupabase() {
      if (!user || !user.emailAddresses?.[0]?.emailAddress) return;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: user.emailAddresses[0].emailAddress,
          password: SHARED_SECRET_PASSWORD,
        });
        if (error) {
          console.error("Supabase sign-in error:", error.message);
        } else {
          console.log("Supabase session:", data);
        }
      } catch (err) {
        console.error("Supabase sign-in exception:", err);
      }
    }
    if (isSignedIn) {
      signInSupabase();
    }
  }, [user, isSignedIn]);

  return null;
=======
export default function Home() {
  return (
    <main className="p-8">
      <h1>Grievance Toolkit - Dashboard Placeholder</h1>
    </main>
  );
>>>>>>> codex/fix-grievance-submission-rls-error
}
