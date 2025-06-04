import { supabase } from '../supabaseClient';
import { OpenAI } from 'openai';

// Helper to get OpenAI embedding for a string
export async function getEmbedding(text: string): Promise<number[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

// Get the top matching contract clause from Supabase using pgvector
export const getTopMatchFromSupabase = async (articleTitle: string) => {
  const embedding = await getEmbedding(articleTitle);

  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: embedding,
    match_count: 1
  });

  if (error) {
    console.error("RAG error:", error);
    return null;
  }

  return data?.[0]?.content || null;
};
