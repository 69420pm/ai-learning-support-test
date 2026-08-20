import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getStorageDriver,
  LocalStorageDriver,
  resetStorageDriver,
  SupabaseStorageDriver,
} from './index';

const mockUpload = vi.fn();
const mockDownload = vi.fn();
const mockRemove = vi.fn();
const mockGetPublicUrl = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    storage: {
      from: vi.fn().mockReturnValue({
        upload: (...args: unknown[]) => mockUpload(...args),
        download: (...args: unknown[]) => mockDownload(...args),
        remove: (...args: unknown[]) => mockRemove(...args),
        getPublicUrl: (...args: unknown[]) => mockGetPublicUrl(...args),
      }),
    },
  }),
}));

describe('Storage Drivers', () => {
  const testBaseDir = path.join(process.cwd(), 'data', 'test-uploads');

  beforeEach(() => {
    vi.clearAllMocks();
    resetStorageDriver();
  });

  afterEach(async () => {
    try {
      await fs.rm(testBaseDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('LocalStorageDriver', () => {
    it('uploads string, Buffer, Uint8Array and Blob data', async () => {
      const driver = new LocalStorageDriver(testBaseDir);

      const res1 = await driver.upload('doc1.txt', 'Hello World', 'text/plain');
      expect(res1.path).toBe('doc1.txt');
      expect(res1.size).toBe(11);

      const downloaded1 = await driver.download('doc1.txt');
      expect(downloaded1.toString('utf-8')).toBe('Hello World');

      const buffer = Buffer.from('Buffer content');
      const res2 = await driver.upload('sub/doc2.bin', buffer);
      expect(res2.size).toBe(buffer.length);

      const downloaded2 = await driver.download('sub/doc2.bin');
      expect(downloaded2.toString('utf-8')).toBe('Buffer content');

      const blob = new Blob(['Blob content']);
      const res3 = await driver.upload('doc3.txt', blob);
      expect(res3.size).toBe(12);

      const uint8 = new Uint8Array([65, 66, 67]);
      const res4 = await driver.upload('doc4.txt', uint8);
      expect(res4.size).toBe(3);
    });

    it('sanitizes relative paths to prevent traversal', async () => {
      const driver = new LocalStorageDriver(testBaseDir);
      await driver.upload('../../escape.txt', 'Safe Content');

      const content = await driver.download('escape.txt');
      expect(content.toString('utf-8')).toBe('Safe Content');
    });

    it('deletes file safely and ignores non-existent files', async () => {
      const driver = new LocalStorageDriver(testBaseDir);
      await driver.upload('delete-me.txt', 'Bye');

      await driver.delete('delete-me.txt');
      await expect(driver.download('delete-me.txt')).rejects.toThrow();

      // Deleting again should not throw
      await expect(driver.delete('delete-me.txt')).resolves.not.toThrow();
    });

    it('returns file URL', async () => {
      const driver = new LocalStorageDriver(testBaseDir);
      const url = await driver.getUrl('test.txt');
      expect(url).toContain('file://');
      expect(url).toContain('test.txt');
    });
  });

  describe('SupabaseStorageDriver', () => {
    it('uploads to Supabase Storage and returns path and size', async () => {
      mockUpload.mockResolvedValueOnce({ data: { path: 'test.md' }, error: null });

      const driver = new SupabaseStorageDriver('test-bucket');
      const res = await driver.upload('test.md', 'Content', 'text/markdown');

      expect(res.path).toBe('test.md');
      expect(res.size).toBe(7);
      expect(mockUpload).toHaveBeenCalledWith('test.md', expect.any(Buffer), {
        contentType: 'text/markdown',
        upsert: true,
      });
    });

    it('throws error when Supabase upload fails', async () => {
      mockUpload.mockResolvedValueOnce({ data: null, error: { message: 'Bucket not found' } });

      const driver = new SupabaseStorageDriver('test-bucket');
      await expect(driver.upload('test.md', 'Content')).rejects.toThrow(
        'Supabase Storage upload failed: Bucket not found',
      );
    });

    it('downloads from Supabase Storage', async () => {
      const mockBlob = new Blob(['Downloaded text']);
      mockDownload.mockResolvedValueOnce({ data: mockBlob, error: null });

      const driver = new SupabaseStorageDriver('test-bucket');
      const buf = await driver.download('test.md');

      expect(buf.toString('utf-8')).toBe('Downloaded text');
    });

    it('deletes from Supabase Storage', async () => {
      mockRemove.mockResolvedValueOnce({ data: ['test.md'], error: null });

      const driver = new SupabaseStorageDriver('test-bucket');
      await driver.delete('test.md');

      expect(mockRemove).toHaveBeenCalledWith(['test.md']);
    });

    it('returns public URL from Supabase', async () => {
      mockGetPublicUrl.mockReturnValueOnce({
        data: { publicUrl: 'https://supabase.co/storage/v1/object/public/materials/test.md' },
      });

      const driver = new SupabaseStorageDriver('materials');
      const url = await driver.getUrl('test.md');

      expect(url).toBe('https://supabase.co/storage/v1/object/public/materials/test.md');
    });
  });

  describe('getStorageDriver factory', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      resetStorageDriver();
    });

    afterEach(() => {
      process.env = originalEnv;
      resetStorageDriver();
    });

    it('defaults to LocalStorageDriver', () => {
      delete process.env.STORAGE_DRIVER;
      delete process.env.LOCAL_MODE;

      const driver = getStorageDriver();
      expect(driver).toBeInstanceOf(LocalStorageDriver);
    });

    it('returns SupabaseStorageDriver when STORAGE_DRIVER=supabase and not local mode', () => {
      process.env.STORAGE_DRIVER = 'supabase';
      process.env.LOCAL_MODE = 'false';

      const driver = getStorageDriver();
      expect(driver).toBeInstanceOf(SupabaseStorageDriver);
    });

    it('returns LocalStorageDriver when LOCAL_MODE=true even if STORAGE_DRIVER=supabase', () => {
      process.env.STORAGE_DRIVER = 'supabase';
      process.env.LOCAL_MODE = 'true';

      const driver = getStorageDriver();
      expect(driver).toBeInstanceOf(LocalStorageDriver);
    });
  });
});
