import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getMatchBadgeClass, MaterialSearchWidget } from './material-search-widget';

describe('MaterialSearchWidget', () => {
  it('computes correct badge class based on similarity', () => {
    expect(getMatchBadgeClass(0.85)).toContain('emerald');
    expect(getMatchBadgeClass(0.65)).toContain('blue');
    expect(getMatchBadgeClass(0.42)).toContain('amber');
  });

  it('renders searching state with query and spinner', () => {
    const html = renderToString(
      <MaterialSearchWidget query="gradient descent" status="searching" />,
    );

    expect(html).toContain('Searching project materials');
    expect(html).toContain('gradient descent');
    expect(html).toContain('animate-spin');
  });

  it('renders completed state with source count and query', () => {
    const mockResults = [
      {
        materialId: 'mat-1',
        materialTitle: 'Deep Learning Lecture 3',
        pageNumber: 12,
        chunkIndex: 2,
        similarity: 0.88,
        content: 'Gradient descent optimization algorithm minimizes the loss function.',
      },
    ];

    const html = renderToString(
      <MaterialSearchWidget
        query="gradient descent"
        status="completed"
        results={mockResults}
        defaultExpanded={true}
      />,
    );

    expect(html).toContain('Found 1 relevant source');
    expect(html).toContain('Deep Learning Lecture 3');
    expect(html).toContain('Page 12');
    expect(html).toContain('88% match');
    expect(html).toContain('gradient descent');
  });

  it('renders error state with error message', () => {
    const html = renderToString(
      <MaterialSearchWidget query="quantum computing" status="error" error="Index timeout" />,
    );

    expect(html).toContain('Material search failed: Index timeout');
    expect(html).toContain('text-destructive');
  });

  it('renders empty result message when expanded with 0 results', () => {
    const html = renderToString(
      <MaterialSearchWidget
        query="missing topic"
        status="completed"
        results={[]}
        defaultExpanded={true}
      />,
    );

    expect(html).toContain('No matching material chunks found');
  });
});
