import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSupabaseClient } from '@/lib/supabaseClient';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is missing.');
    return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 500 });
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch {
    console.error('❌ Supabase env vars are missing.');
    return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
  }
  try {
    const body = await request.json();
    const { messages, role } = body;

    if (!Array.isArray(messages) || !role) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const systemPrompt =
      'You are a USPS APWU contract advisor. Help stewards resolve grievances.';

    const chatMessages: (ChatCompletionMessageParam | { role: string; content: string; name?: string })[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];
    const safeMessages = chatMessages.map((msg) => {
      if (msg.role === 'function') {
        return {
          role: 'function',
          name: 'name' in msg && msg.name ? msg.name : 'unnamed_function',
          content: msg.content,
        };
      }
      return {
        role: msg.role,
        content: msg.content,
      };
    }) as ChatCompletionMessageParam[];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      temperature: 0.3,
      max_tokens: 800,
      messages: safeMessages,
    });
    console.log("GPT Completion:", JSON.stringify(completion, null, 2));
    const reply = completion.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json({ response: null, error: "No AI content returned." }, { status: 200 });
    }
    // Save chat log if role is steward
    if (role === 'steward') {
      await supabase.from('steward_chat_logs').insert([
        {
          messages: JSON.stringify(messages),
          reply,
          created_at: new Date().toISOString(),
        },
      ]);
    }
    return NextResponse.json({ response: reply });

  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
