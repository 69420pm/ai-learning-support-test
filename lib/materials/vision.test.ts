import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it, vi } from 'vitest';
import { MATERIAL_VISION_INGESTION_PROMPT } from '@/lib/ai/prompts';
import type { RasterizedPage } from './rasterizer';
import { extractMarkdownFromPage, extractMarkdownFromPages } from './vision';

function createDummyPage(pageNumber: number, textContent = 'dummy'): RasterizedPage {
  return {
    pageNumber,
    imageBuffer: Buffer.from(`fake-png-buffer-${pageNumber}-${textContent}`),
    width: 800,
    height: 600,
    mimeType: 'image/png',
  };
}

describe('Vision Extraction Engine', () => {
  it('extracts structured Markdown from a single rasterized page', async () => {
    const mockResponseText = `# Slide 1: System Overview

| Component | Role |
|---|---|
| Ingest | Node.js |

\`\`\`mermaid
flowchart LR
  A --> B
\`\`\``;

    const mockModel = new MockLanguageModelV4({
      doGenerate: ({ prompt }) => {
        expect(prompt[0].role).toBe('user');
        expect(prompt[0].content).toHaveLength(2);
        return Promise.resolve({
          content: [{ type: 'text', text: mockResponseText }],
          finishReason: { unified: 'stop', raw: 'stop' },
          usage: {
            inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 50, text: 50, reasoning: 0 },
          },
          warnings: [],
        });
      },
    });

    const page = createDummyPage(1);
    const result = await extractMarkdownFromPage(page, { model: mockModel });

    expect(result.pageNumber).toBe(1);
    expect(result.markdown).toContain('# Slide 1: System Overview');
    expect(result.markdown).toContain('| Component | Role |');
    expect(result.markdown).toContain('```mermaid');
    expect(result.tokenUsage?.promptTokens).toBe(100);
    expect(result.tokenUsage?.completionTokens).toBe(50);
  });

  it('extracts Markdown from multiple pages preserving page order and calling onProgress', async () => {
    const pages = [createDummyPage(1), createDummyPage(2), createDummyPage(3)];

    let callCount = 0;
    const mockModel = new MockLanguageModelV4({
      doGenerate: () => {
        callCount++;
        const pageNum = callCount;
        return Promise.resolve({
          content: [{ type: 'text', text: `# Page ${pageNum} Content` }],
          finishReason: { unified: 'stop', raw: 'stop' },
          usage: {
            inputTokens: { total: 50, noCache: 50, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 20, text: 20, reasoning: 0 },
          },
          warnings: [],
        });
      },
    });

    const progressCalls: Array<{ completed: number; total: number; pageNumber: number }> = [];
    const onProgress = vi.fn((completed, total, pageNumber) => {
      progressCalls.push({ completed, total, pageNumber });
    });

    const results = await extractMarkdownFromPages(pages, {
      model: mockModel,
      concurrency: 2,
      onProgress,
    });

    expect(results).toHaveLength(3);
    expect(results[0].pageNumber).toBe(1);
    expect(results[0].markdown).toBe('# Page 1 Content');
    expect(results[1].pageNumber).toBe(2);
    expect(results[1].markdown).toBe('# Page 2 Content');
    expect(results[2].pageNumber).toBe(3);
    expect(results[2].markdown).toBe('# Page 3 Content');

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(progressCalls[progressCalls.length - 1].completed).toBe(3);
    expect(progressCalls[progressCalls.length - 1].total).toBe(3);
  });

  it('validates standard vision ingestion prompt contains essential rules', () => {
    expect(MATERIAL_VISION_INGESTION_PROMPT).toContain('Markdown headings');
    expect(MATERIAL_VISION_INGESTION_PROMPT).toContain('tables');
    expect(MATERIAL_VISION_INGESTION_PROMPT).toContain('mermaid');
    expect(MATERIAL_VISION_INGESTION_PROMPT).toContain('Handwritten');
  });

  it('handles empty page array gracefully', async () => {
    const results = await extractMarkdownFromPages([]);
    expect(results).toEqual([]);
  });

  it('propagates errors when LLM generation fails', async () => {
    const failingModel = new MockLanguageModelV4({
      doGenerate: () => Promise.reject(new Error('API rate limit reached')),
    });

    const page = createDummyPage(1);
    await expect(extractMarkdownFromPage(page, { model: failingModel })).rejects.toThrow(
      'API rate limit reached',
    );
  });
});
