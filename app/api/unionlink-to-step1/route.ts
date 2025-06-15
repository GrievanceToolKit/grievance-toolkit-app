import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const supabaseUrl = process.env['SUPABASE_URL'] ?? '';
const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase env variables", { supabaseUrl, supabaseKey });
  throw new Error("Supabase client cannot be initialized. Missing env vars.");
}

export async function POST(request: Request) {
  const { userId } = await auth();
  const { unionLinkId } = await request.json();

  if (!userId || !unionLinkId) {
    return NextResponse.json({ error: 'Missing user or unionLinkId' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch union link data
  const { data: unionLink } = await supabase
    .from('union_links')
    .select('*')
    .eq('id', unionLinkId)
    .single();

  if (!unionLink) {
    return NextResponse.json({ error: 'Union link not found' }, { status: 404 });
  }

  // Create grievance
  const { data: grievance, error: insertError } = await supabase.from('grievances').insert({
    title: `Grievance from UnionLink ${unionLinkId}`,
    summary: unionLink.grievance_summary,
    description: unionLink.grievance_description,
    created_by_user_id: userId,
    user_id: userId,
    local_id: unionLink.local_id,
    case_number: `GT-${Math.floor(100000 + Math.random() * 900000)}`,
  }).select().single();

  if (insertError) {
    return NextResponse.json({ error: 'Failed to create grievance' }, { status: 500 });
  }

  // Log responded_at timestamp
  await supabase
    .from('union_links')
    .update({ responded_at: new Date().toISOString() })
    .eq('id', unionLinkId);

  return NextResponse.json({ grievanceId: grievance.id });
}
