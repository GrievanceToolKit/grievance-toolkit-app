import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseClient';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, role } = body;

    if (!Array.isArray(messages) || !role) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const systemPrompt =
      'You are a USPS APWU contract advisor. Help stewards resolve grievances.';

    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      temperature: 0.3,
      max_tokens: 800,
      messages: chatMessages,
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

  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
