"use client";
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

const mockStatements = [
  {
    id: 'WIT-2025-001',
    memberName: 'Jane Doe',
    date: '2025-05-15',
    status: 'Pending',
    pdfUrl: '/api/witness/pdf/WIT-2025-001',
  },
  {
    id: 'WIT-2025-002',
    memberName: 'John Smith',
    date: '2025-05-14',
    status: 'Reviewed',
    pdfUrl: '/api/witness/pdf/WIT-2025-002',
  },
];

export default function WitnessReviewPage() {
  const { user } = useUser();
  const [statements, setStatements] = useState(mockStatements);

  const handleStatus = (id: string, newStatus: string) => {
    setStatements(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    // TODO: Update status in database via API
  };

  if (!user || user.publicMetadata.role !== 'steward') {
    return <div className="p-6 text-red-600 font-bold">Access denied. Stewards only.</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Witness Statement Moderation</h1>
      <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded shadow">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="py-2 px-4 text-left">Member Name</th>
              <th className="py-2 px-4 text-left">Date Submitted</th>
              <th className="py-2 px-4 text-left">Status</th>
              <th className="py-2 px-4 text-left">PDF</th>
              <th className="py-2 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {statements.map(s => (
              <tr key={s.id} className="border-b border-gray-200 dark:border-gray-700">
                <td className="py-2 px-4">{s.memberName}</td>
                <td className="py-2 px-4">{s.date}</td>
                <td className="py-2 px-4">{s.status}</td>
                <td className="py-2 px-4">
                  <a href={s.pdfUrl} target="_blank" rel="noopener" className="text-blue-600 underline">View PDF</a>
                </td>
                <td className="py-2 px-4 flex gap-2">
                  <button
                    className="bg-green-600 text-white px-3 py-1 rounded text-xs"
                    onClick={() => handleStatus(s.id, 'Attached to Grievance')}
                    disabled={s.status === 'Attached to Grievance'}
                  >Attach to Grievance</button>
                  <button
                    className="bg-gray-500 text-white px-3 py-1 rounded text-xs"
                    onClick={() => handleStatus(s.id, 'Reviewed')}
                    disabled={s.status === 'Reviewed' || s.status === 'Attached to Grievance'}
                  >Mark as Reviewed</button>
                </td>
              </tr>
            ))}
            {statements.length === 0 && (
              <tr><td colSpan={5} className="text-center py-4 text-gray-500">No witness statements found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
