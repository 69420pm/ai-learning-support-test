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

export type FileValidationResult = { valid: true; error?: never } | { valid: false; error: string };

export function validateMaterialFile(file: File): FileValidationResult {
  const lastDot = file.name.lastIndexOf('.');
  const extension = lastDot >= 0 ? file.name.slice(lastDot).toLowerCase() : '';

  const isAcceptedExtension = ACCEPTED_FILE_EXTENSIONS.includes(extension);
  const isAcceptedMime =
    file.type === 'application/pdf' ||
    file.type === 'text/markdown' ||
    file.type === 'text/plain' ||
    file.type === 'text/x-markdown' ||
    file.type.startsWith('image/');

  if (!isAcceptedExtension && !isAcceptedMime) {
    return {
      valid: false,
      error: `Unsupported file format (${extension || file.type || 'unknown'}). Supported: PDF, Markdown, Text, Images.`,
    };
  }

  if (file.size > MAX_MATERIAL_FILE_SIZE) {
    return {
      valid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds the 25MB limit.`,
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
