import { FileCode, FileImage, FileText, type LucideIcon } from 'lucide-react';
import type { JSX } from 'react';
import { getFileIconType } from '@/lib/materials/validation';
import { cn } from '@/lib/utils';

type FileIconCategory = 'pdf' | 'image' | 'markdown' | 'default';

const FILE_ICON_CONFIG: Record<FileIconCategory, { icon: LucideIcon; colorClass: string }> = {
  pdf: { icon: FileText, colorClass: 'text-red-500' },
  image: { icon: FileImage, colorClass: 'text-blue-500' },
  markdown: { icon: FileCode, colorClass: 'text-emerald-500' },
  default: { icon: FileText, colorClass: 'text-muted-foreground' },
};

export type MaterialFileIconProps = {
  fileType?: string | null;
  filename?: string | null;
  className?: string;
};

export function MaterialFileIcon({
  fileType,
  filename,
  className,
}: MaterialFileIconProps): JSX.Element {
  const iconType = getFileIconType(fileType || '', filename || undefined);
  const config = FILE_ICON_CONFIG[iconType as FileIconCategory] ?? FILE_ICON_CONFIG.default;
  const IconComponent = config.icon;
  return <IconComponent className={cn('shrink-0', config.colorClass, className)} />;
}
