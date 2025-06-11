"use client";

import React from "react";

type StewardAssistantProps = {
  summary: string;
  description: string;
  grievanceId: string;
};

// ✅ Use a single `_props` parameter, no destructuring
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function StewardAssistant(_props: StewardAssistantProps) {
  return (
    <div>
      <p className="text-sm text-gray-500">Steward Assistant loading...</p>
    </div>
  );
}
