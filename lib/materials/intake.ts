import { createMaterial } from '@/lib/db/queries/material';
import type { Material } from '@/lib/db/schema';
import { ChatbotError } from '@/lib/errors';
import { type MaterialIngestJobData, sendIngestJob } from '@/lib/queue';
import { getStorageDriver, type StorageDriver } from '@/lib/storage';
import { getFileExtension, inferMaterialFileType, validateMaterialFile } from './validation';

export type MaterialBufferPayload = {
  name?: string;
  data?: Buffer | Uint8Array | ArrayBuffer | Blob | string;
  type?: string;
  size?: number;
  filename?: string;
  buffer?: Buffer | Uint8Array | ArrayBuffer | Blob | string;
  fileType?: string;
  fileSize?: number;
};

export type MaterialIntakePayload = File | MaterialBufferPayload;

export type IntakeMaterialInput = {
  projectId: string;
  userId: string;
  file: MaterialIntakePayload;
  title?: string;
  metadata?: Record<string, unknown>;
};

export type IntakeMaterialOptions = {
  storageDriver?: StorageDriver;
  sendJob?: (jobData: MaterialIngestJobData) => Promise<string | null>;
};

export type IntakeMaterialResult = Material;

export { inferMaterialFileType };

/**
 * Strips path traversal sequences, replaces special characters with underscores,
 * and ensures a safe, non-empty filename for storage.
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'material';
  }

  // Strip path segments across POSIX and Windows separators
  const basename = filename.replace(/^.*[\\/]/, '').trim();
  const ext = getFileExtension(basename);
  const nameWithoutExt = ext ? basename.slice(0, -ext.length) : basename;

  const cleanName = nameWithoutExt
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '');

  let cleanExt = ext.replace(/[^a-zA-Z0-9.]/g, '');
  if (cleanExt === '.') {
    cleanExt = '';
  }

  const finalName = cleanName || 'material';
  return `${finalName}${cleanExt}`;
}

type NormalizedPayload = {
  name: string;
  size: number;
  fileType: string;
  data: Buffer | Uint8Array | Blob | string;
};

function isWebFile(payload: unknown): payload is File {
  if (typeof File !== 'undefined' && payload instanceof File) {
    return true;
  }
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'name' in payload &&
    'size' in payload &&
    typeof (payload as File).arrayBuffer === 'function'
  );
}

function normalizeWebFile(file: File): NormalizedPayload {
  const name = file.name || '';
  if (!name.trim()) {
    throw new ChatbotError('bad_request:document', 'A valid file with filename is required.');
  }

  return {
    name,
    size: file.size,
    fileType: inferMaterialFileType(name, file.type),
    data: file,
  };
}

function resolvePayloadSize(
  rawData: unknown,
  explicitSize?: number,
  fallbackSize?: number,
): number {
  if (typeof explicitSize === 'number') {
    return explicitSize;
  }
  if (typeof fallbackSize === 'number') {
    return fallbackSize;
  }
  if (Buffer.isBuffer(rawData)) {
    return rawData.length;
  }
  if (rawData instanceof Uint8Array) {
    return rawData.byteLength;
  }
  if (typeof rawData === 'string') {
    return Buffer.byteLength(rawData, 'utf-8');
  }
  if (rawData && typeof (rawData as Blob).size === 'number') {
    return (rawData as Blob).size;
  }
  if (rawData && typeof (rawData as ArrayBuffer).byteLength === 'number') {
    return (rawData as ArrayBuffer).byteLength;
  }
  return 0;
}

function normalizeDescriptor(descriptor: MaterialBufferPayload): NormalizedPayload {
  const name = descriptor.name || descriptor.filename || '';
  if (!name.trim()) {
    throw new ChatbotError('bad_request:document', 'A valid file with filename is required.');
  }

  const rawData = descriptor.data ?? descriptor.buffer;
  if (rawData === undefined || rawData === null) {
    throw new ChatbotError('bad_request:document', 'A valid file payload data is required.');
  }

  const size = resolvePayloadSize(rawData, descriptor.size, descriptor.fileSize);
  const providedType = descriptor.type || descriptor.fileType;
  const fileType = inferMaterialFileType(name, providedType);

  const normalizedData: Buffer | Uint8Array | Blob | string =
    rawData instanceof ArrayBuffer ? Buffer.from(rawData) : rawData;

  return {
    name,
    size,
    fileType,
    data: normalizedData,
  };
}

function normalizeIntakePayload(payload: MaterialIntakePayload): NormalizedPayload {
  if (!payload || typeof payload !== 'object') {
    throw new ChatbotError('bad_request:document', 'A valid file payload is required.');
  }

  if (isWebFile(payload)) {
    return normalizeWebFile(payload);
  }

  return normalizeDescriptor(payload as MaterialBufferPayload);
}

/**
 * Core Material Intake domain function.
 * Validates uploaded files/buffers, uploads to storage driver under a unique path,
 * persists the pending material database record, and enqueues background ingestion.
 */
export async function intakeMaterial(
  input: IntakeMaterialInput,
  options?: IntakeMaterialOptions,
): Promise<IntakeMaterialResult> {
  const { projectId, userId, file, title, metadata = {} } = input;

  if (!projectId || !userId) {
    throw new ChatbotError('bad_request:document', 'Project ID and User ID are required.');
  }

  // 1. Normalize and validate payload
  const normalized = normalizeIntakePayload(file);
  const validation = validateMaterialFile({
    name: normalized.name,
    size: normalized.size,
    type: normalized.fileType,
  });

  if (!validation.valid) {
    throw new ChatbotError('bad_request:document', validation.error);
  }

  // 2. Upload to storage with unique path prefix and sanitized filename
  const sanitized = sanitizeFilename(normalized.name);
  const uniqueId = crypto.randomUUID();
  const storagePath = `${projectId}/${uniqueId}-${sanitized}`;
  const storageDriver = options?.storageDriver ?? getStorageDriver();

  await storageDriver.upload(storagePath, normalized.data, normalized.fileType);

  // 3. Persist pending material database record (with rollback on DB failure)
  const resolvedTitle =
    typeof title === 'string' && title.trim().length > 0 ? title.trim() : normalized.name;
  let material: Material;

  try {
    material = await createMaterial({
      projectId,
      userId,
      title: resolvedTitle,
      filename: normalized.name,
      fileType: normalized.fileType,
      fileSize: normalized.size,
      storagePath,
      metadata: {
        ...metadata,
        intake: {
          uploadedAt: new Date().toISOString(),
          originalFilename: normalized.name,
          sanitizedFilename: sanitized,
        },
      },
    });
  } catch (dbError) {
    try {
      await storageDriver.delete(storagePath);
    } catch (cleanupError) {
      console.error(
        `Failed to cleanup storage blob "${storagePath}" after database error:`,
        cleanupError,
      );
    }
    throw dbError;
  }

  // 4. Dispatch background ingestion job
  const sendJob = options?.sendJob ?? sendIngestJob;
  await sendJob({
    materialId: material.id,
    projectId,
    userId,
    storagePath,
    fileType: normalized.fileType,
  });

  return material;
}
