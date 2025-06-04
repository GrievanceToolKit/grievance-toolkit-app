"use client";

import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function GrievanceDetailPage() {
  const params = useParams();
  const id = params.id as string;

  // Placeholder for fetching grievance details by id
  // In a real app, fetch data from API or context
  // For now, just display the id

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white dark:bg-gray-900 text-black dark:text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Grievance Detail</h1>
      <div className="mb-4">
        <span className="font-semibold">Case ID:</span> <span className="font-mono">{id}</span>
      </div>
      <div className="mb-8 text-gray-600 dark:text-gray-300">
        {/* Placeholder for more details */}
        <p>Details for grievance <span className="font-mono">{id}</span> will appear here.</p>
      </div>
      <Link href="/history">
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Back to History</button>
      </Link>
    </div>
  );
}
