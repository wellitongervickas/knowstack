/**
 * Keyword scoring utility for instructions.
 *
 * Splits a query into terms, counts occurrences (sublinear TF)
 * in name/description/content, and applies weighted scoring
 * normalized by term count.
 */

interface ScoringWeights {
  NAME: number;
  DESCRIPTION: number;
  CONTENT: number;
}

interface Scorable {
  id: string;
  name: string;
  description: string;
  content: string;
}

/**
 * Count non-overlapping occurrences of a substring in a string.
 */
function countOccurrences(text: string, term: string): number {
  if (term.length === 0) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(term, pos)) !== -1) {
    count++;
    pos += term.length;
  }
  return count;
}

/**
 * Compute sublinear TF score for a term in a field.
 * Single occurrence: 1 + log(1) = 1 (same as binary match).
 * Multiple occurrences: 1 + log(n) (rewards repeated relevance).
 */
function sublinearTfScore(count: number, weight: number): number {
  if (count === 0) return 0;
  return (1 + Math.log(count)) * weight;
}

/**
 * Score items by keyword matching against name, description, and content.
 * Uses sublinear TF scoring: single matches behave identically to binary,
 * multiple occurrences receive a logarithmic boost.
 *
 * @param items - Items to score (must have id, name, description, content)
 * @param query - Search query string
 * @param weights - Scoring weights for each field
 * @returns Array of { id, score } sorted by input order
 */
export function scoreByKeywords<T extends Scorable>(
  items: T[],
  query: string,
  weights: ScoringWeights,
): { id: string; score: number }[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (terms.length === 0) {
    return items.map((i) => ({ id: i.id, score: 0 }));
  }

  return items.map((item) => {
    const nameLower = item.name.toLowerCase();
    const descLower = item.description.toLowerCase();
    const contentLower = item.content.toLowerCase();

    let totalScore = 0;

    for (const term of terms) {
      const nameCount = countOccurrences(nameLower, term);
      const descCount = countOccurrences(descLower, term);
      const contentCount = countOccurrences(contentLower, term);

      const termScore =
        sublinearTfScore(nameCount, weights.NAME) +
        sublinearTfScore(descCount, weights.DESCRIPTION) +
        sublinearTfScore(contentCount, weights.CONTENT);

      totalScore += termScore;
    }

    const score = Math.min(Math.round((totalScore / terms.length) * 100) / 100, 1);

    return { id: item.id, score };
  });
}
