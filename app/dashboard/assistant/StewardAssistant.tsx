"use client";

import React, { useState } from "react";

interface Violation {
  article: string;
  title: string;
  reason: string;
}

interface AIResponse {
  memo: string;
  violations: Violation[];
}

export function StewardAssistant() {
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiResponse, setAIResponse] = useState<AIResponse | null>(null);

  // Debug logs
  console.log("[StewardAssistant] summary:", summary);
  console.log("[StewardAssistant] description:", description);
  console.log("[StewardAssistant] files:", files);
  console.log("[StewardAssistant] aiResponse:", aiResponse);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).slice(0, 3);
      setFiles(selectedFiles);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAIResponse(null);
    try {
      const formData = new FormData();
      formData.append("summary", summary);
      formData.append("description", description);
      files.forEach((file, idx) => formData.append(`file${idx+1}`, file));
      const res = await fetch("/api/grievance-analysis", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to get AI analysis");
      const data = await res.json();
      setAIResponse(data);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Steward Assistant</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <label className="block font-medium">Attach Files (PDF/DOCX, max 3)</label>
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
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? "Analyzing..." : "Submit"}
        </button>
      </form>
      {error && <div className="mt-4 text-red-600">Error: {error}</div>}
      <div className="mt-6">
        <h3 className="font-semibold mb-2">AI Memo</h3>
        {loading && <div>Loading AI response...</div>}
        {!loading && aiResponse?.memo && (
          <pre className="bg-gray-100 p-3 rounded whitespace-pre-wrap">{aiResponse.memo}</pre>
        )}
        {!loading && !aiResponse?.memo && <div className="text-gray-500">No memo generated yet.</div>}
      </div>
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Violations</h3>
        {!loading && aiResponse?.violations && aiResponse.violations.length > 0 ? (
          <ul className="list-disc pl-5">
            {aiResponse.violations.map((v, idx) => (
              <li key={idx} className="mb-2">
                <span className="font-bold">{v.article}:</span> {v.title}
                <div className="text-gray-600 text-sm">{v.reason}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500">No violations detected.</div>
        )}
      </div>
    </div>
  );
}
