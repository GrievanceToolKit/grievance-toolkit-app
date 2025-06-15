import React from "react";

interface Violation {
  article_number: string;
  article_title: string;
  violation_reason: string;
}

export function ViolationsList({ violations }: { violations: Violation[] }) {
  if (!violations || violations.length === 0) return null;
  return (
    <div className="mt-4">
      <h3 className="text-lg font-bold">📜 Detected Violations</h3>
      <ul className="list-disc list-inside space-y-2">
        {violations.map((v, i) => (
          <li key={i}>
            <strong>{v.article_number} – {v.article_title}:</strong> {v.violation_reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
