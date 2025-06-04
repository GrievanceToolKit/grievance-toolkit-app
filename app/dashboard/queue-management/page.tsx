import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';

interface TrainingExample {
  id: string;
  original_query: string;
  original_response: string;
  steward_correction: string;
  steward_email: string;
  created_at: string;
  applied_to_model: boolean;
  bulk_applied?: boolean;
  source_log_id?: string;
}

export default function QueueManagementPage() {
  const [corrections, setCorrections] = useState<TrainingExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkStatus, setBulkStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchCorrections() {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_training_queue')
        .select('*')
        .eq('applied_to_model', false)
        .order('created_at', { ascending: false });
      setCorrections(data || []);
      setLoading(false);
    }
    fetchCorrections();
  }, []);

  async function handleBulkApply(correctionId: string) {
    setBulkStatus(s => ({ ...s, [correctionId]: 'Applying...' }));
    const res = await fetch('/api/bulk-override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correctionId }),
    });
    const result = await res.json();
    setBulkStatus(s => ({ ...s, [correctionId]: result.applied ? `Applied to ${result.applied}` : result.message || 'No matches' }));
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto text-gray-100">
      <h1 className="text-2xl font-bold mb-4">Correction Queue Management</h1>
      {loading ? (
        <div className="text-center text-zinc-400 py-8">Loading...</div>
      ) : (
        <div className="overflow-x-auto bg-zinc-900 rounded">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-zinc-800">
                <th className="p-2">Date</th>
                <th className="p-2">Steward</th>
                <th className="p-2">Original Query</th>
                <th className="p-2">Correction</th>
                <th className="p-2">Bulk Override</th>
              </tr>
            </thead>
            <tbody>
              {corrections.length === 0 && (
                <tr><td colSpan={5} className="text-center text-zinc-400 py-8">No unreviewed corrections</td></tr>
              )}
              {corrections.map(row => (
                <tr key={row.id}>
                  <td className="p-2 whitespace-nowrap">{row.created_at?.slice(0,10) || '—'}</td>
                  <td className="p-2">{row.steward_email || 'Unknown'}</td>
                  <td className="p-2 max-w-xs truncate" title={row.original_query}>{row.original_query || '—'}</td>
                  <td className="p-2 max-w-xs truncate" title={row.steward_correction}>{row.steward_correction || <span className="text-zinc-400">(empty)</span>}</td>
                  <td className="p-2 text-center">
                    <Button size="sm" onClick={() => handleBulkApply(row.id)} disabled={!!bulkStatus[row.id]}>
                      {bulkStatus[row.id] ? bulkStatus[row.id] : 'Apply to All Similar'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
