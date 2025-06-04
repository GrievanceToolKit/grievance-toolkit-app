import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Bar } from 'react-chartjs-2';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// --- Types ---
interface TrainingExample {
  id: string;
  original_query: string;
  original_response: string;
  steward_correction: string;
  steward_email: string;
  created_at: string;
  applied_to_model: boolean;
  potential_misuse?: boolean;
}

// Utility: Extract article numbers/titles from steward_correction text
function extractArticles(text: string | undefined | null): string[] {
  if (!text) return [];
  const regex = /Article\s+(\d+[A-Za-z]*)/gi;
  const matches = text.match(regex);
  return matches ? matches.map(m => m.trim()) : [];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<TrainingExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMisuse, setShowMisuse] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stats
  const [total, setTotal] = useState(0);
  const [articleCounts, setArticleCounts] = useState<Record<string, number>>({});
  const [stewardCounts, setStewardCounts] = useState<Record<string, number>>({});
  const [weeklyCounts, setWeeklyCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      let query = supabase
        .from('ai_training_queue')
        .select('*')
        .order('created_at', { ascending: false });
      if (showMisuse) {
        query = query.or('steward_correction.is.null,steward_correction.eq."",steward_correction.ilike.%no violation%');
      }
      const { data: rows, error } = await query;
      if (error || !rows) {
        setError('Failed to load data from Supabase.');
        setLoading(false);
        setData([]);
        setTotal(0);
        setArticleCounts({});
        setStewardCounts({});
        setWeeklyCounts({});
        return;
      }
      setData(rows as TrainingExample[]);
      setTotal(rows.length);
      // Article stats
      const articleMap: Record<string, number> = {};
      const stewardMap: Record<string, number> = {};
      const weekMap: Record<string, number> = {};
      rows.forEach((row: TrainingExample) => {
        // Article extraction
        extractArticles(row?.steward_correction)?.forEach(a => {
          articleMap[a] = (articleMap[a] || 0) + 1;
        });
        // Steward
        const email = row?.steward_email || 'Unknown';
        stewardMap[email] = (stewardMap[email] || 0) + 1;
        // Week
        if (row?.created_at) {
          const week = row.created_at.slice(0, 10); // YYYY-MM-DD
          weekMap[week] = (weekMap[week] || 0) + 1;
        }
      });
      setArticleCounts(articleMap);
      setStewardCounts(stewardMap);
      setWeeklyCounts(weekMap);
      setLoading(false);
    }
    fetchData();
  }, [showMisuse]);

  // Misuse detection (client-side fallback)
  function isPotentialMisuse(row: TrainingExample): boolean {
    if (!row?.steward_correction || row.steward_correction.trim() === '') return true;
    if (/no violation/i.test(row.steward_correction)) return true;
    return !!row.potential_misuse;
  }

  // Defensive helpers for chart/table
  const sortedStewards = Object.entries(stewardCounts || {})
    .filter(([email]) => !!email)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const sortedArticles = Object.entries(articleCounts || {})
    .filter(([art]) => !!art)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const chartLabels = Object.keys(weeklyCounts || {});
  const chartData = Object.values(weeklyCounts || {});

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto text-gray-100">
      <h1 className="text-2xl font-bold mb-4">AI Feedback Analytics</h1>
      {error && <div className="text-red-400 mb-4">{error}</div>}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="bg-zinc-800 rounded p-4 flex-1 min-w-[180px]">
          <div className="text-lg font-semibold">Total Corrections</div>
          <div className="text-3xl">{total}</div>
        </div>
        <div className="bg-zinc-800 rounded p-4 flex-1 min-w-[180px]">
          <div className="text-lg font-semibold">Most Active Stewards</div>
          <ul className="text-sm mt-2">
            {sortedStewards.length === 0 && <li className="text-zinc-400">No data</li>}
            {sortedStewards.map(([email, count]) => (
              <li key={email}>{email}: <b>{count}</b></li>
            ))}
          </ul>
        </div>
        <div className="bg-zinc-800 rounded p-4 flex-1 min-w-[180px]">
          <div className="text-lg font-semibold">Top Articles</div>
          <ul className="text-sm mt-2">
            {sortedArticles.length === 0 && <li className="text-zinc-400">No data</li>}
            {sortedArticles.map(([art, count]) => (
              <li key={art}>{art}: <b>{count}</b></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold">Corrections per Day</span>
        </div>
        <div className="bg-zinc-900 rounded p-2">
          {chartLabels.length === 0 ? (
            <div className="text-zinc-400 text-center py-8">No data</div>
          ) : (
            <Bar
              data={{
                labels: chartLabels,
                datasets: [{
                  label: 'Corrections',
                  data: chartData,
                  backgroundColor: '#6366f1',
                }],
              }}
              options={{
                plugins: { legend: { display: false } },
                scales: { x: { ticks: { color: '#fff' } }, y: { ticks: { color: '#fff' } } },
                responsive: true,
                maintainAspectRatio: false,
              }}
              height={180}
            />
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Button variant={showMisuse ? undefined : 'outline'} onClick={() => setShowMisuse(v => !v)}>
          {showMisuse ? 'Show All' : 'Show Flagged Misuse'}
        </Button>
      </div>
      <div className="overflow-x-auto bg-zinc-900 rounded">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-zinc-800">
              <th className="p-2">Date</th>
              <th className="p-2">Steward</th>
              <th className="p-2">Original Query</th>
              <th className="p-2">Correction</th>
              <th className="p-2">Misuse?</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(data) && data.length > 0 ? data.map(row => (
              <tr key={row.id} className={isPotentialMisuse(row) ? 'bg-yellow-900/30' : ''}>
                <td className="p-2 whitespace-nowrap">{row?.created_at?.slice(0, 10) || '—'}</td>
                <td className="p-2">{row?.steward_email || 'Unknown'}</td>
                <td className="p-2 max-w-xs truncate" title={row?.original_query || ''}>{row?.original_query || '—'}</td>
                <td className="p-2 max-w-xs truncate" title={row?.steward_correction || ''}>{row?.steward_correction || <span className="text-zinc-400">(empty)</span>}</td>
                <td className="p-2 text-center">
                  {isPotentialMisuse(row) && <span title="Potential misuse" className="text-yellow-400 text-xl">⚠️</span>}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="text-center text-zinc-400 py-8">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {loading && <div className="text-center py-8 text-zinc-400">Loading...</div>}
    </div>
  );
}
