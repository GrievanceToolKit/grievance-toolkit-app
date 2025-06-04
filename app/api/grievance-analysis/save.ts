import { writeFile, readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';

const dbFilePath = path.join(process.cwd(), 'grievances.json');

export async function POST(request: Request) {
  const newGrievance = await request.json();

  try {
    let existing = [];
    try {
      const data = await readFile(dbFilePath, 'utf8');
      existing = JSON.parse(data);
    } catch {
      // File doesn't exist yet
    }

    existing.push({ ...newGrievance, savedAt: new Date().toISOString() });

    await writeFile(dbFilePath, JSON.stringify(existing, null, 2));

    return NextResponse.json({ message: 'Grievance saved.' });
  } catch (err) {
    console.error('[SAVE ERROR]', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
