import { createMaterial, getMaterialsByProjectId } from '@/lib/db/queries/material';
import { getProjectById } from '@/lib/db/queries/project';
import { ChatbotError } from '@/lib/errors';
import { sendIngestJob } from '@/lib/queue';
import { getStorageDriver } from '@/lib/storage';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;

const ALLOWED_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'application/pdf',
  'application/x-pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/avif',
  'application/octet-stream',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.markdown',
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.bmp',
  '.tiff',
  '.tif',
  '.avif',
]);

function isValidMaterialFile(file: File): boolean {
  const lastDot = file.name.lastIndexOf('.');
  const extension = lastDot >= 0 ? file.name.slice(lastDot).toLowerCase() : '';
  if (extension && ALLOWED_EXTENSIONS.has(extension)) {
    return true;
  }
  if (file.type && ALLOWED_MIME_TYPES.has(file.type)) {
    return true;
  }
  return Boolean(file.type?.startsWith('image/'));
}

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatbotError('unauthorized:chat').toResponse();
    }

    const project = await getProjectById({ id: projectId, userId: user.id });
    if (!project) {
      return new ChatbotError('not_found:chat', 'Project not found').toResponse();
    }

    const materials = await getMaterialsByProjectId({ projectId, userId: user.id });
    return Response.json({ materials }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError('bad_request:api').toResponse();
  }
}

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatbotError('unauthorized:chat').toResponse();
    }

    const project = await getProjectById({ id: projectId, userId: user.id });
    if (!project) {
      return new ChatbotError('not_found:chat', 'Project not found').toResponse();
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new ChatbotError('bad_request:api', 'A valid file is required').toResponse();
    }

    if (!isValidMaterialFile(file)) {
      return new ChatbotError(
        'bad_request:api',
        'Only documents (.pdf, .md, .txt) and images (.png, .jpg, .webp, etc.) are supported',
      ).toResponse();
    }

    // 25MB max file size
    if (file.size > 25 * 1024 * 1024) {
      return new ChatbotError('bad_request:api', 'File size exceeds 25MB limit').toResponse();
    }

    const titleParam = formData.get('title');
    const title =
      typeof titleParam === 'string' && titleParam.trim() ? titleParam.trim() : file.name;

    const fileType = file.type || 'text/markdown';
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${projectId}/${crypto.randomUUID()}-${sanitizedFilename}`;

    // Upload payload using storage driver
    const storageDriver = getStorageDriver();
    await storageDriver.upload(storagePath, file, fileType);

    // Record material in DB
    const material = await createMaterial({
      projectId,
      userId: user.id,
      title,
      filename: file.name,
      fileType,
      fileSize: file.size,
      storagePath,
    });

    // Dispatch background ingestion job
    await sendIngestJob({
      materialId: material.id,
      projectId,
      userId: user.id,
      storagePath,
      fileType,
    });

    return Response.json({ material }, { status: 201 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError('bad_request:api').toResponse();
  }
}
