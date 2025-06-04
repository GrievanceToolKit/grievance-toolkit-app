"use client";

import { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import Link from 'next/link';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const mockGrievances = [
  {
    caseNumber: 'GT-001',
    filedDate: '2025-05-01',
    articles: ['Article 19'],
    status: 'Open',
    confidence: '91%',
    grievant: 'Jose Santiago',
  },
  {
    caseNumber: 'GT-002',
    filedDate: '2025-04-27',
    articles: ['Article 14', 'Article 5'],
    status: 'Resolved',
    confidence: '88%',
    grievant: 'Ricardo Parra',
  },
  {
    caseNumber: 'GT-003',
    filedDate: '2025-03-22',
    articles: ['Article 17'],
    status: 'Escalated',
    confidence: '84%',
    grievant: 'Maria Lopez',
  },
];

const grievanceStats = {
  labels: ['Article 19', 'Article 14', 'Article 17', 'Article 5', 'ELM 437.11'],
  datasets: [
    {
      label: 'Violations',
      data: [15, 10, 8, 5, 3],
      backgroundColor: '#3b82f6',
    },
  ],
};

const options = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: true,
      text: 'Grievances by Article Violated',
    },
  },
};

export default function HistoryPage() {
  const [filter, setFilter] = useState('All');
  const filteredGrievances =
    filter === 'All'
      ? mockGrievances
      : mockGrievances.filter((g) => g.status === filter);

  return (
    <div className="p-6 max-w-5xl mx-auto bg-white dark:bg-gray-900 text-black dark:text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">📜 Grievance History</h1>
      <div className="flex flex-wrap gap-4 mb-6">
        <Link href="/grievances/new">
          <button className="bg-blue-600 text-white px-4 py-2 rounded">Start New Grievance</button>
        </Link>
        <Link href="/witness-form">
          <button className="bg-green-600 text-white px-4 py-2 rounded">Submit Witness Statement</button>
        </Link>
        <Link href="/step2">
          <button className="bg-yellow-500 text-white px-4 py-2 rounded">Escalation</button>
        </Link>
        <Link href="/ai-analysis">
          <button className="bg-purple-600 text-white px-4 py-2 rounded">Request AI Analysis</button>
        </Link>
      </div>
      <div className="bg-white dark:bg-gray-900 p-4 rounded shadow mb-8">
        <Bar data={grievanceStats} options={options} />
      </div>
      <div className="mb-4 flex gap-4">
        {['All', 'Open', 'Resolved', 'Escalated'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded text-sm font-medium border ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700'
            }`}
          >
            {status}
          </button>
        ))}
      </div>
      <div className="mb-4">
        <Link href="/witness-form">
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Submit a Witness Statement
          </button>
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="text-left px-4 py-2">Case #</th>
              <th className="text-left px-4 py-2">Filed Date</th>
              <th className="text-left px-4 py-2">Articles</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">AI Confidence</th>
              <th className="text-left px-4 py-2">Grievant</th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredGrievances.map((g, idx) => (
              <tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2 font-mono">{g.caseNumber}</td>
                <td className="px-4 py-2">{g.filedDate}</td>
                <td className="px-4 py-2">{g.articles.join(', ')}</td>
                <td className="px-4 py-2">{g.status}</td>
                <td className="px-4 py-2">{g.confidence}</td>
                <td className="px-4 py-2">{g.grievant}</td>
                <td className="px-4 py-2">
                  <Link href={`/grievance/${g.caseNumber}`}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
