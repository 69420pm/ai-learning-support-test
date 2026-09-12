import sharp from 'sharp';

export function createMinimalPdfBuffer(pageCount = 1): Buffer {
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

export async function createTestImageBuffer(
  width = 200,
  height = 200,
  format: 'png' | 'jpeg' = 'png',
): Promise<Buffer> {
  const pipeline = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 100, g: 150, b: 200, alpha: 1 },
    },
  });

  if (format === 'jpeg') {
    return await pipeline.jpeg().toBuffer();
  }
  return await pipeline.png().toBuffer();
}
