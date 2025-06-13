"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { Button } from "@/components/ui/button"; // Import the Button component
// If you have custom UI components, import them here
// import { Input } from "@/components/ui/input";
// import { Card, CardContent } from "@/components/ui/card";

interface SearchLog {
  id: string;
  query: string;
  results: string[];
  created_at: string;
  steward_email?: string;
  flagged?: boolean;
  corrected_response?: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<SearchLog[]>([]);
  const [search, setSearch] = useState("");
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [logFeedback, setLogFeedback] = useState<Record<string, { flagged: boolean; correctedResponse: string; trainingExample: boolean }>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_KEY!
    );
    const { data, error } = await supabase
      .from("grievance_search_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Failed to fetch logs:", error);
    else setLogs(data as SearchLog[]);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.query.toLowerCase().includes(search.toLowerCase());
    const feedback = logFeedback[log.id];
    const isFlagged = feedback ? feedback.flagged : log.flagged;
    const matchesFlagged = showFlaggedOnly ? isFlagged : true;
    return matchesSearch && matchesFlagged;
  });

  const handleFeedbackChange = (id: string, field: keyof (typeof logFeedback)[string], value: unknown) => {
    setLogFeedback((prev) => ({
      ...prev,
      [id]: {
        flagged: field === 'flagged' ? value as boolean : prev[id]?.flagged || false,
        correctedResponse: field === 'correctedResponse' ? value as string : prev[id]?.correctedResponse || '',
        trainingExample: field === 'trainingExample' ? value as boolean : prev[id]?.trainingExample || false,
      },
    }));
  };

  const saveFeedbackToSupabase = async (logId: string) => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_KEY!
    );
    const feedback = logFeedback[logId];
    if (!feedback) return;
    setSaving((prev) => ({ ...prev, [logId]: true }));
    setSaveSuccess((prev) => ({ ...prev, [logId]: false }));
    const { error } = await supabase
      .from("grievance_search_logs")
      .update({
        flagged: feedback.flagged,
        corrected_response: feedback.correctedResponse,
        training_example: feedback.trainingExample,
      })
      .eq("id", logId);

    // PHASE 1: Insert into ai_training_queue if flagged or corrected
    const log = logs.find((l) => l.id === logId);
    if ((feedback.flagged || feedback.correctedResponse) && log) {
      try {
        await fetch("/api/ai-training-queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            original_query: log.query,
            original_response: log.results.join("\n"),
            steward_correction: feedback.correctedResponse,
            steward_email: log.steward_email || "",
            source_log_id: logId,
          }),
        });
      } catch (err) {
        console.error("❌ Failed to queue for AI training:", err);
      }
    }

    setSaving((prev) => ({ ...prev, [logId]: false }));
    if (error) {
      console.error("Failed to save feedback:", error);
      alert("❌ Failed to save feedback.");
    } else {
      setSaveSuccess((prev) => ({ ...prev, [logId]: true }));
      alert("✅ Feedback saved!");
      setTimeout(() => setSaveSuccess((prev) => ({ ...prev, [logId]: false })), 2000);
    }
  };

  const exportCSV = () => {
    const header = ["Query", "Results", "Date", "Steward", "Flagged", "Corrected"];
    const rows = filteredLogs.map((log) => [
      log.query,
      log.results.join(" | "),
      format(new Date(log.created_at), "yyyy-MM-dd HH:mm"),
      log.steward_email || "-",
      log.flagged ? "Yes" : "No",
      log.corrected_response || "-",
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grievance_logs_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">📜 Grievance Search Logs</h1>

      <div className="flex gap-4 mb-4">
        <input
          placeholder="Search queries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <button onClick={() => setShowFlaggedOnly((prev) => !prev)} className="border rounded px-2 py-1">
          {showFlaggedOnly ? "Show All" : "Show Flagged Only"}
        </button>
        <button onClick={exportCSV} className="border rounded px-2 py-1">Export CSV</button>
      </div>

      {filteredLogs.length === 0 ? (
        <p>No logs found.</p>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((log) => {
            const feedback = logFeedback[log.id] || { flagged: log.flagged || false, correctedResponse: '', trainingExample: false };
            return (
              <div key={log.id} className="bg-white dark:bg-gray-900 border rounded">
                <div className="p-4 space-y-2">
                  <p className="text-sm text-gray-500">
                    📅 {format(new Date(log.created_at), "yyyy-MM-dd HH:mm")} by {log.steward_email || "Unknown"}
                  </p>
                  <p className="font-semibold">📝 Query: {log.query}</p>
                  <p className="text-sm">🔎 Top Results:</p>
                  <ul className="list-disc list-inside text-sm">
                    {log.results.map((res, i) => (
                      <li key={i}>{res}</li>
                    ))}
                  </ul>
                  {/* Flag for Correction toggle */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      className={`px-2 py-1 rounded border ${feedback.flagged ? 'bg-red-100 text-red-700 border-red-400 dark:bg-red-900 dark:text-red-200' : 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-200'}`}
                      onClick={() => handleFeedbackChange(log.id, 'flagged', !feedback.flagged)}
                      type="button"
                    >
                      {feedback.flagged ? '🚩 Flagged for Correction' : 'Flag for Correction'}
                    </button>
                    {/* Use as Training Example checkbox */}
                    <label className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={feedback.trainingExample}
                        onChange={e => handleFeedbackChange(log.id, 'trainingExample', e.target.checked)}
                        className="accent-blue-600"
                      />
                      Use as Training Example
                    </label>
                  </div>
                  {/* Correction textarea */}
                  <div className="mt-2">
                    <label className="block text-xs font-semibold mb-1">Correction</label>
                    <textarea
                      className="w-full border rounded p-2 text-sm bg-gray-50 dark:bg-gray-800"
                      rows={2}
                      placeholder="Write an improved AI response or correction..."
                      value={feedback.correctedResponse}
                      onChange={e => handleFeedbackChange(log.id, 'correctedResponse', e.target.value)}
                    />
                  </div>
                  {/* Save Feedback button */}
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      onClick={() => saveFeedbackToSupabase(log.id)}
                      disabled={saving[log.id]}
                    >
                      Save Feedback
                    </Button>
                    {saveSuccess[log.id] && <span className="text-green-600 text-lg">✅</span>}
                  </div>
                  {feedback.flagged && <p className="text-red-500 font-semibold mt-2">🚩 Flagged for correction</p>}
                  {feedback.correctedResponse && (
                    <div>
                      <p className="text-sm font-semibold">✅ Steward Correction:</p>
                      <pre className="bg-gray-100 p-2 rounded text-xs whitespace-pre-wrap">
                        {feedback.correctedResponse}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
