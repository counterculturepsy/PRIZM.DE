export const leadPriorities = ["low", "possible", "good", "high", "priority"] as const;
export type LeadPriority = (typeof leadPriorities)[number];

export function classifyPriority(score: number): LeadPriority {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new RangeError("Lead score must be a finite number from 0 to 100.");
  }
  if (score >= 85) return "priority";
  if (score >= 70) return "high";
  if (score >= 50) return "good";
  if (score >= 30) return "possible";
  return "low";
}
