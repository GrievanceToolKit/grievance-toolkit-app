import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from '@langchain/core/documents';

dotenv.config();

export type GrievanceExample = {
  rewritten_summary: string;
  violations: {
    article_number: string;
    article_title: string;
    violation_reason: string;
  }[];
};

let vectorStore: MemoryVectorStore | null = null;
let loadedExamples: GrievanceExample[] = [];

export function loadExamples() {
  const filePath = path.join(process.cwd(), 'data', 'grievances.json');
  console.log('🧭 Looking for grievance file at:', filePath);

  if (!fs.existsSync(filePath)) {
    console.error('❌ File does not exist at:', filePath);
    throw new Error('Grievance data file not found');
  }

  try {
    const file = fs.readFileSync(filePath, 'utf-8');
    console.log('📄 Grievance file loaded successfully.');
    return JSON.parse(file); // ✅ Expecting a full JSON array
  } catch (err) {
    console.error('❌ Failed to read or parse grievance file:', err);
    throw new Error('Failed to load or parse grievance data file');
  }
}

async function buildVectorStore() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing');
  }
  loadedExamples = loadExamples();
  const docs: Document[] = loadedExamples.map((ex, idx) => {
    const text = [
      ex.rewritten_summary,
      ...ex.violations.map(v => `${v.article_number} ${v.article_title} ${v.violation_reason}`)
    ].join(' ');
    return new Document({ pageContent: text, metadata: { idx } });
  });
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    model: 'text-embedding-3-small',
  });
  vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);
}

export async function searchGrievances(query: string) {
  if (!vectorStore) await buildVectorStore();
  if (!vectorStore) throw new Error('Vector store not initialized');
  const results = await vectorStore.similaritySearch(query, 3);
  return results.map((r: Document) => {
    const idx = r.metadata.idx;
    return loadedExamples[idx];
  });
}
