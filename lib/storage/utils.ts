export async function toBuffer(data: Buffer | Uint8Array | Blob | string): Promise<Buffer> {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (data instanceof Uint8Array) {
    return Buffer.from(data);
  }
  if (typeof data === 'string') {
    return Buffer.from(data, 'utf-8');
  }
  const arrayBuf = await data.arrayBuffer();
  return Buffer.from(arrayBuf);
}
