/**
 * aiTurboMerge.js
 * 
 * Micro-module that safely combines AI signals from:
 * - Magic Fill
 * - Auto Fill
 * - AI Review
 *
 * This is the “brain stem” — it does NOT mutate user data
 * and does NOT update any fields yet.
 */

export function mergeAITurboSignals({ magic = {}, auto = {}, review = {} }) {
  const tips = [];

  // Collect from Magic Fill
  if (magic?.tips && Array.isArray(magic.tips)) {
    tips.push(...magic.tips.map((t) => ({ source: "magic", text: t })));
  }

  // Collect from Auto Fill
  if (auto?.tips && Array.isArray(auto.tips)) {
    tips.push(...auto.tips.map((t) => ({ source: "auto", text: t })));
  }

  // Collect from Review
  if (review?.suggestions && Array.isArray(review.suggestions)) {
    tips.push(...review.suggestions.map((t) => ({ source: "review", text: t })));
  }

  // Basic normalization
  const deduped = [];
  const seen = new Set();

  for (const item of tips) {
    const normalized = item.text.trim().toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      deduped.push(item);
    }
  }

  return deduped;
}
