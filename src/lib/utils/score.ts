/**
 * Score colour thresholds — used by ScoreCircle and RatingHistogram.
 */
export function scoreColor(score: number): string {
  if (score >= 4.2) return "#22C55E"; // cracked-success
  if (score >= 3.5) return "#F59E0B"; // cracked-warning
  return "#EF4444";                   // cracked-danger
}

export function scoreTailwind(score: number): string {
  if (score >= 4.2) return "text-cracked-success";
  if (score >= 3.5) return "text-cracked-warning";
  return "text-cracked-danger";
}

export function scoreLabel(score: number): string {
  if (score >= 4.5) return "Outstanding";
  if (score >= 4.2) return "Excellent";
  if (score >= 3.8) return "Very Good";
  if (score >= 3.5) return "Good";
  if (score >= 3.0) return "Average";
  return "Below Average";
}
