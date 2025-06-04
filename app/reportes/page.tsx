'use client';
import { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { registerChartModules } from '../components/chartUtils';

registerChartModules(); // Call before rendering <Bar />

const mockUsers = [
  { name: 'Ricardo Parra', role: 'Admin', email: 'ricardo@example.com', status: 'Active' },
  { name: 'Jose Santiago', role: 'Steward', email: 'jose@example.com', status: 'Active' },
  { name: 'Maria Lopez', role: 'Member', email: 'maria@example.com', status: 'Disabled' },
];

export default function ReportsPage() {
  const [selectedRange, setSelectedRange] = useState('Last 30 Days');

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Grievance Statistics',
      },
    },
  };

  const grievanceStats = {
    labels: ['January', 'February', 'March', 'April', 'May', 'June'],
    datasets: [
      {
        label: 'Grievances',
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📈 Reports Dashboard</h1>

      <div className="mb-6">
        <label htmlFor="range" className="block text-sm mb-2 font-medium">
          Filter by Date Range:
        </label>
        <select
          id="range"
          className="px-4 py-2 border rounded dark:bg-gray-800 dark:text-white"
          value={selectedRange}
          onChange={(e) => setSelectedRange(e.target.value)}
        >
          <option>Last 7 Days</option>
          <option>Last 30 Days</option>
          <option>Last 90 Days</option>
          <option>Year to Date</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-900 p-4 rounded shadow mb-8">
        <Bar options={options} data={grievanceStats} />
      </div>
    </div>
  );
}
