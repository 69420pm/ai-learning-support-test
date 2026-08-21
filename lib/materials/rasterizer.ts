import sharp from 'sharp';
import { ChatbotError } from '@/lib/errors';

export type RasterizedPage = {
  pageNumber: number;
  imageBuffer: Buffer;
  width: number;
  height: number;
  mimeType: string;
};

export type RasterizeOptions = {
  maxDimension?: number;
  scale?: number;
  quality?: number;
};

const DEFAULT_MAX_DIMENSION = 1536;
const DEFAULT_SCALE = 1.5;

export function isPdf(mimeType: string, filename?: string): boolean {
  const normalizedMime = mimeType?.toLowerCase().trim() || '';
  const normalizedFilename = filename?.toLowerCase().trim() || '';

  if (
    normalizedMime === 'application/pdf' ||
    normalizedMime === 'application/x-pdf' ||
    normalizedMime.includes('pdf')
  ) {
    return true;
  }

  return normalizedFilename.endsWith('.pdf');
}

export function isImage(mimeType: string, filename?: string): boolean {
  const normalizedMime = mimeType?.toLowerCase().trim() || '';
  const normalizedFilename = filename?.toLowerCase().trim() || '';

  if (normalizedMime.startsWith('image/')) {
    return true;
  }

  const imageExtensions = [
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.gif',
    '.bmp',
    '.tiff',
    '.tif',
    '.avif',
  ];

  return imageExtensions.some((ext) => normalizedFilename.endsWith(ext));
}

export function isMultimodal(mimeType: string, filename?: string): boolean {
  return isPdf(mimeType, filename) || isImage(mimeType, filename);
}

export async function rasterizePdf(
  pdfBuffer: Buffer,
  options: RasterizeOptions = {},
): Promise<RasterizedPage[]> {
  const { maxDimension = DEFAULT_MAX_DIMENSION, scale = DEFAULT_SCALE } = options;

  try {
    const [{ createCanvas }, pdfjs] = await Promise.all([
      import('@napi-rs/canvas'),
      import('pdfjs-dist/legacy/build/pdf.mjs'),
    ]);
    const uint8 = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjs.getDocument({
      data: uint8,
      disableFontFace: true,
      verbosity: 0,
    });

    const doc = await loadingTask.promise;
    const numPages = doc.numPages;

    if (numPages === 0) {
      return [];
    }

    const pages: RasterizedPage[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const width = Math.max(1, Math.floor(viewport.width));
      const height = Math.max(1, Math.floor(viewport.height));

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      await page.render({
        canvasContext: ctx as unknown as CanvasRenderingContext2D,
        canvas: canvas as unknown as HTMLCanvasElement,
        viewport,
      }).promise;

      const rawPngBuffer = canvas.toBuffer('image/png');

      let sharpInstance = sharp(rawPngBuffer);
      if (width > maxDimension || height > maxDimension) {
        sharpInstance = sharpInstance.resize({
          width: maxDimension,
          height: maxDimension,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      const optimizedBuffer = await sharpInstance.png().toBuffer();
      const meta = await sharp(optimizedBuffer).metadata();

      pages.push({
        pageNumber: pageNum,
        imageBuffer: optimizedBuffer,
        width: meta.width || width,
        height: meta.height || height,
        mimeType: 'image/png',
      });
    }

    return pages;
  } catch (error) {
    if (error instanceof ChatbotError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Failed to rasterize PDF document';
    throw new ChatbotError('bad_request:document', message);
  }
}

export async function rasterizeImage(
  imageBuffer: Buffer,
  options: RasterizeOptions = {},
): Promise<RasterizedPage[]> {
  const { maxDimension = DEFAULT_MAX_DIMENSION } = options;

  try {
    let sharpInstance = sharp(imageBuffer);
    const meta = await sharpInstance.metadata();

    if (!meta.width || !meta.height) {
      throw new Error('Invalid image dimensions');
    }

    if (meta.width > maxDimension || meta.height > maxDimension) {
      sharpInstance = sharpInstance.resize({
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    const normalizedBuffer = await sharpInstance.png().toBuffer();
    const finalMeta = await sharp(normalizedBuffer).metadata();

    return [
      {
        pageNumber: 1,
        imageBuffer: normalizedBuffer,
        width: finalMeta.width || meta.width,
        height: finalMeta.height || meta.height,
        mimeType: 'image/png',
      },
    ];
  } catch (error) {
    if (error instanceof ChatbotError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Failed to rasterize image';
    throw new ChatbotError('bad_request:document', message);
  }
}

export async function rasterizeDocument(
  buffer: Buffer,
  fileType: string,
  filename?: string,
  options: RasterizeOptions = {},
): Promise<RasterizedPage[]> {
  if (isPdf(fileType, filename)) {
    return await rasterizePdf(buffer, options);
  }

  if (isImage(fileType, filename)) {
    return await rasterizeImage(buffer, options);
  }

  throw new ChatbotError(
    'bad_request:document',
    `Unsupported file type for rasterization: ${fileType} (${filename || 'unnamed'})`,
  );
}
