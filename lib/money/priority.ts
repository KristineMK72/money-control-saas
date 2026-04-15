import type { Bucket } from "./types";
import { daysUntil } from "./utils";

/**
 * Score a bucket based on urgency + category + risk level
 */
export function scoreBucket(bucket: Bucket) {
  let score = 0;

  // ✅ FIX: use snake_case (Supabase standard)
  const d = daysUntil(bucket.due_date);

  if (d != null) {
    if (d <= 0) score += 40;
    else if (d <= 3) score += 30;
    else if (d <= 7) score += 20;
    else if (d <= 14) score += 10;
  }

  // category priority weights
  if (bucket.category === "housing") score += 30;
  if (bucket.category === "utilities") score += 20;
  if (bucket.category === "transportation") score += 20;
  if (bucket.category === "debt") score += 25;
  if (bucket.category === "food") score += 10;

  // risk type weighting
  if (bucket.kind === "loan") score += 10;
  if (bucket.kind === "credit") score += 5;

  // optional user focus boost
  if (bucket.focus) score += 10;

  // recurring urgency boost
  if (bucket.is_monthly) score += 5;

  return score;
}

/**
 * Sort buckets by priority score (highest urgency first)
 */
export function getPriorityBuckets(buckets: Bucket[]) {
  return [...buckets]
    .map((bucket) => ({
      bucket,
      score: scoreBucket(bucket),
    }))
    .sort((a, b) => b.score - a.score);
}
