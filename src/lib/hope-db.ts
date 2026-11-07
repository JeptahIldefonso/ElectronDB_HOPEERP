import os from 'node:os';
import { createClient, type Client as LibSqlClient } from '@libsql/client';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

export type { DatabaseSync, LibSqlClient };

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

export interface HopeDatabase {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  get<T = any>(sql: string, params?: any[]): Promise<T | null>;
  run(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid: number | bigint }>;
  exec(sql: string): Promise<void>;
  batch(statements: Array<{ sql: string; args?: any[] } | string>): Promise<any[]>;
  isTurso: boolean;
  isReadOnly: boolean;
  engine: 'turso' | 'sqlite-local' | 'sqlite-bundled-readonly';
  client?: LibSqlClient;
}

let syncDbInstance: DatabaseSync | null = null;
let asyncDbInstance: HopeDatabase | null = null;
let initPromise: Promise<string> | null = null;

/**
 * Returns true if Turso cloud database credentials are provided via environment variables.
 */
export function isTursoConfigured(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

/**
 * Returns true if the environment enforces read-only mode:
 * - On Vercel: True ONLY if Turso credentials are NOT configured.
 *   If Turso is configured on Vercel, the app runs in full persistent read-write mode.
 * - Locally: False (always read-write via hope.work.db).
 */
export function isDatabaseReadOnly(): boolean {
  if (isTursoConfigured()) {
    return false;
  }
  try {
    const activePath = getHopeDbPath();
    const masterPath = getMasterDbPath();
    return activePath === masterPath;
  } catch {
    return true;
  }
}

/**
 * Gets the pristine canonical master seed database path.
 */
export function getMasterDbPath(): string {
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

  console.error('[hope-db] Master hope.db not found at any candidate path:', candidatePaths);
  throw Object.assign(new Error('Bundled database file is missing'), { code: 'file_missing' });
}

/**
 * Resolves the database path to use for local queries and transactions.
 * - On Vercel (without Turso): Returns the bundled read-only hope.db path.
 * - Locally: Ensures a local working copy (hope.work.db) exists (seeded from hope.db),
 *   protecting the committed master hope.db from any mutations.
 */
export function getHopeDbPath(): string {
  if (isTursoConfigured()) {
    return getMasterDbPath();
  }

  const workDir = process.env.VERCEL ? os.tmpdir() : process.cwd();
  const workPath = path.join(workDir, 'hope.work.db');

  if (!fs.existsSync(workPath)) {
    const masterPath = getMasterDbPath();
    try {
      if (!fs.existsSync(workDir)) {
        fs.mkdirSync(workDir, { recursive: true });
      }
      fs.copyFileSync(masterPath, workPath);
      console.log(`[hope-db] Initialized working copy at ${workPath} from master seed.`);
    } catch (err) {
      console.error(`[hope-db] Failed to create working copy at ${workPath}:`, err);
      return masterPath;
    }
  }

  return workPath;
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
 * Closes cached database handles (useful before testing, swapping files, or resetting).
 */
export function closeHopeDb(): void {
  if (syncDbInstance) {
    try {
      syncDbInstance.close();
    } catch {}
    syncDbInstance = null;
  }
  asyncDbInstance = null;
}

/**
 * Synchronous SQLite database handle for local scripts or legacy compatibility.
 */
export function getHopeDbSync(): DatabaseSync {
  if (syncDbInstance) return syncDbInstance;

  const isReadOnly = isDatabaseReadOnly();
  const dbPath = getHopeDbPath();

  try {
    if (isReadOnly) {
      syncDbInstance = new DatabaseSync(dbPath, { readOnly: true });
    } else {
      syncDbInstance = new DatabaseSync(dbPath);
      try {
        syncDbInstance.exec('PRAGMA foreign_keys = ON;');
      } catch {}
      try {
        syncDbInstance.exec('PRAGMA journal_mode = WAL;');
      } catch {}
    }

    return syncDbInstance;
  } catch (err) {
    console.error('[hope-db] Failed to instantiate DatabaseSync:', err);
    throw Object.assign(new Error('Could not open SQLite database connection'), { code: 'open_failed' });
  }
}

/**
 * Main unified database accessor for HopeERD.
 * - In Production with Turso (TURSO_DATABASE_URL): Connects over HTTPS/WebSocket to Turso.
 * - In Local Development: Connects to local hope.work.db via @libsql/client file protocol.
 * - On Vercel fallback (missing Turso env): Connects read-only to bundled seed.
 */
export function getHopeDb(): HopeDatabase {
  if (asyncDbInstance) return asyncDbInstance;

  const hasTurso = isTursoConfigured();
  const isReadOnly = isDatabaseReadOnly();

  let client: LibSqlClient;
  let engineType: 'turso' | 'sqlite-local' | 'sqlite-bundled-readonly' = 'sqlite-local';

  if (hasTurso) {
    engineType = 'turso';
    client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
  } else {
    const localDbPath = getHopeDbPath().replace(/\\/g, '/');
    engineType = isReadOnly ? 'sqlite-bundled-readonly' : 'sqlite-local';
    client = createClient({
      url: `file:${localDbPath}`,
    });
  }

  asyncDbInstance = {
    isTurso: hasTurso,
    isReadOnly,
    engine: engineType,
    client,

    async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
      const res = await client.execute({ sql, args: params || [] });
      return Array.from(res.rows) as unknown as T[];
    },

    async get<T = any>(sql: string, params?: any[]): Promise<T | null> {
      const res = await client.execute({ sql, args: params || [] });
      return (res.rows[0] as unknown as T) || null;
    },

    async run(sql: string, params?: any[]): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
      const res = await client.execute({ sql, args: params || [] });
      return {
        changes: res.rowsAffected,
        lastInsertRowid: res.lastInsertRowid ? Number(res.lastInsertRowid) : 0,
      };
    },

    async exec(sql: string): Promise<void> {
      await client.executeMultiple(sql);
    },

    async batch(statements: Array<{ sql: string; args?: any[] } | string>): Promise<any[]> {
      const formatted = statements.map((s) => (typeof s === 'string' ? { sql: s, args: [] } : s));
      const res = await client.batch(formatted, 'write');
      return res;
    },
  };

  return asyncDbInstance;
}

/**
 * Sanitizes raw database and engine errors into polished, human-friendly messages.
 * Guarantees zero internal SQLite/libSQL syntax or wording leaks into the user interface.
 */
export function sanitizeDbError(err: any, fallbackMessage = 'Unable to complete operation. Please try again.'): string {
  if (!err) return fallbackMessage;

  console.error('[Database Operation Error]:', err);

  const raw = typeof err === 'string' ? err : err?.message || '';

  // Read-only environment guard (Vercel without Turso or locked DB)
  if (raw.includes('readonly') || raw.includes('READONLY') || raw.includes('read-only')) {
    return 'This deployed environment is in read-only mode to protect canonical data. Writes are available in local development or with Turso configured.';
  }

  // Foreign key constraint failure
  if (raw.includes('FOREIGN KEY') || raw.includes('foreign key')) {
    return 'Referential error: The selected customer, employee, department, or product does not exist.';
  }

  // Unique constraint failure
  if (raw.includes('UNIQUE') || raw.includes('unique')) {
    return 'Duplicate entry: A record with this identifier already exists.';
  }

  // Check constraint failure
  if (raw.includes('CHECK constraint') || raw.includes('check constraint')) {
    return 'Invalid data format or value exceeds allowed business limits.';
  }

  // Access control & rights
  if (raw.toLowerCase().includes('access denied') || raw.toLowerCase().includes('missing right')) {
    return raw;
  }

  // Zod validation errors
  if (err?.name === 'ZodError' && err.errors?.[0]?.message) {
    return err.errors[0].message;
  }

  // Clean application message if safe
  if (
    raw &&
    !raw.toLowerCase().includes('sqlite') &&
    !raw.toLowerCase().includes('libsql') &&
    !raw.includes('prepare(') &&
    !raw.includes('syntax error')
  ) {
    return raw;
  }

  return fallbackMessage;
}
