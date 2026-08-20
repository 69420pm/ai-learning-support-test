import { describe, expect, it } from 'vitest';
import {
  formatFileSize,
  getFileIconType,
  MAX_MATERIAL_FILE_SIZE,
  validateMaterialFile,
} from './validation';

describe('Material File Validation', () => {
  it('accepts valid markdown, text, pdf, and image files', () => {
    const mdFile = new File(['# Title'], 'notes.md', { type: 'text/markdown' });
    const txtFile = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    const pdfFile = new File(['%PDF'], 'paper.pdf', { type: 'application/pdf' });
    const imgFile = new File(['img'], 'photo.png', { type: 'image/png' });

    expect(validateMaterialFile(mdFile).valid).toBe(true);
    expect(validateMaterialFile(txtFile).valid).toBe(true);
    expect(validateMaterialFile(pdfFile).valid).toBe(true);
    expect(validateMaterialFile(imgFile).valid).toBe(true);
  });

  it('rejects unsupported extensions', () => {
    const exeFile = new File(['binary'], 'program.exe', {
      type: 'application/x-msdownload',
    });
    const zipFile = new File(['zip'], 'archive.zip', {
      type: 'application/zip',
    });

    const resExe = validateMaterialFile(exeFile);
    expect(resExe.valid).toBe(false);
    expect(resExe.error).toContain('Unsupported file format');

    const resZip = validateMaterialFile(zipFile);
    expect(resZip.valid).toBe(false);
  });

  it('rejects files exceeding MAX_MATERIAL_FILE_SIZE (25MB)', () => {
    const bigFile = new File(['x'], 'huge.pdf', { type: 'application/pdf' });
    Object.defineProperty(bigFile, 'size', { value: MAX_MATERIAL_FILE_SIZE + 1 });

    const res = validateMaterialFile(bigFile);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('exceeds the 25MB limit');
  });

  it('formats file sizes accurately', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
  });

  it('detects file icon types correctly', () => {
    expect(getFileIconType('application/pdf', 'paper.pdf')).toBe('pdf');
    expect(getFileIconType('text/markdown', 'notes.md')).toBe('markdown');
    expect(getFileIconType('image/png', 'img.png')).toBe('image');
    expect(getFileIconType('text/plain', 'doc.txt')).toBe('text');
  });
});
