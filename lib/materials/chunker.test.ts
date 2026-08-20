import { describe, expect, it } from 'vitest';
import { chunkMarkdown, estimateTokenCount } from './chunker';

describe('Markdown Chunker', () => {
  it('estimates token counts accurately', () => {
    expect(estimateTokenCount('')).toBe(0);
    expect(estimateTokenCount('   ')).toBe(0);
    expect(estimateTokenCount('Hello world')).toBeGreaterThanOrEqual(2);
    expect(
      estimateTokenCount('This is a longer sentence with several words.'),
    ).toBeGreaterThanOrEqual(8);
  });

  it('returns empty array for empty or whitespace text', () => {
    expect(chunkMarkdown('')).toEqual([]);
    expect(chunkMarkdown('   \n\n  ')).toEqual([]);
  });

  it('returns a single chunk when document is within maxTokens', () => {
    const markdown = `# Introduction to Linear Algebra
A vector space is a set of objects called vectors, which may be added together and multiplied by numbers.

## Subspaces
A subspace is a subset that is closed under addition and scalar multiplication.`;

    const chunks = chunkMarkdown(markdown, { maxTokens: 800 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].content).toContain('Introduction to Linear Algebra');
    expect(chunks[0].content).toContain('Subspaces');
    expect(chunks[0].tokenCount).toBeGreaterThan(10);
    expect(chunks[0].metadata.heading).toBe('Introduction to Linear Algebra');
  });

  it('splits sections when exceeding maxTokens or minTokens on new heading', () => {
    const section1 = `# Chapter 1: Foundations\n${'This is section 1 paragraph text. '.repeat(40)}`;
    const section2 = `# Chapter 2: Vector Spaces\n${'This is section 2 paragraph text. '.repeat(40)}`;
    const markdown = `${section1}\n\n${section2}`;

    const chunks = chunkMarkdown(markdown, { minTokens: 50, maxTokens: 200, targetTokens: 100 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);

    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].metadata.heading).toBe('Chapter 1: Foundations');
    expect(chunks[1].chunkIndex).toBe(1);
    expect(chunks.every((c) => c.tokenCount <= 250)).toBe(true);
  });

  it('splits oversized paragraphs gracefully', () => {
    const hugeParagraph = 'The quick brown fox jumps over the lazy dog. '.repeat(100);
    const chunks = chunkMarkdown(hugeParagraph, { maxTokens: 100 });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeGreaterThan(0);
      expect(chunk.chunkIndex).toBeDefined();
    }
  });

  it('preserves code blocks without breaking syntax when possible', () => {
    const markdown = `# Code Example
Here is a Python function:

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
\`\`\`

And some following explanation.`;

    const chunks = chunkMarkdown(markdown, { maxTokens: 500 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toContain('```python');
    expect(chunks[0].content).toContain('def fibonacci(n):');
  });
});
