"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useUser } from '@clerk/nextjs';
// @ts-expect-error: html2pdf.js has no types, see types/html2pdf.d.ts
import html2pdf from "html2pdf.js";
import { toast } from 'react-hot-toast';

interface Grievance {
  id: string;
  case_number?: string;
  title?: string;
  step1_created_at?: string;
  step2_escalated_at?: string;
  step1_memo?: string;
  step1_denial?: string;
  step2_memo?: string;
  grievance_notes?: string;
  memo_feedback?: string;
  updated_by_user_id?: string;
  updated_at?: string;
  created_by_user_id?: string;
  local_id?: string;
  status?: string;
}

export default function GrievanceDetailPage() {
  const { user } = useUser();
  const { id } = useParams();
  const [grievance, setGrievance] = useState<Grievance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<{ name: string }[]>([]);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesStatus, setNotesStatus] = useState("");
  const [updatedByName, setUpdatedByName] = useState("");
  const [feedback, setFeedback] = useState(grievance?.memo_feedback || "");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [mbaEmail, setMbaEmail] = useState('');
  const [step3Status, setStep3Status] = useState('');
  const [step3Loading, setStep3Loading] = useState(false);

  // Use params for dynamic route [id].tsx
  const grievanceId = id || "";

  useEffect(() => {
    async function fetchGrievance() {
      if (!grievanceId) return;
      setLoading(true);
      const supabase = createClientComponentClient();
      const { data, error } = await supabase
        .from("grievances")
        .select("*")
        .eq("id", grievanceId)
        .single();
      if (error) setError(error.message);
      setGrievance(data);
      setLoading(false);
    }
    fetchGrievance();
  }, [grievanceId]);

  useEffect(() => {
    async function fetchFiles() {
      if (!grievanceId) return;
      const supabase = createClientComponentClient();
      const { data } = await supabase.storage
        .from("denials")
        .list(`denials/${grievanceId}`);
      setFiles(data || []);
    }
    fetchFiles();
  }, [grievanceId]);

  useEffect(() => {
    if (grievance && grievance.grievance_notes) setNotes(grievance.grievance_notes);
  }, [grievance]);

  useEffect(() => {
    async function fetchUpdatedByName() {
      if (grievance && grievance.updated_by_user_id) {
        const supabase = createClientComponentClient();
        const { data: userData } = await supabase
          .from("users")
          .select("name")
          .eq("id", grievance.updated_by_user_id)
          .single();
        setUpdatedByName(userData?.name || grievance.updated_by_user_id);
      }
    }
    fetchUpdatedByName();
  }, [grievance]);

  async function handleReanalyzeDenial() {
    if (!grievance) return;
    setReanalyzing(true);
    try {
      const res = await fetch("/api/step2/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grievanceId: grievance.id,
          originalMemo: grievance.step1_memo,
          step1Denial: grievance.step1_denial || ""
        })
      });
      const data = await res.json();
      if (data.step2Memo) {
        setGrievance((prev) => ({ ...prev!, step2_memo: data.step2Memo }));
      }
    } catch {
      alert("AI re-analysis failed.");
    } finally {
      setReanalyzing(false);
    }
  }

  async function saveNotes() {
    if (!grievance) return;
    setSavingNotes(true);
    setNotesStatus("");
    const supabase = createClientComponentClient();
    const { error } = await supabase
      .from("grievances")
      .update({ grievance_notes: notes })
      .eq("id", grievance.id);
    setSavingNotes(false);
    setNotesStatus(error ? "❌ Error saving notes" : "✅ Notes saved");
  }

  async function handleFeedback(value: string) {
    setFeedback(value);
    setFeedbackStatus("");
    if (!grievance) return;
    const supabase = createClientComponentClient();
    const { error } = await supabase
      .from("grievances")
      .update({ memo_feedback: value })
      .eq("id", grievance.id);
    setFeedbackStatus(error ? "❌ Error saving feedback" : "✅ Feedback saved");
  }

  function handleExportFullCasePDF() {
    if (!grievance) return;
    const element = document.createElement("div");
    element.innerHTML = `
      <div style="font-family: sans-serif;">
        <h1 style="font-size: 1.5em; font-weight: bold;">Grievance Case Packet</h1>
        <p><strong>Case ID:</strong> ${grievance.case_number || grievance.id}</p>
        <p><strong>Title:</strong> ${grievance.title || "Untitled"}</p>
        <p><strong>Date Filed:</strong> ${grievance.step1_created_at ? new Date(grievance.step1_created_at).toLocaleDateString() : "N/A"}</p>
        <hr style="margin: 1em 0;" />
        <h2 style="font-size: 1.2em; font-weight: bold;">AI Memo</h2>
        <div style="white-space: pre-wrap; border: 1px solid #ccc; padding: 1em; border-radius: 6px; margin-bottom: 1em;">
          ${(grievance.step2_memo || grievance.step1_memo || "No memo available.")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>")}
        </div>
        <h2 style="font-size: 1.2em; font-weight: bold;">Attached Files</h2>
        <ul style="margin-left: 1em;">
          ${files && files.length > 0
            ? files.map(f => `<li>${f.name}</li>`).join("")
            : '<li>No uploaded files found.</li>'}
        </ul>
      </div>
    `;
    html2pdf()
      .from(element)
      .set({
        margin: 0.5,
        filename: `${grievance.case_number || grievance.id}_case_packet.pdf`,
        jsPDF: { format: "letter", orientation: "portrait" },
      })
      .save();
  }

  function formatDate(d: string) {
    return d ? new Date(d).toLocaleDateString() : "N/A";
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!grievance) return <div className="p-6">Grievance not found.</div>;

  // Access control: only creator or same local can view
  const userId = user?.id;
  const userLocalId = user?.publicMetadata?.local_id;
  if (userId !== grievance.created_by_user_id && userLocalId !== grievance.local_id) {
    return <div className="text-red-600 font-medium p-6">🚫 You are not authorized to view this grievance.</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Grievance Detail</h1>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Case: {grievance.case_number || grievance.id}</h2>
        <p className="text-gray-600">Filed: {grievance.step1_created_at ? new Date(grievance.step1_created_at).toLocaleDateString() : "N/A"}</p>
        <p className="text-gray-600">Status: {grievance.status}</p>
      </div>
      <div className="bg-white p-6 border rounded shadow-sm mt-4">
        <h2 className="text-lg font-bold mb-2">📄 AI Arbitration Memo</h2>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 border p-4 rounded max-h-[500px] overflow-y-auto">
          {grievance.step2_memo || grievance.step1_memo || "No memo available."}
        </div>
      </div>
      <div className="mt-4 bg-gray-50 p-4 border rounded">
        <h3 className="text-sm font-semibold mb-2">📎 Attached Files</h3>
        {files && files.length > 0 ? (
          files.map(file => {
            const name = file.name;
            const lname = name.toLowerCase();
            const tag = lname.includes("denial") ? "Denial"
              : lname.includes("rfi") ? "RFI"
              : lname.includes("witness") ? "Witness"
              : "File";
            return (
              <div key={name} className="flex items-center justify-between mb-2 gap-2">
                <span className="text-sm">{name}</span>
                <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">{tag}</span>
                <a
                  href={`${process.env.NEXT_PUBLIC_SUPABASE_BUCKET_URL || "https://your-supabase-url"}/denials/${grievanceId}/${name}`}
                  target="_blank"
                  className="text-blue-600 underline text-sm"
                >
                  📥 Download
                </a>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-500">No uploaded files found.</p>
        )}
      </div>
      {/* Timeline Sidebar */}
      <ul className="border-l-2 pl-4 mt-4 space-y-1 text-sm text-gray-700">
        <li>📌 Step 1 Filed: {formatDate(grievance.step1_created_at || "")}</li>
        {grievance.step2_escalated_at && <li>🚀 Step 2 Escalated: {formatDate(grievance.step2_escalated_at)}</li>}
        {!grievance.step2_memo && <li>⏳ Awaiting AI Memo</li>}
      </ul>
      {grievance.status === 'step2' && files && files.length > 0 && (
        <button
          onClick={handleReanalyzeDenial}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          disabled={reanalyzing}
        >
          {reanalyzing ? 'Re-analyzing...' : '🔁 Re-analyze Denial with AI'}
        </button>
      )}
      <button onClick={handleExportFullCasePDF} className="mt-4 bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800">
        🖨️ Export Full Case Packet (Memo + Files)
      </button>
      {/* Notes Section */}
      <div className="mt-6">
        <label className="block font-semibold mb-1">Internal Notes</label>
        <textarea
          className="w-full border p-2 mt-1"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes (e.g. draft arbitration points, deadlines)"
          rows={4}
        />
        <button
          onClick={saveNotes}
          className="mt-2 bg-gray-800 text-white px-3 py-1 rounded"
          disabled={savingNotes}
        >
          {savingNotes ? "Saving..." : "💾 Save Notes"}
        </button>
        {notesStatus && <div className="mt-2 text-sm">{notesStatus}</div>}
      </div>
      {/* Feedback Section */}
      <div className="mt-4">
        <p className="text-sm font-medium">Was this AI memo accurate?</p>
        <button
          onClick={() => handleFeedback('accurate')}
          className={`text-green-600 mr-2 ${feedback === 'accurate' ? 'font-bold underline' : ''}`}
        >
          👍 Accurate
        </button>
        <button
          onClick={() => handleFeedback('needs_fix')}
          className={`text-red-600 ${feedback === 'needs_fix' ? 'font-bold underline' : ''}`}
        >
          👎 Needs Fix
        </button>
        {feedbackStatus && <span className="ml-4 text-xs">{feedbackStatus}</span>}
      </div>
      {/* Step 3 Arbitration Audit Trigger */}
      <div className="mt-8 bg-yellow-50 border border-yellow-300 rounded p-4">
        <h3 className="font-bold mb-2">Step 3: Arbitration Audit & MBA Forwarding</h3>
        <label className="block mb-1 font-medium">MBA Email</label>
        <input
          type="email"
          className="border px-2 py-1 rounded w-full mb-2"
          value={mbaEmail}
          onChange={e => setMbaEmail(e.target.value)}
          placeholder="mba@example.com"
          disabled={step3Loading}
        />
        <button
          className="bg-indigo-700 text-white px-4 py-2 rounded hover:bg-indigo-800 disabled:opacity-60"
          disabled={!mbaEmail || step3Loading}
          onClick={async () => {
            setStep3Loading(true);
            setStep3Status('');
            try {
              const res = await fetch('/api/step3-audit.ts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grievanceId, mbaEmail }),
              });
              const data = await res.json();
              if (data.auditMemo && data.forwardedToMBA) {
                setStep3Status('✅ Sent to MBA!');
                toast.success('✅ Arbitration audit sent to MBA');
              } else if (data.auditMemo) {
                setStep3Status('⚠️ Audit generated, but email failed.');
              } else {
                setStep3Status(data.error || '❌ Failed to generate audit.');
              }
            } catch {
              setStep3Status('❌ Failed to generate audit.');
            } finally {
              setStep3Loading(false);
            }
          }}
        >
          {step3Loading ? 'Sending...' : '📤 Forward to MBA'}
        </button>
        {step3Status && <div className="mt-2 text-sm">{step3Status}</div>}
      </div>
      <p className="text-sm text-gray-500 mt-4">
        Last updated by: {updatedByName || grievance.updated_by_user_id || "Unknown"} on {formatDate(grievance.updated_at || "")}
      </p>
    </div>
  );
}
