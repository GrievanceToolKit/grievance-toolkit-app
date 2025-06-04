// [feature] Unified API handler utils for GrievanceToolkit
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

export async function handleSupabaseInsert(table: string, data: any) {
  const { error, data: result } = await supabase.from(table).insert(data);
  return { error, data: result };
}

export async function handleSupabaseUpdate(table: string, match: any, update: any) {
  const { error, data: result } = await supabase.from(table).update(update).match(match);
  return { error, data: result };
}

export async function logError(endpoint: string, error: any) {
  // Log to Supabase 'error_logs' table for persistent audit
  await supabase.from('error_logs').insert({
    endpoint,
    error: typeof error === 'string' ? error : JSON.stringify(error),
    timestamp: new Date().toISOString(),
  });
  // Also log to console for dev visibility
  console.error(`[API ERROR] [${endpoint}]`, error);
}
