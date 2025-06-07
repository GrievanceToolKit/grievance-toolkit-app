"use client";
import React, { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { supabase } from "@/lib/supabaseClient";
import { extractDocxText } from "@/lib/docxExtract";
import { chunkText } from "@/lib/chunkText";

export default function OnboardingPage() {
  const { user } = useUser();
  const [formData, setFormData] = useState({
    name: "",
    craft: "",
    localName: "",
    localId: "",
    role: "steward"
  });
  const [status, setStatus] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setStatus("User not loaded.");
      return;
    }
    setStatus("Saving...");
    const { error } = await supabase.from("users").upsert({
      id: user.id,
      name: formData.name,
      craft: formData.craft,
      role: formData.role,
      local_id: formData.localId,
      local_name: formData.localName,
      email: user.emailAddresses[0].emailAddress
    });
    if (error) {
      setStatus("❌ Error: " + error.message);
    } else {
      setStatus("✅ Profile saved!");
    }
  };

  // Add client-safe PDF upload and extraction function
  const uploadPdfAndExtract = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/extract-pdf", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    return data.text;
  };

  const handleLMOUUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setStatus("Uploading LMOU...");
    let extractedText = "";
    if (file.type === "application/pdf") {
      extractedText = await uploadPdfAndExtract(file);
    } else if (file.name.endsWith(".docx")) {
      extractedText = await extractDocxText(file);
    } else {
      setStatus("❌ Unsupported file type");
      return;
    }
    if (!extractedText) {
      setStatus("❌ Extraction failed");
      return;
    }
    // Upload file to Supabase Storage
    const filePath = `lmou/${user.publicMetadata?.local_id || formData.localId}/${file.name}`;
    const { error: uploadError } = await supabase.storage.from("lmou").upload(filePath, file, { upsert: true });
    if (uploadError) {
      setStatus("❌ Upload failed: " + uploadError.message);
      return;
    }
    // Insert LMOU record
    const { data: lmouRow, error: lmouError } = await supabase.from("lmou_library").insert({
      local_id: user.publicMetadata?.local_id || formData.localId,
      file_url: filePath,
      extracted_text: extractedText,
      status: "active",
      uploaded_at: new Date().toISOString()
    }).select().single();
    if (lmouError) {
      setStatus("❌ DB insert failed: " + lmouError.message);
      return;
    }
    // Chunk and insert into local_chunks
    const chunks = chunkText(extractedText, 1000);
    for (const chunk of chunks) {
      await supabase.from("local_chunks").insert({
        lmou_id: lmouRow.id,
        local_id: lmouRow.local_id,
        chunk_text: chunk,
        created_at: new Date().toISOString()
      });
    }
    setStatus("✅ LMOU uploaded, extracted, and chunked!");
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-xl font-bold mb-2">Steward Onboarding</h2>
        <input className="w-full border p-2" name="name" placeholder="Name" value={formData.name} onChange={handleChange} required />
        <input className="w-full border p-2" name="craft" placeholder="Craft" value={formData.craft} onChange={handleChange} required />
        <input className="w-full border p-2" name="localName" placeholder="Local Name" value={formData.localName} onChange={handleChange} required />
        <input className="w-full border p-2" name="localId" placeholder="Local ID" value={formData.localId} onChange={handleChange} required />
        <select className="w-full border p-2" name="role" value={formData.role} onChange={handleChange}>
          <option value="steward">Steward</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">Continue</button>
        {status && <div className="mt-2 text-center">{status}</div>}
      </form>
      <input
        type="file"
        accept=".pdf,.docx"
        onChange={handleLMOUUpload}
        className="w-full border p-2 mt-4"
      />
    </div>
  );
}
