// app/api/analyze/route.ts

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ message: "This will handle AI analysis soon." });
}
