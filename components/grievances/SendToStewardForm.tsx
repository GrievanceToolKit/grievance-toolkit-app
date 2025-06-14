"use client";
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { sendUnionLinkEmail } from '@/lib/sendUnionLinkEmail';

interface Steward {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export default function SendToStewardForm({ grievanceId, localId, grievanceSummary, grievanceDescription }: {
  grievanceId: string;
  localId: string;
  grievanceSummary: string;
  grievanceDescription: string;
}) {
  const { user } = useUser();
  const [stewards, setStewards] = useState<Steward[]>([]);
  const [selectedSteward, setSelectedSteward] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchStewards() {
      setLoading(true);
      const supabase = createClientComponentClient();
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('local_id', localId)
        .eq('role', 'steward');
      if (error) setError('Failed to load stewards.');
      setStewards(data || []);
      setLoading(false);
      if (data && data.length === 1) setSelectedSteward(data[0].id);
    }
    fetchStewards();
  }, [localId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess(false);
    if (!selectedSteward) {
      setError('Please select a steward.');
      setSubmitting(false);
      return;
    }
    const supabase = createClientComponentClient();
    const { error } = await supabase.from('union_links').insert({
      created_by_user_id: user?.id,
      forwarded_to_user_id: selectedSteward,
      grievance_summary: grievanceSummary,
      grievance_description: grievanceDescription,
      local_id: localId,
      grievance_id: grievanceId,
    });
    if (error) {
      setError('Failed to send to steward.');
      setSubmitting(false);
      return;
    }
    // Find steward email
    const steward = stewards.find(s => s.id === selectedSteward);
    const stewardEmail = steward?.email;
    const fromName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Union Member';
    if (stewardEmail) {
      try {
        await sendUnionLinkEmail({
          to: stewardEmail,
          fromName,
          summary: grievanceSummary,
        });
      } catch {
        setError('Grievance sent, but failed to send email notification.');
        setSubmitting(false);
        setSuccess(true);
        return;
      }
    }
    setSuccess(true);
    setSubmitting(false);
  };

  return (
    <form className="bg-white p-6 rounded shadow max-w-lg mx-auto" onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold mb-4">Send to Steward</h2>
      <div className="mb-4">
        <label className="block font-semibold mb-1">Select Steward</label>
        {loading ? (
          <div className="text-gray-500">Loading stewards...</div>
        ) : (
          <select
            className="w-full border rounded px-3 py-2"
            value={selectedSteward || ''}
            onChange={e => setSelectedSteward(e.target.value)}
            disabled={stewards.length === 1}
          >
            <option value="">-- Select --</option>
            {stewards.map(s => (
              <option key={s.id} value={s.id}>
                {s.first_name || ''} {s.last_name || ''} ({s.email})
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="mb-4">
        <label className="block font-semibold mb-1">Summary</label>
        <div className="bg-gray-100 p-2 rounded text-gray-700 whitespace-pre-wrap">{grievanceSummary}</div>
      </div>
      <div className="mb-4">
        <label className="block font-semibold mb-1">Description</label>
        <div className="bg-gray-100 p-2 rounded text-gray-700 whitespace-pre-wrap">{grievanceDescription}</div>
      </div>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {success && <div className="text-green-600 mb-2">Sent to steward!</div>}
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-60"
        disabled={submitting || success}
      >
        {submitting ? 'Sending...' : 'Send to Steward'}
      </button>
    </form>
  );
}
