"use client";
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { daysRemaining } from '@/lib/daysRemaining';
// @ts-ignore
import html2pdf from "html2pdf.js";
import Link from "next/link";

export default function GrievanceHistoryPage() {
  const { user } = useUser();
  const [grievances, setGrievances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [fileCounts, setFileCounts] = useState<{ [id: string]: number }>({});
  const [adminView, setAdminView] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userLocalId, setUserLocalId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGrievances() {
      if (!user) return;
      setLoading(true);
      // Fetch user role and local_id
      const { data: userData } = await supabase
        .from('users')
        .select('role, local_id')
        .eq('id', user.id)
        .single();
      setIsAdmin(userData?.role === 'admin');
      setUserLocalId(userData?.local_id || null);
      // Default: only show grievances created by this user, newest first
      let query = supabase
        .from('grievances')
        .select('*')
        .eq('created_by_user_id', user.id)
        .order('step1_created_at', { ascending: false });
      if (userData?.role === 'admin') {
        if (adminView) {
          // Admin: see all grievances (no filter)
          query = supabase.from('grievances').select('*').order('step1_created_at', { ascending: false });
        } else {
          // Admin: only their local
          query = supabase
            .from('grievances')
            .select('*')
            .eq('local_id', userData.local_id)
            .order('step1_created_at', { ascending: false });
        }
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
  }, [user, adminView]);

  useEffect(() => {
    if (!grievances.length) return;
    async function fetchFileCounts() {
      const counts: { [id: string]: number } = {};
      await Promise.all(grievances.map(async (g) => {
        if (!g.id) return;
        const { data, error } = await supabase.storage
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
            className={`px-4 py-2 rounded border ${statusFilter === status ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setStatusFilter(status)}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
        {isAdmin && (
          <button
            className={`ml-4 px-4 py-2 rounded border ${adminView ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => setAdminView(v => !v)}
          >
            {adminView ? 'Admin: All Locals' : 'Admin: My Local'}
          </button>
        )}
        {isAdmin && adminView && (
          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">Admin View</span>
        )}
      </div>
      {filteredGrievances.length === 0 && <div className="text-gray-500">No grievances found.</div>}
      {filteredGrievances.map((g) => (
        <div key={g.id} className="p-4 border rounded mb-4 bg-white shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold mb-1">{g.title || `Grievance ${g.case_number || g.id.slice(0, 8)}`}</h3>
              <p className="font-medium text-blue-800">
                Case #: {g.case_number || '–'}
              </p>
              <p className="text-sm text-gray-500">Filed: {g.step1_created_at ? new Date(g.step1_created_at).toLocaleDateString() : 'N/A'}</p>
              <p className="text-sm text-gray-500">📁 Files: {fileCounts[g.id] ?? '...'}</p>
            </div>
            <span className={
              g.status === 'draft' ? 'text-yellow-700' :
              g.status === 'step1' ? 'text-blue-700' :
              g.status === 'step2' ? 'text-green-700' : 'text-gray-600'
            }>
              {g.status === 'draft' ? '🟡 Draft' :
               g.status === 'step1' ? '📤 Step 1 Filed' :
               g.status === 'step2' ? '🚀 Step 2 Escalated' : '📁 Archived'}
            </span>
          </div>

          <div className="mt-2">
            <p className="text-sm text-gray-700">Days left to escalate: {g.step1_created_at ? daysRemaining(g.step1_created_at, 14) : 'N/A'}</p>
            {g.step2_escalated_at && (
              <p className="text-sm text-blue-700">Days left to resolve Step 2: {daysRemaining(g.step2_escalated_at, 7)}</p>
            )}
          </div>

          <div className="mt-2">
            <p className="text-sm font-semibold">Summary:</p>
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-2 border rounded max-h-48 overflow-y-auto">
              {g.memo?.slice(0, 500) || 'No memo available.'}
            </pre>
          </div>

          <div className="mt-2 flex gap-2">
            {g.memo && (
              <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                onClick={() => handleExportPDF(g.memo, g.case_number || g.id)}>
                📄 Download Memo PDF
              </button>
            )}
            <Link
              href={`/grievance/details?id=${g.id}`}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              View Details
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
