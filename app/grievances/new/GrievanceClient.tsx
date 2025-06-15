'use client';

import React, { useState } from 'react';
import { ViolationsList } from '@/components/ViolationsList';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface Violation {
  article_number: string;
  article_title: string;
  violation_reason: string;
}

interface AIResponse {
  memo: string;
  violations: Violation[];
}

const USPS_CRAFTS = [
  'Clerk',
  'BEM',
  'Custodian',
  'MVS',
  'Maintenance',
  'Mail Handler',
  'Other',
];

export default function GrievanceClient() {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memo, setMemo] = useState('');
  const [violations, setViolations] = useState<Violation[]>([]);
  const [grievanceNumber, setGrievanceNumber] = useState('');
  const [grievanceType, setGrievanceType] = useState<'Individual' | 'Class Action'>('Individual');
  const [employeeName, setEmployeeName] = useState('');
  const [uspsCraft, setUspsCraft] = useState('');
  const [facility, setFacility] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();

  // Debug logs
  console.log('[GrievanceClient] summary:', summary);
  console.log('[GrievanceClient] description:', description);
  console.log('[GrievanceClient] files:', files);
  console.log('[GrievanceClient] memo:', memo);
  console.log('[GrievanceClient] violations:', violations);
  console.log('[GrievanceClient] grievanceNumber:', grievanceNumber);
  console.log('[GrievanceClient] grievanceType:', grievanceType);
  console.log('[GrievanceClient] employeeName:', employeeName);
  console.log('[GrievanceClient] uspsCraft:', uspsCraft);
  console.log('[GrievanceClient] facility:', facility);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).slice(0, 6);
      setFiles(selectedFiles);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMemo('');
    setViolations([]);
    try {
      const formData = new FormData();
      formData.append('summary', summary);
      formData.append('description', description);
      if (grievanceNumber) formData.append('grievance_number', grievanceNumber);
      formData.append('grievance_type', grievanceType);
      if (grievanceType === 'Individual') {
        if (employeeName) formData.append('employee_name', employeeName);
        if (uspsCraft) formData.append('usps_craft', uspsCraft);
        if (facility) formData.append('facility', facility);
      }
      files.forEach((file, idx) => formData.append(`file${idx+1}`, file));
      const res = await fetch('/api/grievance-analysis', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to get AI analysis');
      const data = await res.json();
      setMemo(data.memo || '');
      setViolations(data.violations || []);
      console.log('🧠 Violations received:', data.violations);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/grievances/submit-final', {
        method: 'POST',
        body: JSON.stringify({
          summary,
          description,
          case_number: grievanceNumber,
          grievance_type: grievanceType,
          employee_name: employeeName,
          craft: uspsCraft,
          building: facility,
          memo,
          violations,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        toast.success('✅ Grievance submitted successfully!');
        setSubmitted(true);
        // router.push('/dashboard/history');
      } else {
        const err = await res.json();
        toast.error('❌ Submission failed: ' + (err?.error || 'Unknown error'));
      }
    } catch (err: any) {
      toast.error('❌ Submission error: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('memo-section');
    if (element) {
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      html2pdf().from(element).save();
      console.log('[PDF Export] Finished generating grievance PDF');
    } else {
      console.error('[PDF Export] #memo-section not found');
    }
  };

  const handleGenerateRFI = () => {
    // Placeholder: implement RFI template logic as needed
    alert('RFI template generation coming soon!');
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Grievance Assistant</h2>
      <form onSubmit={handleAnalyze} className="space-y-4">
        <div>
          <label className="block font-medium">Grievance Number (e.g., GT-001-2025) <span className="text-gray-400 text-xs">(optional)</span></label>
          <input
            className="w-full border rounded p-2"
            value={grievanceNumber}
            onChange={e => setGrievanceNumber(e.target.value)}
            placeholder="GT-001-2025"
            type="text"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Grievance Type</label>
          <div className="flex gap-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                checked={grievanceType === 'Individual'}
                onChange={() => setGrievanceType('Individual')}
              />
              <span className="ml-2">Individual</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                checked={grievanceType === 'Class Action'}
                onChange={() => setGrievanceType('Class Action')}
              />
              <span className="ml-2">Class Action</span>
            </label>
          </div>
        </div>
        {grievanceType === 'Individual' && (
          <div className="space-y-2">
            <div>
              <label className="block font-medium">Employee Name</label>
              <input
                className="w-full border rounded p-2"
                value={employeeName}
                onChange={e => setEmployeeName(e.target.value)}
                placeholder="Employee Name"
                type="text"
              />
            </div>
            <div>
              <label className="block font-medium">USPS Craft</label>
              <select
                className="w-full border rounded p-2"
                value={uspsCraft}
                onChange={e => setUspsCraft(e.target.value)}
              >
                <option value="">Select Craft</option>
                {USPS_CRAFTS.map(craft => (
                  <option key={craft} value={craft}>{craft}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium">Building/Facility</label>
              <input
                className="w-full border rounded p-2"
                value={facility}
                onChange={e => setFacility(e.target.value)}
                placeholder="Facility Name or Location"
                type="text"
              />
            </div>
          </div>
        )}
        <div>
          <label className="block font-medium">Summary</label>
          <textarea
            className="w-full border rounded p-2"
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="Short overview of the issue"
            required
          />
        </div>
        <div>
          <label className="block font-medium">Description</label>
          <textarea
            className="w-full border rounded p-2"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Detailed explanation"
            required
          />
        </div>
        <div>
          <label className="block font-medium">Attach Files (PDF/DOCX, max 6)</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            multiple
            onChange={handleFileChange}
            className="block mt-1"
          />
          {files.length > 0 && (
            <ul className="mt-2 text-sm text-gray-600">
              {files.map((file, idx) => (
                <li key={idx}>{file.name}</li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
          disabled={loading}
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </form>
      {error && <div className="mt-4 text-red-600">Error: {error}</div>}
      <div className="mt-6">
        <h3 className="font-semibold mb-2">AI Memo</h3>
        {loading && <div>Loading AI response...</div>}
        {!loading && memo && (
          <div id="memo-section">
            <pre className="bg-gray-100 p-3 rounded whitespace-pre-wrap">{memo}
{violations && violations.length > 0 && (
  '\n\nDetected Violations:\n' + violations.map(v => `• ${v.article_number} – ${v.article_title}: ${v.violation_reason}`).join('\n')
)}</pre>
          </div>
        )}
        {!loading && !memo && <div className="text-gray-500">No memo generated yet.</div>}
      </div>
      {!loading && memo && (
        <div className="flex flex-col md:flex-row gap-2 mt-4">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex-1 disabled:opacity-50"
            onClick={handleFinalSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : '💾 Submit Grievance'}
          </button>
          <button
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 flex-1"
            onClick={handleDownloadPDF}
            type="button"
          >
            📄 Download PDF
          </button>
          <button
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 flex-1"
            onClick={handleGenerateRFI}
            type="button"
          >
            📎 Generate RFI
          </button>
        </div>
      )}
      {!loading && submitted && (
        <button
          className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 w-full mt-4"
          onClick={() => router.push('/step2')}
          type="button"
        >
          🚀 Escalate to Step 2
        </button>
      )}
      {!loading && <ViolationsList violations={violations} />}
    </div>
  );
}
