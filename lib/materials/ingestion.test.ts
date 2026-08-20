import sharp from 'sharp';
import { describe, expect, it, vi } from 'vitest';
import { generateEmbeddings } from '@/lib/ai/embedding';
import {
  chunkMultimodalPages,
  extractMarkdownFromPages,
  isMultimodal,
  rasterizeDocument,
} from './index';

function createMinimalPdfBuffer(pageCount = 2): Buffer {
  let pdf =
    '%PDF-1.4\n1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n2 0 obj <</Type /Pages /Kids [';
  const pageObjNums: number[] = [];
  let currentObj = 3;

  for (let i = 0; i < pageCount; i++) {
    pageObjNums.push(currentObj);
    currentObj += 2;
  }

  pdf += `${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageCount}>> endobj\n`;

  for (let i = 0; i < pageCount; i++) {
    const pageNum = pageObjNums[i];
    const contentsNum = pageNum + 1;
    pdf += `${pageNum} 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources <<>> /Contents ${contentsNum} 0 R>> endobj\n`;
    pdf += `${contentsNum} 0 obj <</Length 24>> stream\n0 0 200 200 re f\nendstream\nendobj\n`;
  }

  pdf += 'xref\n0 1\n0000000000 65535 f \ntrailer <</Size 10 /Root 1 0 R>>\nstartxref\n100\n%%EOF';
  return Buffer.from(pdf);
}

async function createTestImageBuffer(width = 300, height = 200): Promise<Buffer> {
  return await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 64, g: 128, b: 192, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

describe('Multimodal Ingestion Pipeline Integration', () => {
  it('executes full rasterization -> vision extraction -> page-attributed chunking -> embedding pipeline for multi-page PDF', async () => {
    // 1. PDF Buffer
    const pdfBuffer = createMinimalPdfBuffer(2);
    expect(isMultimodal('application/pdf', 'sample.pdf')).toBe(true);

    // 2. Rasterize PDF into pages
    const pages = await rasterizeDocument(pdfBuffer, 'application/pdf', 'sample.pdf');
    expect(pages).toHaveLength(2);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[1].pageNumber).toBe(2);
    expect(pages[0].imageBuffer).toBeInstanceOf(Buffer);
    expect(pages[1].imageBuffer).toBeInstanceOf(Buffer);

    // 3. Vision Extraction (Mock Language Model)
    const progressHistory: Array<{ completed: number; total: number; page: number }> = [];
    const mockModel = {
      specificationVersion: 'v2' as const,
      provider: 'mock',
      modelId: 'mock-vision',
      doGenerate: vi.fn().mockImplementation(({ prompt }) => {
        const filePart = prompt[0].content.find((c: { type: string }) => c.type === 'file');
        expect(filePart).toBeDefined();

        return Promise.resolve({
          content: [
            {
              type: 'text',
              text: `# Slide Topic\n\n| Param | Value |\n|---|---|\n| Accuracy | 99% |\n\n\`\`\`mermaid\ngraph TD\n  Start --> End\n\`\`\``,
            },
          ],
          finishReason: { unified: 'stop', raw: 'stop' },
          usage: { inputTokens: { total: 100 }, outputTokens: { total: 40 } },
          warnings: [],
        });
      }),
      doStream: vi.fn(),
    };

    const visionResults = await extractMarkdownFromPages(pages, {
      model: mockModel as never,
      concurrency: 2,
      onProgress: (completed, total, page) => {
        progressHistory.push({ completed, total, page });
      },
    });

    expect(visionResults).toHaveLength(2);
    expect(progressHistory).toHaveLength(2);
    expect(visionResults[0].pageNumber).toBe(1);
    expect(visionResults[0].markdown).toContain('Accuracy');
    expect(visionResults[0].markdown).toContain('```mermaid');
    expect(visionResults[1].pageNumber).toBe(2);

    // 4. Page-attributed Chunking
    const chunks = chunkMultimodalPages(visionResults);
    expect(chunks).toHaveLength(2);

    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].metadata.pageNumber).toBe(1);
    expect(chunks[0].metadata.heading).toBe('Slide Topic');
    expect(chunks[0].content).toContain('Accuracy');

    expect(chunks[1].chunkIndex).toBe(1);
    expect(chunks[1].metadata.pageNumber).toBe(2);
    expect(chunks[1].metadata.heading).toBe('Slide Topic');

    // 5. Generate 768d Vector Embeddings
    const contents = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(contents);

    expect(embeddings).toHaveLength(2);
    expect(embeddings[0]).toHaveLength(768);
    expect(embeddings[1]).toHaveLength(768);
  });

  it('executes full pipeline for standalone whiteboard / mindmap image', async () => {
    // 1. Create test image
    const imageBuffer = await createTestImageBuffer(400, 300);
    expect(isMultimodal('image/png', 'mindmap.png')).toBe(true);

    // 2. Rasterize
    const pages = await rasterizeDocument(imageBuffer, 'image/png', 'mindmap.png');
    expect(pages).toHaveLength(1);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[0].width).toBe(400);
    expect(pages[0].height).toBe(300);

    // 3. Vision Extraction
    const mockModel = {
      specificationVersion: 'v2' as const,
      provider: 'mock',
      modelId: 'mock-vision',
      doGenerate: vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '# Handwritten Lecture Notes\n\n> **Handwritten Note:** FSRS memory decay factor R = e^(-t/S)',
          },
        ],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: { inputTokens: { total: 50 }, outputTokens: { total: 25 } },
        warnings: [],
      }),
      doStream: vi.fn(),
    };

    const visionResults = await extractMarkdownFromPages(pages, { model: mockModel as never });
    expect(visionResults).toHaveLength(1);
    expect(visionResults[0].pageNumber).toBe(1);
    expect(visionResults[0].markdown).toContain('FSRS memory decay factor');

    // 4. Chunking
    const chunks = chunkMultimodalPages(visionResults);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].metadata.pageNumber).toBe(1);
    expect(chunks[0].metadata.heading).toBe('Handwritten Lecture Notes');

    // 5. Dense 768d Embeddings
    const embeddings = await generateEmbeddings([chunks[0].content]);
    expect(embeddings).toHaveLength(1);
    expect(embeddings[0]).toHaveLength(768);
  });

  it('rejects corrupted document during rasterization phase', async () => {
    const corruptedBuffer = Buffer.from('Corrupted file stream data');
    await expect(
      rasterizeDocument(corruptedBuffer, 'application/pdf', 'corrupted.pdf'),
    ).rejects.toThrow();
  });
});
