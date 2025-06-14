"use client";
import React, { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useUser } from "@clerk/nextjs";

interface LMOU {
  id: string;
  status?: string;
  uploaded_at?: string;
  uploaded_by_user_id?: string;
  extracted_text?: string;
  file_url?: string;
}

export default function LMOUViewer() {
  const { user } = useUser();
  const [lmou, setLmou] = useState<LMOU | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [markingOutdated, setMarkingOutdated] = useState(false);
  const [uploaderName, setUploaderName] = useState<string>("");
  const [chunkCount, setChunkCount] = useState<number>(0);

  useEffect(() => {
    async function fetchLMOU() {
      if (!user) return;
      setLoading(true);
      setError("");
      const supabase = createClientComponentClient();
      // Fetch user role
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      setUserRole(userData?.role || "");
      // Fetch LMOU
      const { data, error } = await supabase
        .from("lmou_library")
        .select("*")
        .eq("local_id", user.publicMetadata?.local_id)
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .single();
      if (error) setError(error.message);
      setLmou(data);
      setLoading(false);
      // Set status message
      if (!data) setStatusMsg("⚠️ LMOU missing");
      else if (data.status === "outdated") setStatusMsg("⚠️ LMOU outdated");
      else setStatusMsg("📄 LMOU on file");
      // Fetch uploader name if possible
      if (data?.uploaded_by_user_id) {
        const { data: uploader } = await supabase
          .from("users")
          .select("name")
          .eq("id", data.uploaded_by_user_id)
          .single();
        setUploaderName(uploader?.name || data.uploaded_by_user_id);
      } else {
        setUploaderName("");
      }
      // Fetch chunk count
      if (data?.id) {
        const { data: chunks } = await supabase
          .from("local_chunks")
          .select("id")
          .eq("lmou_id", data.id);
        setChunkCount(chunks?.length || 0);
      } else {
        setChunkCount(0);
      }
    }
    fetchLMOU();
  }, [user]);

  const handleMarkOutdated = async () => {
    if (!lmou) return;
    setMarkingOutdated(true);
    const supabase = createClientComponentClient();
    const { error } = await supabase
      .from("lmou_library")
      .update({ status: "outdated" })
      .eq("id", lmou.id);
    setMarkingOutdated(false);
    if (!error) window.location.reload();
  };

  if (loading) return <div>Loading LMOU...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  // Replace with your actual Supabase bucket URL if needed
  const bucketUrl = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_URL || "https://your-bucket-url";

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow mt-8">
      <h2 className="text-xl font-bold mb-4">Local Memorandum of Understanding (LMOU)</h2>
      <div className="mb-2 flex items-center gap-2">
        <span className={
          statusMsg.includes("on file") ? "text-green-700" : "text-yellow-700 font-semibold"
        }>{statusMsg}</span>
        {userRole === "admin" && lmou && lmou.status !== "outdated" && (
          <button
            className="ml-2 px-2 py-1 bg-yellow-200 text-yellow-900 rounded text-xs border border-yellow-400"
            onClick={handleMarkOutdated}
            disabled={markingOutdated}
          >
            {markingOutdated ? "Marking..." : "Mark Outdated"}
          </button>
        )}
      </div>
      {lmou ? (
        <>
          <div className="mb-2 flex flex-col gap-1">
            {lmou.uploaded_at && (
              <p className="text-sm text-gray-600">
                Uploaded on {lmou.uploaded_at ? new Date(lmou.uploaded_at).toLocaleDateString() : "Unknown"} by {uploaderName || lmou.uploaded_by_user_id || "Unknown"}
              </p>
            )}
            <p className="text-sm text-gray-600">{chunkCount} contract chunks available for AI</p>
          </div>
          <pre className="max-h-96 overflow-y-auto border p-4 bg-gray-50 mb-4">{lmou.extracted_text || ''}</pre>
          {lmou.file_url && (
            <a
              href={`${bucketUrl}/${lmou.file_url}`}
              target="_blank"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              📥 Download LMOU
            </a>
          )}
        </>
      ) : (
        <div className="text-yellow-700">No LMOU found for your local.</div>
      )}
    </div>
  );
}
