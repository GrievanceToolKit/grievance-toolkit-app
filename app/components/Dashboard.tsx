"use client";

import { useState, useEffect, Fragment } from "react";
import { useRouter } from 'next/navigation';
import { ArrowUpRightIcon, DocumentTextIcon, UserGroupIcon, CheckCircleIcon, SparklesIcon, PlusIcon, DocumentIcon, ArrowUpIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { Popover, Transition } from '@headlessui/react';
import { auth, useAuth, useUser } from '@clerk/nextjs';

// Dummy data
const dummyStats = [
  { label: 'Total Grievances Filed', value: 42, icon: <DocumentTextIcon className="h-7 w-7 text-blue-500" /> },
  { label: 'Grievances in Progress', value: 8, icon: <ArrowUpRightIcon className="h-7 w-7 text-yellow-500" /> },
  { label: 'Resolved Cases', value: 27, icon: <CheckCircleIcon className="h-7 w-7 text-green-500" /> },
  { label: 'PDFs Generated', value: 19, icon: <UserGroupIcon className="h-7 w-7 text-purple-500" /> },
  { label: 'AI Match Accuracy', value: '92%', icon: <SparklesIcon className="h-7 w-7 text-pink-500" /> },
];

const recentGrievances = [
  { id: 'GTK-2025-1006', title: '204-B assignment without pay', article: 'ELM 437.11', date: '2025-05-01', confidence: 'High' },
  { id: 'GTK-2025-1005', title: 'OTDL rights not respected', article: 'Article 19', date: '2025-04-11', confidence: 'Medium' },
  { id: 'GTK-2025-1004', title: 'Union not notified of staffing', article: 'Article 17', date: '2025-03-22', confidence: 'High' },
  { id: 'GTK-2025-1003', title: 'Denied union time', article: 'Article 14', date: '2025-03-02', confidence: 'Low' },
  { id: 'GTK-2025-1002', title: 'TACS manipulation', article: 'Article 5', date: '2025-02-10', confidence: 'Medium' },
];

const funnelCounts = {
  step1: 6,
  step2: 2,
  arbitration: 1,
};

const aiInsights = [
  { type: 'OTDL Violation', article: 'Article 19', confidence: '91%', override: false },
  { type: '204-B Pay', article: 'ELM 437.11', confidence: '88%', override: true },
  { type: 'Hostile Threats', article: 'Article 15', confidence: '77%', override: false },
  { type: 'Union Time Denied', article: 'Article 14', confidence: '82%', override: false },
  { type: 'TACS Manipulation', article: 'Article 5', confidence: '85%', override: true },
];

const userRoles = ['admin', 'steward', 'member'];

export function RequireRole({ role, children }: { role: string, children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  if (!user || user.publicMetadata.role !== role) {
    return <div className="p-6 text-red-600 font-bold">Access denied.</div>;
  }
  return <>{children}</>;
}

export default function Dashboard() {
  const [role, setRole] = useState<'admin' | 'steward' | 'member'>('admin');
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState("");
  // AI Insights sorting state
  const [sortCol, setSortCol] = useState<'type' | 'article' | 'confidence' | 'override' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    // Set timestamp only on client
    const now = new Date().toLocaleString();
    setLastUpdated(now);
  }, []);

  // Filter logic for role
  const visibleGrievances = role === 'admin' ? recentGrievances : role === 'steward' ? recentGrievances.slice(0, 3) : recentGrievances.slice(0, 1);
  const visibleAI = role === 'admin' ? aiInsights : aiInsights.slice(0, 2);
  const usage = { tier: role === 'admin' ? 'Pro' : 'Free', used: 3, max: 5 };

  const getSortedAI = () => {
    if (!sortCol) return visibleAI;
    const sorted = [...visibleAI].sort((a, b) => {
      let aVal = a[sortCol];
      let bVal = b[sortCol];
      if (sortCol === 'confidence') {
        const aNum = parseFloat(String(aVal).replace('%', ''));
        const bNum = parseFloat(String(bVal).replace('%', ''));
        return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
      }
      if (sortCol === 'override') {
        return sortDir === 'asc'
          ? (aVal === bVal ? 0 : aVal ? 1 : -1)
          : (aVal === bVal ? 0 : aVal ? -1 : 1);
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return 0;
    });
    return sorted;
  };

  const sortedAI = getSortedAI();
  const handleSort = (col: 'type' | 'article' | 'confidence' | 'override') => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Last updated timestamp */}
      <div className="flex justify-end mb-2">
        <span className="text-sm text-gray-400 dark:text-gray-500">🔄 Last updated: {lastUpdated}</span>
      </div>
      {/* Role Switcher */}
      <div className="flex justify-end gap-2">
        {userRoles.map(r => (
          <button
            key={r}
            className={`px-3 py-1 rounded text-sm font-semibold border ${role === r ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-300 border-blue-400'} transition`}
            onClick={() => setRole(r as any)}
          >
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>
      {/* 1. Stat Widgets */}
      <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
        {dummyStats.map((stat, i) => (
          <div key={i} className="flex-1 bg-white dark:bg-gray-900 rounded shadow flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 relative">
            <div className="flex items-center gap-1">
              {stat.icon}
              <Popover className="relative">
                <Popover.Button className="focus:outline-none">
                  <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-blue-500" />
                </Popover.Button>
                <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="opacity-0" enterTo="opacity-100" leave="transition ease-in duration-75" leaveFrom="opacity-100" leaveTo="opacity-0">
                  <Popover.Panel className="absolute z-10 left-6 top-0 mt-2 w-48 bg-gray-700 text-white text-xs rounded px-3 py-2 shadow-lg">
                    {stat.label === 'Total Grievances Filed' && 'Total grievances submitted.'}
                    {stat.label === 'AI Match Accuracy' && 'AI’s article prediction success rate.'}
                    {stat.label === 'Grievances in Progress' && 'Currently open grievances.'}
                    {stat.label === 'Resolved Cases' && 'Grievances marked as resolved.'}
                    {stat.label === 'PDFs Generated' && 'PDF documents created from grievances.'}
                  </Popover.Panel>
                </Transition>
              </Popover>
            </div>
            <div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
      {/* 2. Recent Activity Feed */}
      <div className="bg-white dark:bg-gray-900 rounded shadow p-4 border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <h2 className="font-bold text-lg mb-2">Recent Activity</h2>
        <ul className="min-w-[400px] divide-y divide-gray-200 dark:divide-gray-700">
          {visibleGrievances.map(g => (
            <li key={g.id} className="py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{g.title}</span>
                <span className="ml-2 text-xs text-gray-500">({g.article})</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{g.date}</span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${g.confidence === 'High' ? 'bg-green-100 text-green-700' : g.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{g.confidence}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {/* 3. Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => router.push('/grievances/new')}
          className="p-4 rounded shadow bg-blue-500 text-white hover:bg-blue-600"
        >
          🚀 Start a New Grievance
        </button>
        <button
          onClick={() => router.push('/witness-form')}
          className="p-4 rounded shadow bg-green-500 text-white hover:bg-green-600"
        >
          📝 Submit Witness Statement
        </button>
        <button
          onClick={() => router.push('/step2')}
          className="p-4 rounded shadow bg-yellow-500 text-white hover:bg-yellow-600"
        >
          ⬆️ Escalate to Step 2
        </button>
        <button
          onClick={() => router.push('/ai-analysis')}
          className="p-4 rounded shadow bg-purple-500 text-white hover:bg-purple-600"
        >
          🤖 Request AI Analysis
        </button>
      </div>
      {/* 4. Grievance Funnel Chart */}
      <div className="bg-white dark:bg-gray-900 rounded shadow p-4 border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <h2 className="font-bold text-lg mb-2">Grievance Funnel</h2>
        <div className="flex flex-col md:flex-row items-center gap-6 justify-center mt-4 min-w-[350px]">
          {/* Step 1 */}
          <div className="relative flex flex-col items-center">
            <button
              onClick={() => router.push('/reportes?stage=step1')}
              className="flex flex-col items-center focus:outline-none"
              aria-label="Filter Step 1"
            >
              <div className="h-20 w-20 rounded-full bg-blue-500 text-white flex items-center justify-center text-lg font-bold shadow-lg">
                {funnelCounts.step1}
              </div>
              <span className="mt-2 font-semibold">Step 1</span>
            </button>
            <Popover className="absolute top-2 right-2">
              <Popover.Button className="focus:outline-none">
                <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-blue-500" />
              </Popover.Button>
              <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="opacity-0" enterTo="opacity-100" leave="transition ease-in duration-75" leaveFrom="opacity-100" leaveTo="opacity-0">
                <Popover.Panel className="absolute z-10 w-52 p-2 bg-white dark:bg-gray-800 rounded shadow text-xs">
                  Click to filter grievances in Step 1.
                </Popover.Panel>
              </Transition>
            </Popover>
          </div>
          <div className="h-8 w-1 bg-gray-300 dark:bg-gray-700 md:h-1 md:w-16 mx-4 md:mx-0 md:my-0 my-4" />
          {/* Step 2 */}
          <div className="relative flex flex-col items-center">
            <button
              onClick={() => router.push('/reportes?stage=step2')}
              className="flex flex-col items-center focus:outline-none"
              aria-label="Filter Step 2"
            >
              <div className="h-20 w-20 rounded-full bg-yellow-500 text-white flex items-center justify-center text-lg font-bold shadow-lg">
                {funnelCounts.step2}
              </div>
              <span className="mt-2 font-semibold">Step 2</span>
            </button>
            <Popover className="absolute top-2 right-2">
              <Popover.Button className="focus:outline-none">
                <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-blue-500" />
              </Popover.Button>
              <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="opacity-0" enterTo="opacity-100" leave="transition ease-in duration-75" leaveFrom="opacity-100" leaveTo="opacity-0">
                <Popover.Panel className="absolute z-10 w-52 p-2 bg-white dark:bg-gray-800 rounded shadow text-xs">
                  Click to filter grievances in Step 2.
                </Popover.Panel>
              </Transition>
            </Popover>
          </div>
          <div className="h-8 w-1 bg-gray-300 dark:bg-gray-700 md:h-1 md:w-16 mx-4 md:mx-0 md:my-0 my-4" />
          {/* Arbitration */}
          <div className="relative flex flex-col items-center">
            <button
              onClick={() => router.push('/reportes?stage=arbitration')}
              className="flex flex-col items-center focus:outline-none"
              aria-label="Filter Arbitration"
            >
              <div className="h-20 w-20 rounded-full bg-purple-500 text-white flex items-center justify-center text-lg font-bold shadow-lg">
                {funnelCounts.arbitration}
              </div>
              <span className="mt-2 font-semibold">Arbitration</span>
            </button>
            <Popover className="absolute top-2 right-2">
              <Popover.Button className="focus:outline-none">
                <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-blue-500" />
              </Popover.Button>
              <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="opacity-0" enterTo="opacity-100" leave="transition ease-in duration-75" leaveFrom="opacity-100" leaveTo="opacity-0">
                <Popover.Panel className="absolute z-10 w-52 p-2 bg-white dark:bg-gray-800 rounded shadow text-xs">
                  Click to filter grievances in Arbitration.
                </Popover.Panel>
              </Transition>
            </Popover>
          </div>
        </div>
      </div>
      {/* 5. AI Insights */}
      {role === 'admin' && (
        <div className="bg-white dark:bg-gray-900 rounded shadow p-4 border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <h2 className="font-bold text-lg mb-2">AI Insights</h2>
          <table className="min-w-[400px] text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="px-3 py-2 text-left cursor-pointer select-none" onClick={() => handleSort('type')}>
                  Type
                  {sortCol === 'type' && (sortDir === 'asc' ? <ChevronUpIcon className="inline h-4 w-4 ml-1" /> : <ChevronDownIcon className="inline h-4 w-4 ml-1" />)}
                </th>
                <th className="px-3 py-2 text-left cursor-pointer select-none" onClick={() => handleSort('article')}>
                  Article
                  {sortCol === 'article' && (sortDir === 'asc' ? <ChevronUpIcon className="inline h-4 w-4 ml-1" /> : <ChevronDownIcon className="inline h-4 w-4 ml-1" />)}
                </th>
                <th className="px-3 py-2 text-left cursor-pointer select-none" onClick={() => handleSort('confidence')}>
                  Confidence
                  {sortCol === 'confidence' && (sortDir === 'asc' ? <ChevronUpIcon className="inline h-4 w-4 ml-1" /> : <ChevronDownIcon className="inline h-4 w-4 ml-1" />)}
                </th>
                <th className="px-3 py-2 text-left cursor-pointer select-none" onClick={() => handleSort('override')}>
                  Manual Override
                  {sortCol === 'override' && (sortDir === 'asc' ? <ChevronUpIcon className="inline h-4 w-4 ml-1" /> : <ChevronDownIcon className="inline h-4 w-4 ml-1" />)}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedAI.map((row, i) => (
                <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-3 py-2">{row.type}</td>
                  <td className="px-3 py-2">{row.article}</td>
                  <td className="px-3 py-2">{row.confidence}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${row.override ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{row.override ? 'Yes' : 'No'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* 6. Subscription Usage Reminder */}
      <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded shadow p-4 flex items-center justify-between">
        <div>
          <div className="font-bold text-blue-700 dark:text-blue-300">Current Tier: {usage.tier}</div>
          <div className="text-xs text-gray-500 mt-1">PDFs used: {usage.used}/{usage.max}</div>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded shadow">Upgrade</button>
      </div>
    </div>
  );
}
