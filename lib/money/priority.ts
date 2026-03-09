import type { Bucket } from "./types";
import { daysUntil } from "./utils";

export function scoreBucket(bucket: Bucket) {
  let score = 0;

  const d = daysUntil(bucket.dueDate);

  if (d != null) {
    if (d <= 0) score += 40;
    else if (d <= 3) score += 30;
    else if (d <= 7) score += 20;
    else if (d <= 14) score += 10;
  }

  if (bucket.category === "housing") score += 30;
  if (bucket.category === "utilities") score += 20;
  if (bucket.category === "transportation") score += 20;

  if (bucket.kind === "loan") score += 10;
  if (bucket.kind === "credit") score += 5;

  if (bucket.focus) score += 10;

  return score;
}

export function getPriorityBuckets(buckets: Bucket[]) {
  return [...buckets]
    .map((bucket) => ({ bucket, score: scoreBucket(bucket) }))
    .sort((a, b) => b.score - a.score);
}
