"use client";

import StewardAssistant from "@/components/StewardAssistant";

export default function AssistantPage({
  grievance,
}: {
  grievance: { summary: string; description: string; id: string };
}) {
  return (
    <StewardAssistant
      summary={grievance?.summary || ""}
      description={grievance?.description || ""}
      grievanceId={grievance?.id || ""}
    />
  );
}
