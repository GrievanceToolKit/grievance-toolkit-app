'use client';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function AIAnalysisPage() {
  const [input, setInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ memo?: string } | null>(null);

  const handleSubmit = async () => {
    if (!input.trim()) {
      toast.error('Please describe the issue.');
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    // Generate summary from first 100 chars, remove line breaks
    const summary = input.slice(0, 100).replace(/\r?\n|\r/g, ' ');
    try {
      const res = await fetch('/api/grievance-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, description: input }),
      });
      const data = await res.json();
      if (res.ok && data) {
        setAiResult({
          memo: data.memo || '',
        });
      } else {
        toast.error(data.error || 'AI analysis failed');
      }
    } catch {
      toast.error('AI analysis failed');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">🔍 Analyze Workplace Issue</h1>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Describe the issue you’re facing..."
        className="w-full p-4 border rounded mb-4 bg-white dark:bg-gray-800 dark:text-white"
        rows={6}
      />
      <button
        onClick={handleSubmit}
        className="px-6 py-3 bg-purple-600 text-white rounded hover:bg-purple-700"
        disabled={aiLoading}
      >
        {aiLoading ? 'Analyzing...' : 'Run AI Analysis'}
      </button>
      {aiResult?.memo && (
        <div className="bg-blue-900 text-white p-6 rounded-md mt-6">
          <h2 className="text-xl font-bold mb-4">📄 AI Arbitration-Ready Memo</h2>
          {aiResult.memo.split(/\*\*(\d\.\s.+?)\*\*/g).map((chunk, idx) => {
            if (chunk.match(/^\d\.\s/)) {
              return (
                <h3 key={idx} className="text-lg font-semibold mt-4 text-blue-200">{chunk}</h3>
              );
            }
            return <p key={idx} className="whitespace-pre-wrap text-white">{chunk.trim()}</p>;
          })}
        </div>
      )}
      <details className="mt-4">
        <summary className="text-sm text-gray-500 cursor-pointer">Debug: Raw AI Output</summary>
        <pre className="text-xs bg-gray-50 text-gray-600 p-4 rounded mt-2 border">
          {JSON.stringify(aiResult, null, 2)}
        </pre>
      </details>
    </div>
  );
}
