'use client';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
// @ts-expect-error: html2pdf.js has no types, see types/html2pdf.d.ts
import html2pdf from "html2pdf.js";
import Link from "next/link";

interface Grievance {
  id: string;
  case_number?: string;
  title?: string;
  step1_created_at?: string;
  step2_escalated_at?: string;
  step1_memo?: string;
  step1_denial?: string;
  step2_memo?: string;
  grievance_notes?: string;
  memo_feedback?: string;
  updated_by_user_id?: string;
  updated_at?: string;
  created_by_user_id?: string;
  local_id?: string;
  status?: string;
}

export default function HistoryViewer() {
  const { user } = useUser();
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [fileCounts, setFileCounts] = useState<{ [id: string]: number }>({});

  useEffect(() => {
    async function fetchGrievances() {
      if (!user) return;
      setLoading(true);
      const supabase = getSupabaseClient();
      // Fetch user role and local_id
      const { data: userData } = await supabase
        .from('users')
        .select('role, local_id')
        .eq('id', user.id)
        .single();
      // Default: only show grievances created by this user, newest first
      let query = supabase
        .from('grievances')
        .select('*')
        .eq('created_by_user_id', user.id)
        .order('step1_created_at', { ascending: false });
      if (userData?.role === 'admin') {
        // Admin: only their local
        query = supabase
          .from('grievances')
          .select('*')
          .eq('local_id', userData.local_id)
          .order('step1_created_at', { ascending: false });
      } else if (userData?.role === 'steward') {
        query = supabase
          .from('grievances')
          .select('*')
          .eq('local_id', userData.local_id)
          .order('step1_created_at', { ascending: false });
      }
      const { data } = await query;
      setGrievances(data || []);
      setLoading(false);
    }
    fetchGrievances();
  }, [user]);

  useEffect(() => {
    if (!grievances.length) return;
    async function fetchFileCounts() {
      const counts: { [id: string]: number } = {};
      await Promise.all(grievances.map(async (g) => {
        if (!g.id) return;
        const supabase = getSupabaseClient();
        const { data } = await supabase.storage
          .from("grievance_files")
          .list(`grievance_files/${g.id}`);
        counts[g.id] = data?.length || 0;
      }));
      setFileCounts(counts);
    }
    fetchFileCounts();
  }, [grievances]);

  function handleExportPDF(memoText: string, caseId: string) {
    const element = document.createElement("div");
    element.innerHTML = memoText;
    html2pdf()
      .from(element)
      .set({
        margin: 0.5,
        filename: `${caseId}_memo.pdf`,
        jsPDF: { format: "letter", orientation: "portrait" },
      })
      .save();
  }

  const filteredGrievances = grievances.filter(g =>
    statusFilter === 'all' ? true : g.status === statusFilter
  );

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Grievance History</h1>
      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6 items-center">
        {['all', 'draft', 'step1', 'step2'].map(status => (
          <button
            key={status}
            className={`px-3 py-1 rounded text-sm font-semibold border ${statusFilter === status ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-300 border-blue-400'} transition`}
            onClick={() => setStatusFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>
      {/* Grievance Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case #</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Files</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredGrievances.map(g => (
              <tr key={g.id}>
                <td className="px-4 py-2 whitespace-nowrap">{g.case_number || g.id}</td>
                <td className="px-4 py-2 whitespace-nowrap">{g.title || '-'}</td>
                <td className="px-4 py-2 whitespace-nowrap">{g.status || '-'}</td>
                <td className="px-4 py-2 whitespace-nowrap">{fileCounts[g.id] || 0}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {g.step1_memo && (
                    <button
                      className="text-blue-600 underline text-sm mr-2"
                      onClick={() => handleExportPDF(g.step1_memo || '', g.case_number || g.id)}
                    >
                      Export Step 1 PDF
                    </button>
                  )}
                  {g.step2_memo && (
                    <button
                      className="text-blue-600 underline text-sm"
                      onClick={() => handleExportPDF(g.step2_memo || '', g.case_number || g.id)}
                    >
                      Export Step 2 PDF
                    </button>
                  )}
                  <Link href={`/dashboard/history/${g.id}`} className="ml-2 text-blue-500 underline text-sm">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
