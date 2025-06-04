"use client";

import { useState } from "react";

export default function FileDropzone({ files, setFiles }: { files: File[]; setFiles: (files: File[]) => void }) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.size <= 10 * 1024 * 1024);
    setFiles([...files, ...droppedFiles]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files).filter(f => f.size <= 10 * 1024 * 1024) : [];
    setFiles([...files, ...selected]);
  };

  return (
    <div
      className={`border-2 border-dashed rounded p-4 text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-gray-800' : 'border-gray-300 dark:border-gray-600'}`}
      onDragOver={e => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={e => { e.preventDefault(); setDragActive(false); }}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple
        accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg"
        className="hidden"
        id="file-upload"
        onChange={handleChange}
      />
      <label htmlFor="file-upload" className="cursor-pointer text-blue-600 dark:text-blue-400 underline">
        Click or drag files here to upload (max 10MB each)
      </label>
      {files.length > 0 && (
        <ul className="mt-3 text-left text-xs">
          {files.map((file, idx) => (
            <li key={idx} className="truncate text-gray-700 dark:text-gray-200">{file.name} <span className="text-gray-400">({(file.size/1024/1024).toFixed(2)} MB)</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}
