import { auth } from "@clerk/nextjs/server";

export async function getUserRole(): Promise<"admin" | "steward" | "member" | null> {
  // Clerk v6+ server-side: auth() returns a promise, use await and sessionClaims
  const sessionAuth = await auth();
  const claims = sessionAuth.sessionClaims as { publicMetadata?: { role?: "admin" | "steward" | "member" }, role?: "admin" | "steward" | "member" };
  return (
    (claims?.publicMetadata?.role) ||
    claims?.role ||
    null
  );
}
