"use client";
import { useState } from "react";
import FileDropzone from "../../components/FileDropzone";
import { generateGrievancePDF } from "../../../lib/pdf/generator";
import { toast } from "react-hot-toast";
import html2pdf from "html2pdf.js";
import { useRouter } from 'next/navigation';
import { logError } from '../../../lib/api';
import { useAuth } from '@clerk/nextjs';

const ARTICLE_OPTIONS = [
	{ value: "Article 5", label: "Article 5 – Prohibition of Discrimination" },
	{ value: "Article 14", label: "Article 14 – Safety and Health" },
	{
		value: "Article 15",
		label: "Article 15 – Grievance-Arbitration Procedure",
	},
	{ value: "Article 17", label: "Article 17 – Representation" },
	{ value: "Article 19", label: "Article 19 – Handbooks and Manuals" },
	{ value: "ELM 437.11", label: "ELM 437.11 – Higher Level Pay" },
	// ...add more as needed
];

export default function NewGrievancePage() {
	const { getToken } = useAuth();
	const [summary, setSummary] = useState("");
	const [description, setDescription] = useState("");
	const [date, setDate] = useState("");
	const [articles, setArticles] = useState<string[]>([]);
	const [type, setType] = useState("Individual");
	const [files, setFiles] = useState<File[]>([]);
	const [aiLoading, setAiLoading] = useState(false);
	const [aiResult, setAiResult] = useState<{ memo?: string } | null>(null);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [caseNumber, setCaseNumber] = useState("");
	const router = useRouter();

	const handleArticleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
		setArticles(selected);
	};

	const handleAnalyze = async () => {
		setAiLoading(true);
		setError("");
		setAiResult(null);
		try {
			const res = await fetch("/api/grievance-analysis", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ summary, description }),
			});
			const data = await res.json();
			if (res.ok && data) {
				setAiResult({
					memo: data.memo || "",
				});
			} else {
				setError(data.error || "AI analysis failed");
				toast.error(data.error || "AI analysis failed");
			}
		} catch (e) {
			setError("AI analysis failed");
			toast.error("AI analysis failed");
		} finally {
			setAiLoading(false);
		}
	};

	const handleSaveOrSubmit = async (endpoint: string) => {
		setError("");
		setSuccess("");

		if (!summary || !description) {
			setError("Summary and Description are required.");
			toast.error("Summary and Description are required.");
			return;
		}

		if (!aiResult?.memo) {
			setError("Please run AI analysis before submitting.");
			toast.error("AI memo required. Click 'Analyze with AI' first.");
			return;
		}

		// Build file names
		const fileNames = files.map(f => typeof f === "string" ? f : f.name);

		// Mock structured violations (replace with real AI output later)
		const violations = articles.map((article) => ({
			article_number: article,
			article_title: article,
			violation_reason: "Violation based on grievance facts."
		}));

		// Full payload
		const payload = {
			title: summary.slice(0, 60),
			summary,
			description,
			case_number: caseNumber || `GT-${Date.now()}`,
			memo: aiResult.memo,
			grievance_type: type as "Class Action" | "Individual",
			files: fileNames,
			violations
		};

		console.log("📦 Submitting payload:", payload);

		let attempt = 0;
		let maxAttempts = 3;
		let delay = 500;
		let lastError = null;
		while (attempt < maxAttempts) {
			try {
				const token = await getToken();
				const res = await fetch(endpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(token ? { Authorization: `Bearer ${token}` } : {})
					},
					body: JSON.stringify(payload),
				});

				let data;
				try {
					data = await res.json();
				} catch (jsonErr) {
					setError("Server returned invalid response");
					toast.error("Server returned invalid response");
					lastError = jsonErr;
					break;
				}

				if (res.ok) {
					setSuccess(data.message);
					toast.success(
						endpoint.includes("save-draft")
							? "Draft saved!"
							: `Submitted! Case #: ${data.case_number || ''}`
					);
					if (!endpoint.includes("save-draft")) {
						setTimeout(() => router.push("/dashboard/history"), 1200);
					}
					return;
				} else {
					lastError = data.error || `Failed to save/submit (status ${res.status})`;
					attempt++;
					if (attempt < maxAttempts) {
						await new Promise(res => setTimeout(res, delay));
						delay *= 2;
					}
				}
			} catch (e) {
				lastError = e;
				attempt++;
				if (attempt < maxAttempts) {
					await new Promise(res => setTimeout(res, delay));
					delay *= 2;
				}
			}
		}
		setError("Failed to save/submit after multiple attempts.");
		toast.error("Failed to save/submit after multiple attempts.");
		logError(endpoint, lastError);
	};


	const formattedViolations = articles.map((a) => {
	  // Try to split article number and title if possible
	  const match = a.match(/^(Article [^\s]+|ELM [^\s]+)\s*[-–—:]?\s*(.*)$/);
	  return match
	    ? {
	        article_number: match[1],
	        article_title: match[2] || match[1],
	        violation_reason: "See grievance details."
	      }
	    : {
	        article_number: a,
	        article_title: a,
	        violation_reason: "See grievance details."
	      };
	});

	const handleExportPDF = async () => {
		setError("");
		try {
			const contentToExport = aiResult?.memo || "⚠️ No memo available.";
			// Create a styled wrapper for the memo
			const wrapper = document.createElement("div");
			wrapper.id = "pdf-wrapper";
			wrapper.className = "p-6 text-base leading-relaxed whitespace-pre-wrap";
			wrapper.innerHTML = `
			  <h1 style='font-size:1.5em;font-weight:bold;margin-bottom:0.5em;'>Grievance Memo</h1>
			  <div style='margin-bottom:1em;'><strong>Summary:</strong> ${summary}</div>
			  <div style='margin-bottom:1em;'><strong>Description:</strong> ${description}</div>
			  <div style='margin-bottom:1em;'><strong>Date:</strong> ${date || new Date().toLocaleDateString()}</div>
			  <div style='margin-bottom:1em;'><strong>Articles:</strong> ${articles.join(", ")}</div>
			  <hr style='margin:1em 0;' />
			  <div style='font-size:1.1em;'>${contentToExport.replace(/\n/g, '<br>')}</div>
			`;
			document.body.appendChild(wrapper);
			html2pdf()
			  .set({
				margin: [0.5, 0.5, 0.5, 0.5],
				filename: `${summary?.slice(0, 30) || 'grievance'}_memo.pdf`,
				image: { type: 'jpeg', quality: 0.98 },
				html2canvas: { scale: 2 },
				jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
			  })
			  .from(wrapper)
			  .save()
			  .then(() => document.body.removeChild(wrapper));
		} catch (e) {
			setError("PDF export failed");
		}
	};

	// Utility to log grievance search queries (for analytics/audit)
	async function logGrievanceSearch(queryText: string, matchedArticles: string[], aiSummary: string) {
		try {
			await fetch("/api/grievance-search-log", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					query_text: queryText,
					matched_articles: matchedArticles,
					ai_summary: aiSummary,
					timestamp: new Date().toISOString(),
				}),
			});
		} catch (e) {
			console.error("Failed to log grievance search:", e);
		}
	}

	return (
		<div className="p-4 max-w-2xl mx-auto space-y-6">
			<div className="bg-white dark:bg-gray-900 rounded shadow p-4">
				<h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
					📬 Start a New Grievance
				</h1>
				<form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
					<div>
						<label
							className="block font-semibold mb-1"
							htmlFor="summary"
						>
							Summary{" "}
							<span className="text-red-500">*</span>
						</label>
						<input
							id="summary"
							name="summary"
							type="text"
							required
							value={summary}
							onChange={(e) => setSummary(e.target.value)}
							className="w-full px-4 py-2 border rounded dark:bg-gray-800 dark:text-white"
						/>
					</div>
					<div>
						<label
							className="block font-semibold mb-1"
							htmlFor="description"
						>
							Description{" "}
							<span className="text-red-500">*</span>
						</label>
						<textarea
							id="description"
							name="description"
							required
							rows={5}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							className="w-full px-4 py-2 border rounded dark:bg-gray-800 dark:text-white"
						/>
					</div>
					<div>
						<label
							className="block font-semibold mb-1"
							htmlFor="date"
						>
							Date of Violation
						</label>
						<input
							id="date"
							name="date"
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
							className="w-full px-4 py-2 border rounded dark:bg-gray-800 dark:text-white"
						/>
					</div>
					<div>
						<label
							className="block font-semibold mb-1"
							htmlFor="articles"
						>
							Article(s) (optional)
						</label>
						<select
							id="articles"
							name="articles"
							multiple
							value={articles}
							onChange={handleArticleChange}
							className="w-full px-4 py-2 border rounded dark:bg-gray-800 dark:text-white"
						>
							{ARTICLE_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
						<p className="text-xs text-gray-500 mt-1">
							Hold Ctrl (Windows) or Cmd (Mac) to select multiple.
						</p>
					</div>
					<div>
						<label className="block font-semibold mb-1">Grievance Type</label>
						<div className="flex gap-4">
							<label className="flex items-center gap-2">
								<input
									type="radio"
									name="type"
									value="Individual"
									checked={type === "Individual"}
									onChange={() => setType("Individual")}
								/>
								Individual
							</label>
							<label className="flex items-center gap-2">
								<input
									type="radio"
									name="type"
									value="Class Action"
									checked={type === "Class Action"}
									onChange={() => setType("Class Action")}
								/>
								Class Action
							</label>
						</div>
					</div>
					<div>
						<label className="block font-semibold mb-1">Attachments</label>
						<FileDropzone files={files} setFiles={setFiles} />
					</div>
					<div>
						<label className="block font-semibold mb-1" htmlFor="case_number">
							Case Number (optional)
						</label>
						<input
							id="case_number"
							name="case_number"
							type="text"
							value={caseNumber}
							onChange={e => setCaseNumber(e.target.value)}
							className="w-full px-4 py-2 border rounded dark:bg-gray-800 dark:text-white"
							placeholder="e.g. GT-123456789"
						/>
						<p className="text-xs text-gray-500 mt-1">Leave blank to auto-generate.</p>
					</div>
					{error && (
						<div className="text-red-600 font-semibold">{error}</div>
					)}
					{success && (
						<div className="text-green-600 font-semibold">{success}</div>
					)}
					<div className="flex flex-col md:flex-row gap-2 mt-4">
						<button
							type="button"
							className="flex-1 py-2 px-4 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
							onClick={handleAnalyze}
							disabled={aiLoading}
						>
							{aiLoading ? "Analyzing..." : "Analyze with AI"}
						</button>
						<button
							type="button"
							className="flex-1 py-2 px-4 bg-gray-500 text-white rounded font-semibold hover:bg-gray-600"
							onClick={() =>
								handleSaveOrSubmit("/api/grievances/save-draft")
							}
						>
							Save as Draft
						</button>
						<button
							type="button"
							className="flex-1 py-2 px-4 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
							onClick={() => handleSaveOrSubmit("/api/grievances/submit")}
						>
							Submit Grievance
						</button>
						<button
							type="button"
							className="flex-1 py-2 px-4 bg-purple-600 text-white rounded font-semibold hover:bg-purple-700"
							onClick={handleExportPDF}
						>
							Export as PDF
						</button>
					</div>
				</form>
			</div>
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
