import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  isImage,
  isMultimodal,
  isPdf,
  rasterizeDocument,
  rasterizeImage,
  rasterizePdf,
} from './rasterizer';

function createMinimalPdfBuffer(pageCount = 1): Buffer {
  let pdf =
    '%PDF-1.4\n1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n2 0 obj <</Type /Pages /Kids [';
  const pageObjNums: number[] = [];
  let currentObj = 3;

  for (let i = 0; i < pageCount; i++) {
    pageObjNums.push(currentObj);
    currentObj += 2; // page obj and contents obj
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

async function createTestImageBuffer(
  width = 200,
  height = 200,
  format: 'png' | 'jpeg' = 'png',
): Promise<Buffer> {
  const image = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 50, g: 100, b: 150, alpha: 1 },
    },
  });

  if (format === 'jpeg') {
    return await image.jpeg().toBuffer();
  }
  return await image.png().toBuffer();
}

describe('Material Rasterization Pipeline', () => {
  describe('File type detection', () => {
    it('correctly identifies PDF mime types and extensions', () => {
      expect(isPdf('application/pdf')).toBe(true);
      expect(isPdf('application/x-pdf')).toBe(true);
      expect(isPdf('application/octet-stream', 'document.pdf')).toBe(true);
      expect(isPdf('text/plain', 'notes.txt')).toBe(false);
    });

    it('correctly identifies image mime types and extensions', () => {
      expect(isImage('image/png')).toBe(true);
      expect(isImage('image/jpeg')).toBe(true);
      expect(isImage('image/webp')).toBe(true);
      expect(isImage('application/octet-stream', 'photo.jpg')).toBe(true);
      expect(isImage('application/pdf', 'file.pdf')).toBe(false);
    });

    it('identifies multimodal files', () => {
      expect(isMultimodal('application/pdf')).toBe(true);
      expect(isMultimodal('image/png')).toBe(true);
      expect(isMultimodal('text/plain')).toBe(false);
      expect(isMultimodal('text/markdown')).toBe(false);
    });
  });

  describe('PDF rasterization', () => {
    it('rasterizes a single-page PDF into an image buffer', async () => {
      const pdfBuffer = createMinimalPdfBuffer(1);
      const pages = await rasterizePdf(pdfBuffer);

      expect(pages).toHaveLength(1);
      expect(pages[0].pageNumber).toBe(1);
      expect(pages[0].mimeType).toBe('image/png');
      expect(pages[0].width).toBeGreaterThan(0);
      expect(pages[0].height).toBeGreaterThan(0);
      expect(pages[0].imageBuffer).toBeInstanceOf(Buffer);

      const meta = await sharp(pages[0].imageBuffer).metadata();
      expect(meta.format).toBe('png');
    });

    it('rasterizes multi-page PDFs into sequential page image buffers', async () => {
      const pdfBuffer = createMinimalPdfBuffer(3);
      const pages = await rasterizePdf(pdfBuffer);

      expect(pages).toHaveLength(3);
      expect(pages.map((p) => p.pageNumber)).toEqual([1, 2, 3]);
      for (const page of pages) {
        expect(page.imageBuffer.length).toBeGreaterThan(0);
      }
    });

    it('resizes oversized PDF pages according to maxDimension option', async () => {
      const pdfBuffer = createMinimalPdfBuffer(1);
      const pages = await rasterizePdf(pdfBuffer, { maxDimension: 100, scale: 2.0 });

      expect(pages).toHaveLength(1);
      expect(pages[0].width).toBeLessThanOrEqual(100);
      expect(pages[0].height).toBeLessThanOrEqual(100);
    });

    it('throws error when parsing corrupted PDF', async () => {
      const corrupted = Buffer.from('Not a real PDF file content at all');
      await expect(rasterizePdf(corrupted)).rejects.toThrow();
    });
  });

  describe('Image rasterization', () => {
    it('rasterizes and normalizes standard PNG images', async () => {
      const imgBuffer = await createTestImageBuffer(300, 200, 'png');
      const pages = await rasterizeImage(imgBuffer);

      expect(pages).toHaveLength(1);
      expect(pages[0].pageNumber).toBe(1);
      expect(pages[0].mimeType).toBe('image/png');
      expect(pages[0].width).toBe(300);
      expect(pages[0].height).toBe(200);
    });

    it('rasterizes JPEG images to normalized PNG image buffers', async () => {
      const imgBuffer = await createTestImageBuffer(400, 300, 'jpeg');
      const pages = await rasterizeImage(imgBuffer);

      expect(pages).toHaveLength(1);
      expect(pages[0].pageNumber).toBe(1);
      expect(pages[0].width).toBe(400);
      expect(pages[0].height).toBe(300);
    });

    it('downscales images exceeding maxDimension', async () => {
      const largeImg = await createTestImageBuffer(2000, 1000, 'png');
      const pages = await rasterizeImage(largeImg, { maxDimension: 1000 });

      expect(pages).toHaveLength(1);
      expect(pages[0].width).toBeLessThanOrEqual(1000);
      expect(pages[0].height).toBeLessThanOrEqual(1000);
    });

    it('throws error when image buffer is corrupted', async () => {
      const corrupted = Buffer.from('corrupted raw image bytes');
      await expect(rasterizeImage(corrupted)).rejects.toThrow();
    });
  });

  describe('rasterizeDocument dispatcher', () => {
    it('dispatches PDF files to rasterizePdf', async () => {
      const pdfBuffer = createMinimalPdfBuffer(2);
      const pages = await rasterizeDocument(pdfBuffer, 'application/pdf', 'slides.pdf');

      expect(pages).toHaveLength(2);
      expect(pages[0].pageNumber).toBe(1);
      expect(pages[1].pageNumber).toBe(2);
    });

    it('dispatches image files to rasterizeImage', async () => {
      const imgBuffer = await createTestImageBuffer(150, 150, 'png');
      const pages = await rasterizeDocument(imgBuffer, 'image/png', 'mindmap.png');

      expect(pages).toHaveLength(1);
      expect(pages[0].pageNumber).toBe(1);
    });

    it('throws for unsupported non-multimodal document types', async () => {
      const textBuffer = Buffer.from('plain text');
      await expect(rasterizeDocument(textBuffer, 'text/plain', 'notes.txt')).rejects.toThrow();
    });
  });
});
