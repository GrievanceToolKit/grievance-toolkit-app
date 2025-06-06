"use client";
import React, { useState, useEffect } from "react";
// @ts-ignore
import html2pdf from "html2pdf.js";
import { createClient } from "@supabase/supabase-js";

// Extraction helpers (to be replaced with real implementations or API calls)
async function extractPdfText(file: File): Promise<string> {
  // TODO: Implement PDF text extraction (e.g., via API route or pdf.js)
  return "[PDF text extraction not yet implemented]";
}

async function extractTextWithTesseract(file: File): Promise<string> {
  // TODO: Implement OCR with tesseract.js
  return "[Image OCR extraction not yet implemented]";
}

async function extractDocxText(file: File): Promise<string> {
  // TODO: Implement DOCX extraction (e.g., with mammoth.js)
  return "[DOCX text extraction not yet implemented]";
}

function splitMemoSections(memo: string) {
  // Split by markdown headings (e.g., /^\d+\. / or /^#+ /)
  const lines = memo.split("\n");
  const sections: { heading: string; content: string }[] = [];
  let currentHeading = "";
  let currentContent = [];
  for (const line of lines) {
    if (/^\d+\.\s|^#+\s/.test(line)) {
      if (currentHeading) {
        sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
      }
      currentHeading = line.replace(/^#+\s/, "").trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  if (currentHeading) {
    sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
  }
  return sections;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

export default function EscalationPage() {
  const [grievanceId, setGrievanceId] = useState("");
  const [originalMemo, setOriginalMemo] = useState("");
  const [step1Denial, setStep1Denial] = useState("");
  const [step2Memo, setStep2Memo] = useState("");
  const [rawOutput, setRawOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [uploadedText, setUploadedText] = useState("");
  const [uploadStatus, setUploadStatus] = useState<'success' | 'error' | null>(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [fileList, setFileList] = useState<string[]>([]);
  const [fileListError, setFileListError] = useState("");
  const [editableDenialText, setEditableDenialText] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [autoExportEnabled, setAutoExportEnabled] = useState(true);
  const [stewardInfo, setStewardInfo] = useState<{ name: string; local_name: string } | null>(null);

  const manualTextFallback = step1Denial;
  const step1DenialText = editableDenialText || manualTextFallback;

  useEffect(() => {
    async function fetchFiles() {
      if (!grievanceId) {
        setFileList([]);
        return;
      }
      try {
        const { data: files, error } = await supabase.storage
          .from('denials')
          .list(`denials/${grievanceId}`, { limit: 100 });
        if (error) {
          setFileListError("Error fetching files: " + error.message);
          setFileList([]);
        } else if (files) {
          setFileList(files.map(f => f.name));
          setFileListError("");
        }
      } catch (err) {
        setFileListError("Error fetching files");
        setFileList([]);
      }
    }
    fetchFiles();

    // Fetch steward info for signature block
    async function fetchStewardInfo() {
      if (!grievanceId) return;
      const { data: grievance } = await supabase
        .from('grievances')
        .select('created_by_user_id')
        .eq('id', grievanceId)
        .single();
      if (grievance?.created_by_user_id) {
        const { data: user } = await supabase
          .from('users')
          .select('name, local_name')
          .eq('id', grievance.created_by_user_id)
          .single();
        if (user) setStewardInfo(user);
      }
    }
    fetchStewardInfo();
  }, [grievanceId]);

  useEffect(() => {
    if (step2Memo && autoExportEnabled) {
      handleExportPDF();
      setAutoExportEnabled(false);
    }
  }, [step2Memo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStep2Memo("");
    setRawOutput("");
    try {
      const res = await fetch("/api/step2/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grievanceId,
          originalMemo,
          step1Denial: step1DenialText
        })
      });
      const data = await res.json();
      if (data.step2Memo) {
        setStep2Memo(data.step2Memo);
        setRawOutput(data.step2Memo);
      } else {
        setError("No Step 2 memo returned.");
      }
    } catch (err) {
      setError("Error generating Step 2 memo.");
    } finally {
      setLoading(false);
    }
  }

  const handleExportPDF = () => {
    const element = document.getElementById("step2-memo");
    const fileName = `${grievanceId}_Step2_${new Date().toISOString().slice(0, 10)}.pdf`;
    html2pdf()
      .from(element)
      .set({
        margin: 0.5,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      })
      .save();
  };

  async function handleSaveToSupabase() {
    setSaveStatus("Saving...");
    try {
      const { data, error } = await supabase
        .from('grievances')
        .update({
          step2_memo: step2Memo,
          step2_escalated_at: new Date().toISOString()
        })
        .eq('id', grievanceId);
      if (error) {
        setSaveStatus("❌ Error saving: " + error.message);
        console.error("❌ Failed to save Step 2 memo:", error);
      } else {
        setSaveStatus("✅ Saved to Supabase");
        console.log("✅ Step 2 memo saved to Supabase");

        // After successful Step 2 memo generation and save, trigger escalation email notification
        // Fetch steward email from Supabase users table using created_by_user_id on the grievance
        let stewardEmail = '';
        if (grievanceId) {
          const { data: grievance } = await supabase
            .from('grievances')
            .select('created_by_user_id')
            .eq('id', grievanceId)
            .single();
          if (grievance?.created_by_user_id) {
            const { data: user } = await supabase
              .from('users')
              .select('email')
              .eq('id', grievance.created_by_user_id)
              .single();
            stewardEmail = user?.email;
          }
        }
        if (stewardEmail && step2Memo) {
          await fetch('/api/notify/escalation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              grievanceId,
              step2Memo,
              stewardEmail
            })
          });
        }
      }
    } catch (e) {
      setSaveStatus("❌ Error saving");
      console.error("❌ Exception saving Step 2 memo:", e);
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Upload file to Supabase Storage
    try {
      await supabase.storage
        .from('denials')
        .upload(`denials/${grievanceId}/${file.name}`, file, {
          cacheControl: '3600',
          upsert: true
        });
      setUploadStatus('success');
      setUploadMessage('File uploaded successfully.');
    } catch (err) {
      console.error('❌ Error uploading denial file to Supabase Storage:', err);
      setUploadStatus('error');
      setUploadMessage('Error uploading file. Please try again.');
    }

    if (file.type === 'application/pdf') {
      const text = await extractPdfText(file);
      setUploadedText(text);
      setStep1Denial(text);
      setEditableDenialText(text);
    } else if (file.type.includes('image')) {
      const text = await extractTextWithTesseract(file);
      setUploadedText(text);
      setStep1Denial(text);
      setEditableDenialText(text);
    } else if (file.name.endsWith('.docx')) {
      const text = await extractDocxText(file);
      setUploadedText(text);
      setStep1Denial(text);
      setEditableDenialText(text);
    } else {
      alert("Unsupported file type.");
    }
  };

  // Add the new handler for multiple files
  const handleMultiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let combinedText = "";
    let uploadSuccess = true;
    const uploadMsg = [];

    for (const file of files) {
      // Upload each file to Supabase Storage
      try {
        await supabase.storage
          .from('denials')
          .upload(`denials/${grievanceId}/${file.name}`, file, {
            cacheControl: '3600',
            upsert: true
          });
        uploadMsg.push(`${file.name}: uploaded`);
      } catch (err) {
        uploadSuccess = false;
        uploadMsg.push(`${file.name}: upload error`);
        console.error('❌ Error uploading file to Supabase Storage:', file.name, err);
      }

      // Extract text from each file
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractPdfText(file);
      } else if (file.type.includes('image')) {
        text = await extractTextWithTesseract(file);
      } else if (file.name.endsWith('.docx')) {
        text = await extractDocxText(file);
      } else {
        text = `[${file.name}] Unsupported file type.`;
      }
      if (text) {
        combinedText += `\n\n--- [${file.name}] ---\n${text}`;
      }
    }

    setUploadedText(combinedText.trim());
    setStep1Denial(combinedText.trim());
    setEditableDenialText(combinedText.trim());
    setUploadStatus(uploadSuccess ? 'success' : 'error');
    setUploadMessage(uploadMsg.join(' | '));
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
        🚩 Step 2 Escalation Management
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-900 rounded-lg shadow p-4 mb-6">
        <div>
          <label className="block font-semibold mb-1">Grievance ID</label>
          <input
            className="w-full border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
            value={grievanceId}
            onChange={e => setGrievanceId(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Original Memo (Step 1)</label>
          <textarea
            className="w-full border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
            rows={5}
            value={originalMemo}
            onChange={e => setOriginalMemo(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Step 1 Denial (Paste or Summarize)</label>
          <textarea
            className="w-full border rounded px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
            rows={4}
            value={step1Denial}
            onChange={e => setStep1Denial(e.target.value)}
            required
          />
          <input
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg"
            multiple
            onChange={handleMultiFileUpload}
            className="mt-2"
          />
          <p className="text-sm text-gray-500">📎 Upload denial letter (PDF, image, or DOCX)</p>
          {uploadMessage && (
            <div className={`mt-2 p-2 rounded text-xs ${uploadStatus === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {uploadMessage}
            </div>
          )}
          {uploadedText && (
            <div className="mt-4 border rounded bg-gray-50 p-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">📄 Step 1 Denial Preview</h3>
                <button
                  onClick={() => setEditMode(prev => !prev)}
                  className="text-blue-600 text-sm underline"
                >
                  {editMode ? "Cancel Edit" : "✏️ Edit"}
                </button>
              </div>
              {editMode ? (
                <textarea
                  className="w-full mt-2 border p-2 text-sm"
                  rows={8}
                  value={editableDenialText}
                  onChange={(e) => setEditableDenialText(e.target.value)}
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm mt-2 text-gray-700 max-h-60 overflow-y-auto">
                  {editableDenialText}
                </pre>
              )}
            </div>
          )}
        </div>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Step 2 Memo"}
        </button>
        {error && <div className="text-red-600 font-semibold mt-2">{error}</div>}
      </form>

      {step2Memo && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2 text-blue-700 dark:text-blue-300">Step 2 Memo</h2>
          <button onClick={handleExportPDF} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            📤 Export Step 2 Memo to PDF
          </button>
          <button
            onClick={() => window.print()}
            className="mt-2 bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 rounded"
          >
            🖨️ Print Memo
          </button>
          <div id="step2-memo" className="px-8 py-6 text-gray-900 font-sans leading-relaxed">
            {/* HEADER */}
            <div id="step2-header" className="mb-6 border-b pb-4">
              <h1 className="text-xl font-bold text-center">
                APWU Puerto Rico Area Local 1070
              </h1>
              <p className="text-center text-sm mt-1">
                Grievance ID: {grievanceId} – Step 2 Escalation
              </p>
              <p className="text-center text-sm">
                Date: {new Date().toLocaleDateString()}
              </p>
            </div>

            {/* MEMO BODY */}
            {step2Memo.split(/\*\*(\d\.\s.+?)\*\*/g).map((chunk, i) =>
              chunk.match(/^\d\.\s/) ? (
                <h2 key={i} className="text-lg font-semibold mt-6 mb-2">{chunk}</h2>
              ) : (
                <p key={i} className="whitespace-pre-wrap text-sm mb-4">{chunk.trim()}</p>
              )
            )}

            {/* SIGNATURE SECTION */}
            <div className="mt-12 pt-4 border-t">
              {stewardInfo && (
                <>
                  <p className="text-sm mt-6"><strong>Prepared By:</strong> {stewardInfo.name}</p>
                  <p className="text-sm"><strong>Local:</strong> {stewardInfo.local_name}</p>
                </>
              )}
              <p className="text-sm mt-4">Signature of Steward: ______________________________</p>
              <p className="text-sm mt-2">Date: ____________________</p>
            </div>
          </div>
        </div>
      )}

      {fileListError && (
        <div className="mt-2 p-2 rounded text-xs bg-red-50 text-red-800">{fileListError}</div>
      )}
      {fileList.length > 0 && (
        <div className="mt-2">
          <p className="text-sm text-gray-700">
            📁 {fileList.length} file{fileList.length !== 1 ? 's' : ''} uploaded for this grievance
          </p>
        </div>
      )}
      {fileList.length > 0 && (
        <div className="mt-4">
          <div className="font-semibold text-gray-700 mb-1">📂 Uploaded Files for this Grievance:</div>
          <ul className="list-disc ml-6 text-sm">
            {fileList.map((name) => (
              <li key={name}>
                <a
                  href={supabase.storage.from('denials').getPublicUrl(`denials/${grievanceId}/${name}`).data.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 underline hover:text-blue-900"
                >
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rawOutput && (
        <details className="mb-4">
          <summary className="cursor-pointer font-mono text-xs text-gray-500">Debug: Raw AI Output</summary>
          <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto mt-2">{rawOutput}</pre>
        </details>
      )}
    </div>
  );
}
