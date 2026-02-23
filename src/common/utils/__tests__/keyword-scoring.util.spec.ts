import { describe, it, expect } from 'vitest';
import { scoreByKeywords } from '@/common/utils/keyword-scoring.util';

const weights = { NAME: 0.4, DESCRIPTION: 0.3, CONTENT: 0.2 };

const createItem = (
  overrides: Partial<{ id: string; name: string; description: string; content: string }> = {},
) => ({
  id: 'item-1',
  name: 'test',
  description: 'description',
  content: 'content',
  ...overrides,
});

describe('scoreByKeywords', () => {
  it('should return 0 for empty query', () => {
    const items = [createItem()];
    const result = scoreByKeywords(items, '   ', weights);
    expect(result[0].score).toBe(0);
  });

  it('should return 0 for no matches', () => {
    const items = [createItem()];
    const result = scoreByKeywords(items, 'nonexistent', weights);
    expect(result[0].score).toBe(0);
  });

  it('should score single occurrence same as binary for backward compatibility', () => {
    const items = [
      createItem({ name: 'architect', description: 'designs systems', content: 'no match' }),
    ];
    // "architect" appears once in name → sublinear TF: (1 + log(1)) * 0.4 = 1 * 0.4 = 0.4
    const result = scoreByKeywords(items, 'architect', weights);
    expect(result[0].score).toBe(0.4);
  });

  it('should reward multiple occurrences with logarithmic boost', () => {
    const singleItem = createItem({ id: 'single', content: 'architect builds' });
    const multiItem = createItem({ id: 'multi', content: 'architect architect architect builds' });
    const result = scoreByKeywords([singleItem, multiItem], 'architect', weights);

    const singleScore = result.find((r) => r.id === 'single')!.score;
    const multiScore = result.find((r) => r.id === 'multi')!.score;

    expect(multiScore).toBeGreaterThan(singleScore);
  });

  it('should clamp score to 1.0 maximum', () => {
    // Create item where term appears many times in all fields
    const items = [
      createItem({
        name: 'test test test test test',
        description: 'test test test test test test test test test test',
        content:
          'test test test test test test test test test test test test test test test test test test test test',
      }),
    ];
    const result = scoreByKeywords(items, 'test', { NAME: 0.4, DESCRIPTION: 0.3, CONTENT: 0.2 });
    expect(result[0].score).toBeLessThanOrEqual(1);
  });

  it('should handle multi-term queries', () => {
    const items = [
      createItem({ name: 'clean architecture', description: 'design patterns', content: 'solid' }),
    ];
    const result = scoreByKeywords(items, 'clean architecture', weights);
    expect(result[0].score).toBeGreaterThan(0);
  });

  it('should be case insensitive', () => {
    const items = [createItem({ name: 'Architect', description: 'DESIGNS', content: 'Systems' })];
    const upper = scoreByKeywords(items, 'ARCHITECT', weights);
    const lower = scoreByKeywords(items, 'architect', weights);
    expect(upper[0].score).toBe(lower[0].score);
  });

  it('should apply different weights per field', () => {
    const nameItem = createItem({
      id: 'name',
      name: 'architect',
      description: 'no match',
      content: 'no match',
    });
    const contentItem = createItem({
      id: 'content',
      name: 'no match',
      description: 'no match',
      content: 'architect',
    });
    const result = scoreByKeywords([nameItem, contentItem], 'architect', weights);

    const nameScore = result.find((r) => r.id === 'name')!.score;
    const contentScore = result.find((r) => r.id === 'content')!.score;

    // NAME weight (0.4) > CONTENT weight (0.2)
    expect(nameScore).toBeGreaterThan(contentScore);
  });
});
