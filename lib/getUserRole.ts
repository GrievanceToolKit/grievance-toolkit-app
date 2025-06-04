import { auth } from "@clerk/nextjs";

export function getUserRole(): "admin" | "steward" | "member" | null {
  const user = auth().user;
  return (user?.publicMetadata?.role as "admin" | "steward" | "member") || null;
}
