export function cn(...inputs: unknown[]): string {
  return inputs.filter(Boolean).join(' ');
}
