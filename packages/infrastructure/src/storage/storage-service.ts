import type { Buffer } from 'node:buffer';

export interface StorageService {
  uploadFile(path: string, file: Buffer): Promise<string>;
  getFile(path: string): Promise<Buffer>;
  deleteFile(path: string): Promise<void>;
  getFileUrl(path: string): Promise<string>;
}
