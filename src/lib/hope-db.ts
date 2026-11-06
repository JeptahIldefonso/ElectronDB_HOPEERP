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
 * On Vercel, ensures the directory exists and copies the bundled read-only hope.db
 * into /tmp/hope.db if not already present.
 */
export function getHopeDbPath(): string {
  if (process.env.VERCEL) {
    const tmpPath = path.join('/tmp', 'hope.db');
    if (!fs.existsSync(tmpPath)) {
      const srcPath = path.join(process.cwd(), 'hope.db');
      if (fs.existsSync(srcPath)) {
        try {
          fs.mkdirSync(path.dirname(tmpPath), { recursive: true });
          fs.copyFileSync(srcPath, tmpPath);
        } catch (err) {
          console.error('[hope-db] Failed to copy hope.db to /tmp:', err);
          throw Object.assign(new Error('Failed to copy database to /tmp'), { code: 'open_failed' });
        }
      } else {
        console.error('[hope-db] Bundled hope.db not found at process.cwd():', srcPath);
        throw Object.assign(new Error('Bundled database file is missing'), { code: 'file_missing' });
      }
    }
    return tmpPath;
  }

  const localPath = path.join(process.cwd(), 'hope.db');
  if (!fs.existsSync(localPath)) {
    console.error('[hope-db] Local hope.db not found at:', localPath);
    throw Object.assign(new Error('Local database file is missing'), { code: 'file_missing' });
  }
  return localPath;
}

/**
 * Asynchronous initialization ensuring cold-start copy completes once per instance.
 */
export async function ensureHopeDb(): Promise<string> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    return getHopeDbPath();
  })();

  return initPromise;
}

/**
 * Opens a SQLite connection to hope.db using the canonical path.
 */
export function getHopeDb(): DatabaseSync {
  const dbPath = getHopeDbPath();
  try {
    return new DatabaseSync(dbPath);
  } catch (err) {
    console.error('[hope-db] Failed to instantiate DatabaseSync:', err);
    throw Object.assign(new Error('Could not open SQLite database connection'), { code: 'open_failed' });
  }
}
