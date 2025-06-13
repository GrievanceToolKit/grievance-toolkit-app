"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface TrainingQueueRow {
  id: string;
  original_query: string;
  original_response: string;
  steward_correction: string;
  steward_email: string;
  created_at: string;
  applied_to_model: boolean;
  source_log_id: string;
}

export default function TrainingExportPage() {
  const [rows, setRows] = useState<TrainingQueueRow[]>([]);
  const [showUnappliedOnly, setShowUnappliedOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRows();
  }, []);

  const fetchRows = async () => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_KEY!
    );
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_training_queue")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to fetch training queue:", error);
      setRows([]);
    } else {
      setRows(data as TrainingQueueRow[]);
    }
    setLoading(false);
  };

  const filteredRows = showUnappliedOnly
    ? rows.filter((r) => !r.applied_to_model)
    : rows;

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredRows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `training_queue_export_${Date.now()}.json`;
    a.click();
  };

  const exportCSV = () => {
    const header = [
      "Query",
      "Original Response",
      "Correction",
      "Steward Email",
      "Date",
      "Applied",
      "Source Log ID",
    ];
    const rowsData = filteredRows.map((row) => [
      row.original_query.replace(/\n/g, " "),
      row.original_response.replace(/\n/g, " "),
      row.steward_correction.replace(/\n/g, " "),
      row.steward_email,
      format(new Date(row.created_at), "yyyy-MM-dd HH:mm"),
      row.applied_to_model ? "Yes" : "No",
      row.source_log_id,
    ]);
    const csv = [header, ...rowsData].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `training_queue_export_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🧠 AI Training Queue Export</h1>
      <div className="flex gap-4 mb-4 flex-wrap">
        <Button onClick={exportJSON} size="sm">Export JSON</Button>
        <Button onClick={exportCSV} size="sm">Export CSV</Button>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showUnappliedOnly}
            onChange={() => setShowUnappliedOnly((v) => !v)}
            className="accent-blue-600"
          />
          Show only unapplied
        </label>
        <Button onClick={fetchRows} size="sm">Refresh</Button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : filteredRows.length === 0 ? (
        <p>No training feedback found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm dark:bg-gray-900">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="p-2 border">Query</th>
                <th className="p-2 border">Original Response</th>
                <th className="p-2 border">Correction</th>
                <th className="p-2 border">Steward Email</th>
                <th className="p-2 border">Date</th>
                <th className="p-2 border">Applied?</th>
                <th className="p-2 border">Source Log ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-blue-50 dark:hover:bg-blue-900">
                  <td className="p-2 border whitespace-pre-wrap max-w-xs">{row.original_query}</td>
                  <td className="p-2 border whitespace-pre-wrap max-w-xs">{row.original_response}</td>
                  <td className="p-2 border whitespace-pre-wrap max-w-xs">{row.steward_correction}</td>
                  <td className="p-2 border">{row.steward_email}</td>
                  <td className="p-2 border">{format(new Date(row.created_at), "yyyy-MM-dd HH:mm")}</td>
                  <td className="p-2 border text-center">{row.applied_to_model ? "✅" : ""}</td>
                  <td className="p-2 border">{row.source_log_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
