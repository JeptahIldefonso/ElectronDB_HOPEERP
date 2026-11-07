import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

export type { DatabaseSync };

export const CANONICAL_ERD_TABLES = [
  'CUSTOMER',
  'PRODUCT',
  'PRICEHIST',
  'EMPLOYEE',
  'JOB',
  'DEPARTMENT',
  'JOBHISTORY',
  'SALES',
  'SALESDETAIL',
  'PAYMENT',
] as const;

export type DbHealthReason =
  | 'file_missing'
  | 'open_failed'
  | 'query_failed'
  | 'timeout'
  | 'table_missing'
  | 'unauthorized';

let initPromise: Promise<string> | null = null;

/**
 * Resolves the canonical hope.db path synchronously.
 * Checks the bundled project root directory first, then fallback paths.
 */
export function getHopeDbPath(): string {
  const candidatePaths = [
    path.join(process.cwd(), 'hope.db'),
    path.resolve('hope.db'),
    path.join('/tmp', 'hope.db'),
  ];

  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // ignore path access error and try next
    }
  }

  console.error('[hope-db] Bundled hope.db not found at any candidate path:', candidatePaths);
  throw Object.assign(new Error('Bundled database file is missing'), { code: 'file_missing' });
}

/**
 * Asynchronous initialization ensuring cold-start check completes once per instance.
 */
export async function ensureHopeDb(): Promise<string> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    return getHopeDbPath();
  })();

  return initPromise;
}

/**
 * Opens a read-only SQLite connection to hope.db using the canonical path.
 * Read-only ensures zero mutations and safe execution on Vercel's read-only serverless filesystem.
 */
export function getHopeDb(): DatabaseSync {
  const dbPath = getHopeDbPath();
  try {
    return new DatabaseSync(dbPath, { readOnly: true });
  } catch (err) {
    console.error('[hope-db] Failed to instantiate DatabaseSync:', err);
    throw Object.assign(new Error('Could not open SQLite database connection'), { code: 'open_failed' });
  }
}
