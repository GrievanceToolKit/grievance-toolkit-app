import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const promptTemplate = (stewardText: string) => `You are a senior APWU steward drafting a final resolution agreement for a resolved grievance.

Given the pasted text from the steward, generate a clean, professional summary suitable to be sent to USPS management. The tone should be collaborative but firm, confirming what was agreed upon. Avoid legal jargon unless necessary. Format the memo with clear sections:

1. Case Summary  
2. Agreement Reached  
3. Union Statement  
4. Closing Note

Output only the formatted memo.

Steward's notes:
${stewardText}
`;

export async function POST(request: NextRequest) {
  try {
    const { text, case_number, grievant_name } = await request.json();
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful APWU steward assistant." },
        { role: "user", content: promptTemplate(text) },
      ],
      max_tokens: 1200,
      temperature: 0.3,
    });
    const aiResolution = completion.choices[0]?.message?.content || "";
    return NextResponse.json({ aiResolution });
  } catch (err: any) {
    console.error("[ai-resolution] API error:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
