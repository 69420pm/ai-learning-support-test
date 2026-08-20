import { createClient } from '@/lib/supabase/server';
import type { StorageDriver } from './types';

export class SupabaseStorageDriver implements StorageDriver {
  private bucket: string;

  constructor(bucket: string = process.env.SUPABASE_STORAGE_BUCKET || 'materials') {
    this.bucket = bucket;
  }

  async upload(
    filePath: string,
    data: Buffer | Uint8Array | Blob | string,
    contentType?: string,
  ): Promise<{ path: string; size: number }> {
    const supabase = await createClient();
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

    const { error } = await supabase.storage.from(this.bucket).upload(filePath, buffer, {
      contentType: contentType || 'application/octet-stream',
      upsert: true,
    });

    if (error) {
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }

    return { path: filePath, size: buffer.length };
  }

  async download(filePath: string): Promise<Buffer> {
    const supabase = await createClient();
    const { data, error } = await supabase.storage.from(this.bucket).download(filePath);
    if (error || !data) {
      throw new Error(`Supabase Storage download failed: ${error?.message || 'Unknown error'}`);
    }
    const arrayBuf = await data.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  async delete(filePath: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.storage.from(this.bucket).remove([filePath]);
    if (error) {
      throw new Error(`Supabase Storage delete failed: ${error.message}`);
    }
  }

  async getUrl(filePath: string): Promise<string> {
    const supabase = await createClient();
    const { data } = supabase.storage.from(this.bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }
}
