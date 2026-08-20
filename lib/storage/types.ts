export type StorageDriver = {
  upload(
    path: string,
    data: Buffer | Uint8Array | Blob | string,
    contentType?: string,
  ): Promise<{ path: string; size: number }>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  getUrl?(path: string): Promise<string>;
};
