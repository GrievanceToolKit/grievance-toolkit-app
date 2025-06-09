// app/api/analyze/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  return NextResponse.json({ message: "This will handle AI analysis soon." });
}
