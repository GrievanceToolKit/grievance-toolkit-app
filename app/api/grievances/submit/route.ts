import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

export async function POST(request: Request) {
  const { userId } = await auth();
  const body = await request.json();

  // Auto-generate case_number
  const caseNumber = `GTK-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

  // Use Clerk user info for created_by_user_id and local_id
  // (Assume local_id is passed from frontend or set a default)
  const localId = body.local_id || '1070';

  // Prepare grievance object for Supabase
  const newGrievance = {
    summary: body.summary,
    description: body.description,
    violations: body.violations || [],
    grievance_type: body.grievance_type,
    step1_memo: body.memo || body.step1_memo || '',
    status: 'step1',
    step1_created_at: new Date().toISOString(),
    case_number: caseNumber,
    created_by_user_id: userId,
    local_id: localId,
  };

  const { error } = await supabase.from('grievances').insert(newGrievance);

  if (error) {
    console.error('[SUBMIT ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Grievance submitted.', case_number: caseNumber }, { status: 201 });
}
