// Create a responsive table to display grievance cases
// Each row shows: Employee name, Article violated, Status, Submission date
// Add search and filter by status

'use client';

import { useState } from 'react';

const mockData = [
  { name: 'John Doe', article: 'Article 5', status: 'Pending', date: '2024-06-01' },
  { name: 'Jane Smith', article: 'Article 15', status: 'Resolved', date: '2024-06-02' },
];

export default function TrackerPage() {
  const [search, setSearch] = useState('');

  const filtered = mockData.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.article.toLowerCase().includes(search.toLowerCase()) ||
    item.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Grievance Tracker</h1>
      <input
        type="text"
        className="border px-4 py-2 mb-4 w-full"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <table className="min-w-full border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2">Employee</th>
            <th className="border px-4 py-2">Article</th>
            <th className="border px-4 py-2">Status</th>
            <th className="border px-4 py-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((entry, i) => (
            <tr key={i}>
              <td className="border px-4 py-2">{entry.name}</td>
              <td className="border px-4 py-2">{entry.article}</td>
              <td className="border px-4 py-2">{entry.status}</td>
              <td className="border px-4 py-2">{entry.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}