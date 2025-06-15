import React, { useState } from "react";

interface ResolutionModalProps {
  grievanceId: string;
  caseNumber: string;
  grievantName?: string;
  open: boolean;
  onClose: () => void;
  onResolved: () => void;
  grievanceType: string;
  stewardEmail: string;
  memberEmail?: string;
  supervisorEmail?: string;
}

const ResolutionModal: React.FC<ResolutionModalProps> = ({
  grievanceId,
  caseNumber,
  grievantName,
  open,
  onClose,
  onResolved,
  grievanceType,
  stewardEmail,
  memberEmail,
  supervisorEmail,
}) => {
  const [stewardInput, setStewardInput] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [aiResolution, setAiResolution] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleGenerateAI = async () => {
    setLoadingAI(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-resolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: stewardInput, case_number: caseNumber, grievant_name: grievantName }),
      });
      const data = await res.json();
      if (data.aiResolution) {
        setAiResolution(data.aiResolution);
      } else {
        setError("AI could not generate a resolution memo.");
      }
    } catch {
      setError("Error generating AI resolution.");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("grievanceId", grievanceId);
      formData.append("resolutionText", aiResolution || stewardInput);
      formData.append("stewardNotes", internalNotes);
      if (file) formData.append("uploadedFile", file);
      formData.append("userEmail", stewardEmail);
      if (memberEmail) formData.append("memberEmail", memberEmail);
      if (supervisorEmail) formData.append("managerEmail", supervisorEmail);
      formData.append("grievanceType", grievanceType);
      formData.append("memoHtml", aiResolution || stewardInput);
      formData.append("memoText", (aiResolution || stewardInput).replace(/<[^>]+>/g, ""));
      const res = await fetch("/api/submit-resolution", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setSuccess(true);
        onResolved();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to submit resolution.");
      }
    } catch {
      setError("Error submitting resolution.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
        <button className="absolute top-2 right-2 text-gray-500" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-2">Resolve Grievance</h2>
        <label className="block mb-2 font-medium">Paste your resolution or agreement with management</label>
        <textarea
          className="w-full border rounded p-2 mb-3"
          rows={4}
          value={stewardInput}
          onChange={e => setStewardInput(e.target.value)}
          placeholder="Type or paste your resolution here..."
        />
        <label className="block mb-2 font-medium">Upload signed agreement (PDF or DOCX)</label>
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
          className="mb-3"
        />
        {file && <div className="mb-2 text-sm">Selected: {file.name}</div>}
        <label className="block mb-2 font-medium">Internal steward notes (optional)</label>
        <input
          className="w-full border rounded p-2 mb-3"
          value={internalNotes}
          onChange={e => setInternalNotes(e.target.value)}
          placeholder="Private notes (not sent to management)"
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded mb-3 w-full"
          onClick={handleGenerateAI}
          disabled={loadingAI || !stewardInput}
        >
          {loadingAI ? "Generating..." : "✍️ Generate Professional Resolution"}
        </button>
        {aiResolution && (
          <div className="border rounded p-3 mb-3 bg-gray-50">
            <div className="font-semibold mb-1">AI-Generated Memo Preview:</div>
            <pre className="whitespace-pre-wrap text-sm">{aiResolution}</pre>
          </div>
        )}
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <button
          className="bg-green-600 text-white px-4 py-2 rounded w-full"
          onClick={handleSubmit}
          disabled={submitting || (!aiResolution && !stewardInput)}
        >
          {submitting ? "Submitting..." : "📤 Submit Resolution"}
        </button>
        {success && <div className="text-green-700 mt-2">Resolution submitted successfully!</div>}
      </div>
    </div>
  );
};

export default ResolutionModal;
