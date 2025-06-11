import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

type GrievanceLog = {
  id: string;
  original_query: string;
  original_response: string;
};
type Correction = {
  original_response: string;
  original_query: string;
  steward_correction: string;
  steward_email: string;
  id: string;
};

// POST body: { correctionId: string }
export async function POST(request: Request) {
  try {
    const { correctionId } = await request.json();
    if (!correctionId) return NextResponse.json({ error: 'Missing correctionId' }, { status: 400 });

    // 1. Fetch the selected steward correction
    const { data: correction, error: fetchError } = await supabase
      .from('ai_training_queue')
      .select('*')
      .eq('id', correctionId)
      .single<Correction>();
    if (fetchError || !correction) {
      return NextResponse.json({ error: 'Correction not found' }, { status: 404 });
    }

    // 2. Find similar logs in grievance_search_logs
    // - original_response matches
    // - original_query is similar (ILIKE for now)
    // - not already corrected (no ai_training_queue referencing that log)
    const { data: logs, error: logsError } = await supabase
      .from('grievance_search_logs')
      .select('*')
      .eq('original_response', correction.original_response)
      .ilike('original_query', `%${correction.original_query}%`);
    if (logsError) {
      return NextResponse.json({ error: 'Error searching logs' }, { status: 500 });
    }
    if (!logs || logs.length === 0) {
      return NextResponse.json({ message: 'No similar logs found', applied: 0 });
    }

    // Filter out logs already corrected
    const logIds = (logs as GrievanceLog[]).map(l => l.id);
    const { data: alreadyCorrected } = await supabase
      .from('ai_training_queue')
      .select('source_log_id')
      .in('source_log_id', logIds);
    const alreadyCorrectedIds = new Set((alreadyCorrected || []).map((r: { source_log_id: string }) => r.source_log_id));
    const toApply = (logs as GrievanceLog[]).filter(l => !alreadyCorrectedIds.has(l.id));
    const inserts = toApply.map(l => ({
      original_query: l.original_query,
      original_response: l.original_response,
      steward_correction: correction.steward_correction,
      steward_email: correction.steward_email,
      source_log_id: l.id,
      bulk_applied: true,
      applied_to_model: false,
    }));
    if (inserts.length === 0) {
      return NextResponse.json({ message: 'No new matches to apply', applied: 0 });
    }
    const { error: insertError } = await supabase
      .from('ai_training_queue')
      .insert(inserts);
    if (insertError) {
      return NextResponse.json({ error: 'Bulk insert failed' }, { status: 500 });
    }
    return NextResponse.json({ message: 'Bulk override applied', applied: inserts.length });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
