export const MAX_MATERIAL_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export const ACCEPTED_FILE_EXTENSIONS = [
  '.pdf',
  '.md',
  '.markdown',
  '.txt',
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

export const ACCEPTED_FILE_TYPES_STRING = ACCEPTED_FILE_EXTENSIONS.join(',');

export const EXTENSION_MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.txt': 'text/plain',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.avif': 'image/avif',
};

export type FileValidationResult = { valid: true; error?: never } | { valid: false; error: string };

export type MaterialFileValidationTarget = {
  name: string;
  size: number;
  type?: string;
};

export function getFileExtension(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return '';
  }
  const lastDot = filename.lastIndexOf('.');
  return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : '';
}

export function inferMaterialFileType(filename: string, providedType?: string): string {
  const normProvided = providedType?.trim();
  if (normProvided && normProvided !== 'application/octet-stream') {
    return normProvided;
  }

  const extension = getFileExtension(filename);
  return EXTENSION_MIME_MAP[extension] ?? normProvided ?? 'application/octet-stream';
}

function isAcceptedMimeType(fileType: string): boolean {
  const normType = fileType.toLowerCase();
  return (
    normType === 'application/pdf' ||
    normType === 'application/x-pdf' ||
    normType === 'text/markdown' ||
    normType === 'text/plain' ||
    normType === 'text/x-markdown' ||
    normType.startsWith('image/')
  );
}

export function validateMaterialFile(
  file: MaterialFileValidationTarget | File,
): FileValidationResult {
  if (!file || typeof file !== 'object' || typeof file.name !== 'string') {
    return {
      valid: false,
      error: 'A valid file payload is required.',
    };
  }

  const extension = getFileExtension(file.name);
  const fileType = file.type || '';

  // If an extension exists, it must strictly be in the allowed extensions list
  if (extension && !ACCEPTED_FILE_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported file format (${extension}). Supported: PDF, Markdown, Text, Images.`,
    };
  }

  // If no extension is present, validate against accepted MIME types
  if (!extension && !isAcceptedMimeType(fileType)) {
    return {
      valid: false,
      error: `Unsupported file format (${fileType || 'unknown'}). Supported: PDF, Markdown, Text, Images.`,
    };
  }

  const size = typeof file.size === 'number' ? file.size : 0;
  if (size > MAX_MATERIAL_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${formatFileSize(size)}) exceeds the 25MB limit.`,
    };
  }

  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileIconType(
  fileType: string,
  filename?: string,
): 'pdf' | 'markdown' | 'image' | 'text' | 'file' {
  const normType = (fileType || '').toLowerCase();
  const normName = (filename || '').toLowerCase();

  if (normType.includes('pdf') || normName.endsWith('.pdf')) {
    return 'pdf';
  }
  if (normType.includes('markdown') || normName.endsWith('.md') || normName.endsWith('.markdown')) {
    return 'markdown';
  }
  if (
    normType.startsWith('image/') ||
    ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff', '.tif', '.avif'].some((ext) =>
      normName.endsWith(ext),
    )
  ) {
    return 'image';
  }
  if (normType.startsWith('text/') || normName.endsWith('.txt')) {
    return 'text';
  }
  return 'file';
}
