// Helper to calculate days remaining from a start date and deadline (in days)
export function daysRemaining(from: string, deadlineDays: number) {
  const start = new Date(from);
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(deadlineDays - elapsed, 0);
}
