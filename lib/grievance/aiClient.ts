/**
 * Formats the AI prompt for consistency and calls the backend API for analysis.
 * Returns the parsed response or throws on error.
 */
export async function analyzeGrievance(summary: string, description: string, grievanceId?: string): Promise<any> {
  const prompt = `\nYou are a grievance analyst.\nSummary: ${summary}\nDescription: ${description}\nFormat: {\n  \"summary\": \"...\",\n  \"detectedViolations\": [ ... ],\n  \"recommendedActions\": \"...\"\n}\nOnly return valid JSON. No markdown or code blocks.`;

  const res = await fetch("/api/assistant/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, grievanceId }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return {
    summary: data.summary || data.rewritten_summary || "",
    detectedViolations: data.detectedViolations || data.violations || [],
    recommendedActions: data.recommendedActions || data.actions || "",
  };
}
