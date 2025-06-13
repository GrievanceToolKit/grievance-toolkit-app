import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const analyzePrompt = (input: string) => `
You are a union grievance analyst trained in the APWU contract. 
Your job is to read the following steward question and return a JSON object with the following fields:

{
  "summary": "[rewrite the grievance or issue summary in arbitration-ready language]",
  "detectedViolations": [
    {
      "article": "Article Number – Title",
      "explanation": "[explain how this article applies to the facts]"
    },
    ...
  ],
  "recommendedActions": "[suggest next steps or remedies based on what the steward described]"
}

Be concise, clear, and legally accurate. If the issue seems vague, make your best guess and say why.

DO NOT return markdown or explanations.
DO NOT include code blocks.
Only return raw JSON with the above format.

Grievance Input:
"""${input}"""
`;

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY is missing. AI Assistant will not function.");
    return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const body = await req.json();
    const userInput = body.prompt || body.input || '';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content: 'You are an AI trained to respond strictly in JSON format. Never include explanations or markdown. Only return valid JSON.'
        },
        {
          role: 'user',
          content: analyzePrompt(userInput)
        }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content || '';

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (jsonError) {
      console.error('❌ JSON.parse failed in /api/assistant/route.ts:', jsonError, '\nRaw output:', raw);
      return NextResponse.json({
        error: 'Invalid JSON response from AI.',
        fallback: {
          summary: 'AI failed to return valid output. Please try rephrasing or check the input.',
          detectedViolations: [],
          recommendedActions: 'N/A'
        }
      });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('❌ General error in /api/assistant/route.ts:', err);
    return NextResponse.json({
      error: 'Failed to get response from AI.',
      fallback: {
        summary: 'AI could not process the request. Please try again later.',
        detectedViolations: [],
        recommendedActions: 'N/A'
      }
    });
  }
}
