'use client';
import { useState } from 'react';

export default function WitnessFormPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    grievanceId: '',
    statement: '',
    file: null as File | null,
  });
  const [showForward, setShowForward] = useState(false);
  const [stewardEmail, setStewardEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setForm({ ...form, file });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowForward(true);
  };

  const handleForward = async () => {
    setLoading(true);
    setEmailStatus(null);
    try {
      // Generate PDF (simulate for now)
      const pdfBuffer = btoa('PDF witness statement');
      const res = await fetch('/api/witness/forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberName: form.name,
          stewardEmail,
          pdfBuffer,
        }),
      });
      const data = await res.json();
      if (res.ok) setEmailStatus('Email sent successfully!');
      else setEmailStatus(data.error || 'Failed to send email');
    } catch {
      setEmailStatus('Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">📝 Submit Witness Statement</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Your Name"
          value={form.name}
          onChange={handleChange}
          className="w-full px-4 py-2 border rounded dark:bg-gray-800 dark:text-white"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Your Email"
          value={form.email}
          onChange={handleChange}
          className="w-full px-4 py-2 border rounded dark:bg-gray-800 dark:text-white"
          required
        />
        <input
          type="text"
          name="grievanceId"
          placeholder="Grievance Reference Number (optional)"
          value={form.grievanceId}
          onChange={handleChange}
          className="w-full px-4 py-2 border rounded dark:bg-gray-800 dark:text-white"
        />
        <textarea
          name="statement"
          placeholder="Describe what you witnessed..."
          value={form.statement}
          onChange={handleChange}
          rows={6}
          className="w-full px-4 py-2 border rounded dark:bg-gray-800 dark:text-white"
          required
        />
        <input
          type="file"
          name="file"
          onChange={handleFileChange}
          className="w-full px-4 py-2 border rounded dark:bg-gray-800 dark:text-white"
          accept=".pdf,.doc,.docx,.jpg,.png"
        />
        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
        >
          Submit Statement
        </button>
      </form>
      {showForward && (
        <div className="mt-6 bg-white dark:bg-gray-900 rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-2">Would you like to forward this to your steward?</h2>
          <input
            type="email"
            placeholder="Steward Email Address"
            value={stewardEmail}
            onChange={e => setStewardEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded dark:bg-gray-800 dark:text-white mb-2"
            required
          />
          <button
            onClick={handleForward}
            className="py-2 px-4 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Forward to Steward'}
          </button>
          {emailStatus && <div className="mt-2 text-sm font-semibold text-blue-700">{emailStatus}</div>}
        </div>
      )}
    </div>
  );
}