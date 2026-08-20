import fs from 'node:fs/promises';
import path from 'node:path';
import type { StorageDriver } from './types';

export class LocalStorageDriver implements StorageDriver {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir =
      baseDir || process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), 'data', 'uploads');
  }

  private resolveSafePath(relativePath: string): string {
    const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.baseDir, normalized);
  }

  async upload(
    filePath: string,
    data: Buffer | Uint8Array | Blob | string,
    _contentType?: string,
  ): Promise<{ path: string; size: number }> {
    const fullPath = this.resolveSafePath(filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    let buffer: Buffer;
    if (Buffer.isBuffer(data)) {
      buffer = data;
    } else if (data instanceof Uint8Array) {
      buffer = Buffer.from(data);
    } else if (typeof data === 'string') {
      buffer = Buffer.from(data, 'utf-8');
    } else if (typeof (data as Blob).arrayBuffer === 'function') {
      const arrayBuf = await (data as Blob).arrayBuffer();
      buffer = Buffer.from(arrayBuf);
    } else {
      buffer = Buffer.from(String(data));
    }

    await fs.writeFile(fullPath, buffer);
    return { path: filePath, size: buffer.length };
  }

  async download(filePath: string): Promise<Buffer> {
    const fullPath = this.resolveSafePath(filePath);
    return await fs.readFile(fullPath);
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = this.resolveSafePath(filePath);
    try {
      await fs.unlink(fullPath);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  getUrl(filePath: string): Promise<string> {
    const fullPath = this.resolveSafePath(filePath);
    return Promise.resolve(`file://${fullPath}`);
  }
}
