import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const systemPrompt = `
You are an APWU Step 2 grievance escalation expert. The user is providing the original grievance memo and the management’s Step 1 denial. Your task is to:
- Summarize management’s denial
- Determine if it misrepresents facts, omits context, or violates contract interpretation
- Escalate the grievance by writing a full Step 2 memo with these sections:

1. Step 2 Classification (e.g., Step 2 Class Action – Escalation of Denied Step 1)
2. Background Recap (brief restatement of the grievance and Step 1 outcome)
3. Summary of Management Denial
4. Union’s Rebuttal (include article references and response to flawed reasoning)
5. Escalated Relief Demanded
6. Step 2 Meeting Reminder (must occur within 7 days)

The tone must be firm, arbitration-ready, and written from the union’s perspective.
`;

export const dynamic = 'force-dynamic';

// Helper: Get OpenAI embedding for a string
const getEmbedding = async (text: string): Promise<number[]> => {
  const res = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text
  });
  return res.data[0].embedding;
};

// Helper: Get top matching contract clause from Supabase using pgvector
const getTopMatchFromSupabase = async (articleTitle: string): Promise<string | null> => {
  const embedding = await getEmbedding(articleTitle);
  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: embedding,
    match_count: 1
  });
  if (error) {
    console.error("❌ RAG Supabase error:", error);
    return null;
  }
  return data?.[0]?.content || null;
};

// Define a type for union contentions
interface UnionContention {
  article: string;
  whatItConveys: string;
  unionPosition: string;
}

const supabaseUrl = process.env['SUPABASE_URL'] ?? '';
const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase env variables", { supabaseUrl, supabaseKey });
  throw new Error("Supabase client cannot be initialized. Missing env vars.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { grievanceId, originalMemo, step1Denial, violations = [] } = body;
  if (!grievanceId || !originalMemo || !step1Denial) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // RAG: Build unionContentions with contract language for each violation
  const unionContentions: UnionContention[] = [];
  if (Array.isArray(violations) && violations.length > 0) {
    for (const v of violations) {
      const article = v.article_number;
      const ragContent = await getTopMatchFromSupabase(article);
      unionContentions.push({
        article,
        whatItConveys: ragContent || "This article supports the union’s position in this matter.",
        unionPosition: v.violation_reason
      });
    }
  }

  // RAG: Fetch contract language for each violation/article if present
  const ragSnippets: string[] = [];
  if (Array.isArray(violations) && violations.length > 0) {
    for (const v of violations) {
      const articleTitle = v.article_title || v.article_number || v;
      const chunk = await getTopMatchFromSupabase(articleTitle);
      if (chunk) ragSnippets.push(`Relevant contract language for ${articleTitle}:\n${chunk}`);
    }
  }

  const userPrompt = `Original Grievance Memo:\n${originalMemo}\n\nStep 1 Denial:\n${step1Denial}\n\n${ragSnippets.join('\n\n')}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    temperature: 0.3,
    max_tokens: 1800,
    messages: [
      { role: 'system', content: systemPrompt.trim() },
      { role: 'user', content: userPrompt }
    ]
  });

  const step2Memo = completion.choices[0]?.message?.content || '⚠️ No Step 2 memo returned.';
  return NextResponse.json({ step2Memo });
}
