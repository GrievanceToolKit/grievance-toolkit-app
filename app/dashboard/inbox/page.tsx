"use client";
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface GrievanceLink {
  id: string;
  grievance_summary: string;
  created_at: string;
  created_by_user_id: string;
  grievance_description?: string;
  grievance_id?: string;
  local_id?: string;
  seen_at?: string;
  archived_at?: string;
}

export default function StewardInbox() {
  const { user } = useUser();
  const [links, setLinks] = useState<GrievanceLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [memberInfo, setMemberInfo] = useState<Record<string, { name: string; email: string }>>({});

  useEffect(() => {
    async function fetchInbox() {
      setLoading(true);
      const supabase = getSupabaseClient();
      let query = supabase
        .from('union_links')
        .select('*')
        .eq('forwarded_to_user_id', user?.id)
        .order('created_at', { ascending: false });
      if (!showArchived) query = query.eq('archived_at', null);
      const { data } = await query;
      setLinks(data || []);
      setLoading(false);
      // Fetch member info for all unique created_by_user_id
      if (data) {
        const ids = Array.from(new Set(data.map((l: GrievanceLink) => l.created_by_user_id).filter(Boolean)));
        if (ids.length) {
          const { data: users } = await supabase.from('users').select('id, first_name, last_name, email').in('id', ids);
          const info: Record<string, { name: string; email: string }> = {};
          users?.forEach((u: { id: string; first_name: string; last_name: string; email: string }) => {
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
    const supabase = getSupabaseClient();
    await supabase.from('union_links')
      .update({ seen_at: new Date().toISOString() })
      .eq('id', id)
      .eq('forwarded_to_user_id', user?.id);
    setLinks(links => links.map(l => l.id === id ? { ...l, seen_at: new Date().toISOString() } : l));
  };

  const archiveLink = async (id: string) => {
    const supabase = getSupabaseClient();
    await supabase
      .from('union_links')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .eq('forwarded_to_user_id', user?.id);
    setLinks(links => links.map(l => l.id === id ? { ...l, archived_at: new Date().toISOString() } : l));
    toast.success('✅ Case archived');
  };

  if (loading) return <div className="p-8 text-gray-500">Loading inbox...</div>;

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
        return (
          <div
            key={link.id}
            className={cn('mb-4 p-4 rounded shadow border transition-all')}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold text-lg">{link.grievance_summary}</div>
                <div className="text-gray-600 text-sm mt-1">{new Date(link.created_at).toLocaleString()}</div>
                {memberInfo[link.created_by_user_id] && (
                  <div className="text-xs text-gray-500 mt-1">👤 Submitted by: {memberInfo[link.created_by_user_id].name} ({memberInfo[link.created_by_user_id].email})</div>
                )}
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
              <div className="mt-2">
                <div className="mb-2"><span className="font-semibold">Description:</span> {link.grievance_description}</div>
                <div className="mb-2"><span className="font-semibold">Grievance ID:</span> {link.grievance_id}</div>
                <div className="mb-2"><span className="font-semibold">Local ID:</span> {link.local_id}</div>
                <button
                  className="text-xs text-red-600 underline mt-2"
                  onClick={async () => {
                    await archiveLink(link.id);
                  }}
                >
                  Archive
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
