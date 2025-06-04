import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  const { userId } = await auth();
  const { unionLinkId } = await request.json();

  if (!userId || !unionLinkId) {
    return NextResponse.json({ error: 'Missing user or unionLinkId' }, { status: 400 });
  }

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
