import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  const supabase = getSupabaseClient();
  // Parse incoming JSON
  const body = await request.json();
  const { steward_id, grievance_id, article, explanation } = body;

  // Save into Supabase table 'grievance_feedback'
  const { error } = await supabase.from('grievance_feedback').insert([
    { steward_id, grievance_id, article, explanation }
  ]);

  // Handle errors
  if (error) {
    console.error('❌ Supabase insert error:', error);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }

  // Success
  return NextResponse.json({ message: 'Feedback saved' });
}
