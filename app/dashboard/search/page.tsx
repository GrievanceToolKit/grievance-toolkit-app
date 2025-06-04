"use client";

import React, { useState } from 'react';

export default function GrievanceSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/grievance-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');

      setResults(data.results || []);
    } catch (err: any) {
      console.error('❌ Search error:', err);
      setError(err.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🔍 Grievance Search (AI RAG)</h1>

      <textarea
        className="w-full p-3 border rounded mb-4"
        rows={4}
        placeholder="Enter grievance scenario (e.g., surveillance in locker room, union not notified)..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <button
        onClick={handleSearch}
        disabled={loading || !query.trim()}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Searching...' : 'Search'}
      </button>

      {error && <p className="text-red-600 mt-4">⚠️ {error}</p>}

      {results.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Top Matches:</h2>
          {results.map((result, idx) => (
            <div key={idx} className="bg-white border rounded p-4 mb-4 shadow">
              <p className="font-medium mb-1 text-blue-900">{result.rewritten_summary}</p>
              <ul className="list-disc ml-6 text-sm text-gray-800">
                {result.violations.map((v: any, i: number) => (
                  <li key={i}>
                    <strong>{v.article_number}:</strong> {v.article_title} — {v.violation_reason}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
