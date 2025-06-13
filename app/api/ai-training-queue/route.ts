import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env['SUPABASE_URL'] ?? '';
const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase env variables not found at build time", {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: !!supabaseKey
  });
  throw new Error("Supabase client cannot be initialized. Missing env variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { original_query, original_response, steward_correction, steward_email, source_log_id } = body;
    const { data, error } = await supabase.from('ai_training_queue').insert([
      {
        original_query,
        original_response,
        steward_correction,
        steward_email,
        source_log_id,
      },
    ]);
    if (error) {
      console.error('❌ Failed to insert into ai_training_queue:', error);
      return NextResponse.json({ error: 'Failed to queue for training' }, { status: 500 });
    }
    return NextResponse.json({ message: 'Queued for training', data });
  } catch (err) {
    console.error('❌ Error in training queue API:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
