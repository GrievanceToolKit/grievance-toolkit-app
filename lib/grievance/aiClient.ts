/**
 * Formats the AI prompt for consistency and calls the backend API for analysis.
 * Returns the parsed response or throws on error.
 */

interface GrievanceAIResponse {
  summary: string;
  detectedViolations: unknown[];
  recommendedActions: string;
}

export async function analyzeGrievance(summary: string, description: string, grievanceId?: string): Promise<GrievanceAIResponse> {
  const prompt = `\nYou are a grievance analyst.\nSummary: ${summary}\nDescription: ${description}\nFormat: {\n  \"summary\": \"...\",\n  \"detectedViolations\": [ ... ],\n  \"recommendedActions\": \"...\"\n}\nOnly return valid JSON. No markdown or code blocks.`;

  const res = await fetch("/api/assistant/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, grievanceId }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (typeof data.error === 'string') throw new Error(data.error);
  return {
    summary: typeof data.summary === 'string' ? data.summary : (typeof data.rewritten_summary === 'string' ? data.rewritten_summary : ""),
    detectedViolations: Array.isArray(data.detectedViolations) ? data.detectedViolations : (Array.isArray(data.violations) ? data.violations : []),
    recommendedActions: typeof data.recommendedActions === 'string' ? data.recommendedActions : (typeof data.actions === 'string' ? data.actions : ""),
  };
}
