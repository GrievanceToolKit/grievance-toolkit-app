'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  DocumentTextIcon,
  ArrowUpRightIcon,
  CheckCircleIcon,
  UserGroupIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

export default function Page() {
  const router = useRouter();

  const funnelCounts = {
    step1: 6,
    step2: 2,
    arbitration: 1,
  };

  const insights = [
    { type: 'OTDL Violation', article: 'Article 19', confidence: '91%', manualOverride: false },
    { type: '204-B Pay', article: 'ELM 437.11', confidence: '88%', manualOverride: true },
    { type: 'Hostile Threats', article: 'Article 15', confidence: '77%', manualOverride: false },
    { type: 'Union Time Denied', article: 'Article 14', confidence: '82%', manualOverride: false },
    { type: 'TACS Manipulation', article: 'Article 5', confidence: '85%', manualOverride: true },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Grievances Filed" value={42} Icon={DocumentTextIcon} />
        <StatCard label="Grievances in Progress" value={8} Icon={ArrowUpRightIcon} />
        <StatCard label="Resolved Cases" value={27} Icon={CheckCircleIcon} />
        <StatCard label="PDFs Generated" value={19} Icon={UserGroupIcon} />
        <StatCard label="AI Match Accuracy" value="92%" Icon={SparklesIcon} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ActionButton label="Start New Grievance" color="blue" onClick={() => router.push('/grievances/new')} />
        <ActionButton label="Submit Witness Statement" color="green" onClick={() => router.push('/witness-form')} />
        <ActionButton label="Escalate to Step 2" color="yellow" onClick={() => router.push('/step2')} />
        <ActionButton label="Request AI Analysis" color="purple" onClick={() => router.push('/ai-analysis')} />
      </div>

      {/* Grievance Funnel */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Grievance Funnel</h2>
        <div className="flex justify-center gap-6">
          <FunnelStep label="Step 1" count={funnelCounts.step1} color="blue" />
          <FunnelStep label="Step 2" count={funnelCounts.step2} color="amber" />
          <FunnelStep label="Arbitration" count={funnelCounts.arbitration} color="purple" />
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">AI Insights</h2>
        <table className="w-full text-sm">
          <thead className="text-left border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="py-2">Type</th>
              <th>Article</th>
              <th>Confidence</th>
              <th>Manual Override</th>
            </tr>
          </thead>
          <tbody>
            {insights.map((item, index) => (
              <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                <td className="py-2">{item.type}</td>
                <td>{item.article}</td>
                <td>{item.confidence}</td>
                <td>
                  {item.manualOverride ? (
                    <span className="bg-red-200 text-red-800 px-2 py-1 text-xs rounded">Yes</span>
                  ) : (
                    <span className="bg-green-200 text-green-800 px-2 py-1 text-xs rounded">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tier Info */}
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        Current Tier: <strong>Pro</strong> — PDFs used: 3/5
      </div>
    </div>
  );
}

function StatCard({ label, value, Icon }: { label: string; value: string | number; Icon: React.ElementType }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded shadow p-4 flex items-center gap-4">
      <Icon className="h-6 w-6 text-blue-500" />
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

function ActionButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`py-3 px-4 rounded text-white font-semibold bg-${color}-500 hover:bg-${color}-600 transition`}
    >
      {label}
    </button>
  );
}

function FunnelStep({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`h-16 w-16 mx-auto rounded-full bg-${color}-500 text-white flex items-center justify-center text-lg font-bold`}>
        {count}
      </div>
      <p className="mt-2">{label}</p>
    </div>
  );
}
