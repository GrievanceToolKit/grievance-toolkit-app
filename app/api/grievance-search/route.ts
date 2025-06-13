import { NextResponse, NextRequest } from 'next/server';
import { searchGrievances } from '@/lib/rag/grievanceRAG';
import { createClient } from '@supabase/supabase-js';
import { getAuth } from '@clerk/nextjs/server';

const supabaseUrl = process.env['SUPABASE_URL'] ?? '';
const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase env variables", { supabaseUrl, supabaseKey });
  throw new Error("Supabase client cannot be initialized. Missing env vars.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface SearchRequestBody {
  query: string;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    const body: SearchRequestBody = await req.json();
    if (!body || typeof body.query !== 'string' || !body.query.trim()) {
      console.error('❌ Invalid or missing query in request body:', body);
      return NextResponse.json({ error: 'Missing or invalid query' }, { status: 400 });
    }
    const results = await searchGrievances(body.query);

    // Log the search to Supabase
    const { error } = await supabase.from('grievance_search_logs').insert({
      user_id: userId,
      query: body.query,
      top_matches: results,
    });
    if (error) {
      console.error('❌ Supabase insert error:', error);
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error('❌ Grievance search failed:', err instanceof Error ? err.stack || err.message : err);
    return NextResponse.json({ error: 'Failed to search grievances' }, { status: 500 });
  }
}
