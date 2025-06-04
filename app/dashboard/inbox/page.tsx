"use client";
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function StewardInbox() {
  const { user } = useUser();
  const router = useRouter();
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [memberInfo, setMemberInfo] = useState<Record<string, { name: string; email: string }>>({});

  useEffect(() => {
    async function fetchInbox() {
      setLoading(true);
      let query = supabase
        .from('union_links')
        .select('*')
        .eq('forwarded_to_user_id', user?.id)
        .order('created_at', { ascending: false });
      if (!showArchived) query = query.eq('archived_at', null);
      const { data, error } = await query;
      setLinks(data || []);
      setLoading(false);
      // Fetch member info for all unique created_by_user_id
      if (data) {
        const ids = Array.from(new Set(data.map((l: any) => l.created_by_user_id).filter(Boolean)));
        if (ids.length) {
          const { data: users } = await supabase.from('users').select('id, first_name, last_name, email').in('id', ids);
          const info: Record<string, { name: string; email: string }> = {};
          users?.forEach((u: any) => {
            info[u.id] = { name: `${u.first_name || ''} ${u.last_name || ''}`.trim(), email: u.email };
          });
          setMemberInfo(info);
        }
      }
    }
    if (user?.id) fetchInbox();
  }, [user?.id, showArchived]);

  // Update: markSeen logs seen_at timestamp
  const markSeen = async (id: string) => {
    await supabase.from('union_links')
      .update({ seen_at: new Date().toISOString() })
      .eq('id', id)
      .eq('forwarded_to_user_id', user?.id);
    setLinks(links => links.map(l => l.id === id ? { ...l, seen_at: new Date().toISOString() } : l));
  };

  const archiveLink = async (id: string) => {
    await supabase
      .from('union_links')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .eq('forwarded_to_user_id', user?.id);
    setLinks(links => links.map(l => l.id === id ? { ...l, archived_at: new Date().toISOString() } : l));
    toast.success('✅ Case archived');
  };

  if (loading) return <div className="p-8 text-gray-500">Loading inbox...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">📨 Received Grievance Alerts</h2>
        <button
          className="text-blue-600 underline text-sm"
          onClick={() => setShowArchived(a => !a)}
        >
          {showArchived ? 'Show Active' : 'Show Archived'}
        </button>
      </div>
      {links.length === 0 && <div className="text-gray-500">No cases found.</div>}
      {links.map(link => {
        // Status logic
        let status = 'new', badge = '🆕 New', badgeClass = 'bg-blue-100 text-blue-800', timeLabel = '', borderClass = 'border-blue-300 bg-blue-50';
        if (link.archived_at) {
          status = 'archived'; badge = '📦 Archived'; badgeClass = 'bg-gray-200 text-gray-600'; borderClass = 'border-gray-300 bg-gray-200 opacity-60';
          timeLabel = link.archived_at ? `📦 Archived: ${formatDistanceToNow(new Date(link.archived_at), { addSuffix: true })}` : '';
        } else if (link.responded_at) {
          status = 'responded'; badge = '📤 Responded'; badgeClass = 'bg-green-100 text-green-800'; borderClass = 'border-green-300 bg-green-50';
          timeLabel = link.responded_at ? `📤 Responded: ${formatDistanceToNow(new Date(link.responded_at), { addSuffix: true })}` : '';
        } else if (link.seen_at) {
          status = 'seen'; badge = '👀 Seen'; badgeClass = 'bg-yellow-100 text-yellow-800'; borderClass = 'border-yellow-300 bg-yellow-50';
          timeLabel = link.seen_at ? `🕓 Viewed: ${formatDistanceToNow(new Date(link.seen_at), { addSuffix: true })}` : '';
        }

        return (
          <div
            key={link.id}
            className={cn('mb-4 p-4 rounded shadow border transition-all', borderClass)}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold text-lg">{link.grievance_summary}</div>
                <div className="text-gray-600 text-sm mt-1">{new Date(link.created_at).toLocaleString()}</div>
                {memberInfo[link.created_by_user_id] && (
                  <div className="text-xs text-gray-500 mt-1">👤 Submitted by: {memberInfo[link.created_by_user_id].name} ({memberInfo[link.created_by_user_id].email})</div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${badgeClass}`}>{badge}</span>
                {timeLabel && <span className="text-xs text-gray-500">{timeLabel}</span>}
              </div>
            </div>
            <button
              className="mt-2 text-blue-600 underline text-sm"
              onClick={() => {
                setExpanded(expanded === link.id ? null : link.id);
                if (!link.seen_at) markSeen(link.id);
              }}
            >
              {expanded === link.id ? 'Hide Details' : 'View Details'}
            </button>
            {expanded === link.id && (
              <div className="mt-3 bg-white border rounded p-3">
                <div className="mb-2"><span className="font-semibold">Description:</span> {link.grievance_description}</div>
                <div className="mb-2"><span className="font-semibold">Grievance ID:</span> {link.grievance_id}</div>
                <div className="mb-2"><span className="font-semibold">Local ID:</span> {link.local_id}</div>
                <div className="mb-2"><span className="font-semibold">Seen:</span> {link.seen_at ? new Date(link.seen_at).toLocaleString() : <span className="text-red-500">Not yet viewed</span>}</div>
                <button
                  className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-60"
                  disabled={!!link.archived_at || loading}
                  onClick={async () => {
                    setLoading(true);
                    const res = await fetch('/api/unionlink-to-step1', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ unionLinkId: link.id }),
                    });
                    const data = await res.json();
                    setLoading(false);
                    if (data.grievanceId) {
                      toast.success('🎯 Step 1 Started');
                      router.push(`/grievances/${data.grievanceId}`);
                    }
                  }}
                >
                  {loading ? 'Loading...' : 'Start Step 1'}
                </button>
              </div>
            )}
            <button
              className="mt-2 bg-gray-500 text-white px-3 py-1 rounded disabled:opacity-50"
              disabled={!!link.archived_at || loading}
              onClick={async () => {
                setLoading(true);
                await archiveLink(link.id);
                setLoading(false);
              }}
            >
              {loading ? 'Archiving...' : '📦 Archive'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
