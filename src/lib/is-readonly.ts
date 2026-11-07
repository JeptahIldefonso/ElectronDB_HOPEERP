/**
 * Utility to check if the current runtime environment is in read-only demo mode.
 * On Vercel, the application operates in read-only mode to preserve canonical ERP records.
 */
export function isDemoReadOnly(): boolean {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_IS_READONLY === 'true';
  }
  return Boolean(process.env.VERCEL);
}
