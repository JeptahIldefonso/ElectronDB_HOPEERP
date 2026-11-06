import { DatabaseSync } from 'node:sqlite';
import {
  getHopeDb,
  ensureHopeDb,
  CANONICAL_ERD_TABLES,
  type DbHealthReason,
} from './hope-db';

export { CANONICAL_ERD_TABLES };

export interface TableHealth {
  name: string;
  exists: boolean;
  rows: number;
}

export interface DbHealthResult {
  connected: boolean;
  status: 'connected' | 'partial' | 'disconnected';
  engine: string;
  tablesExpected: number;
  tablesFound: number;
  latencyMs: number;
  checkedAt: string;
  tables: TableHealth[];
  reason?: DbHealthReason;
  message?: string;
}

// In-memory cache to prevent database hammering (10s on success, max 2s on failure)
let cachedHealth: { result: DbHealthResult; expiresAt: number } | null = null;

/**
 * Reuses the canonical SQLite instance used by business data layers.
 */
export function getBusinessDb(): DatabaseSync {
  return getHopeDb();
}

/**
 * Performs timed verification against hope.db without exposing internal paths or SQL details.
 */
export async function checkDatabaseHealth(forceFresh = false): Promise<DbHealthResult> {
  const now = Date.now();
  if (!forceFresh && cachedHealth && cachedHealth.expiresAt > now) {
    return cachedHealth.result;
  }

  const startTime = performance.now();
  const checkedAtTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
  });

  try {
    // 1. Ensure database is prepared (with 8s timeout for cold-start copy)
    const initTimeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error('Cold start initialization timeout'), { code: 'timeout' })), 8000)
    );
    await Promise.race([ensureHopeDb(), initTimeoutPromise]);

    // 2. Perform health queries (with 3s query timeout)
    const checkPromise = new Promise<DbHealthResult>((resolve, reject) => {
      try {
        const db = getHopeDb();

        // Ping test
        db.prepare('SELECT 1 as ping').get();
        const latencyMs = Math.max(1, Math.round(performance.now() - startTime));

        // Discover existing tables
        const masterTables = db
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
          .all() as Array<{ name: string }>;
        const existingTableNames = new Set(masterTables.map((t) => t.name.toUpperCase()));

        // Inspect each canonical table
        const tables: TableHealth[] = [];
        let tablesFound = 0;

        for (const tableName of CANONICAL_ERD_TABLES) {
          const exists = existingTableNames.has(tableName);
          let rows = 0;
          if (exists) {
            tablesFound++;
            try {
              const countRow = db
                .prepare(`SELECT COUNT(*) as count FROM "${tableName}"`)
                .get() as { count: number };
              rows = countRow?.count ?? 0;
            } catch {
              // Table exists but query failed
            }
          }
          tables.push({
            name: tableName,
            exists,
            rows,
          });
        }

        const isFull = tablesFound === CANONICAL_ERD_TABLES.length;
        const isPartial = tablesFound > 0 && tablesFound < CANONICAL_ERD_TABLES.length;

        const status: 'connected' | 'partial' | 'disconnected' = isFull
          ? 'connected'
          : isPartial
          ? 'partial'
          : 'disconnected';

        let reason: DbHealthReason | undefined = undefined;
        let message = 'Database integrity verified';

        if (status === 'disconnected') {
          reason = 'table_missing';
          message = 'Database contains no tables';
        } else if (status === 'partial') {
          reason = 'table_missing';
          message = `Missing ${CANONICAL_ERD_TABLES.length - tablesFound} table(s)`;
        }

        resolve({
          connected: status !== 'disconnected',
          status,
          engine: 'SQLite (hope.db)',
          tablesExpected: CANONICAL_ERD_TABLES.length,
          tablesFound,
          latencyMs,
          checkedAt: checkedAtTime,
          tables,
          reason,
          message,
        });
      } catch (err) {
        reject(err);
      }
    });

    const queryTimeoutPromise = new Promise<DbHealthResult>((_, reject) =>
      setTimeout(() => reject(Object.assign(new Error('Health query timeout'), { code: 'timeout' })), 3000)
    );

    const result = await Promise.race([checkPromise, queryTimeoutPromise]);

    cachedHealth = {
      result,
      expiresAt: now + (result.connected ? 10_000 : 2_000),
    };

    return result;
  } catch (err: any) {
    const rawCode = err?.code;
    let reason: DbHealthReason = 'query_failed';
    let message = 'The server could not reach or query the database.';

    if (rawCode === 'file_missing') {
      reason = 'file_missing';
      message = 'Database file missing';
    } else if (rawCode === 'open_failed') {
      reason = 'open_failed';
      message = 'Could not open database file';
    } else if (rawCode === 'timeout' || String(err?.message || '').toLowerCase().includes('timeout')) {
      reason = 'timeout';
      message = 'Database check timed out';
    }

    console.error(`[db-health] Health check failed (${reason}):`, err?.message || err);

    const disconnectedResult: DbHealthResult = {
      connected: false,
      status: 'disconnected',
      engine: 'SQLite (hope.db)',
      tablesExpected: CANONICAL_ERD_TABLES.length,
      tablesFound: 0,
      latencyMs: Math.round(performance.now() - startTime),
      checkedAt: checkedAtTime,
      tables: CANONICAL_ERD_TABLES.map((name) => ({
        name,
        exists: false,
        rows: 0,
      })),
      reason,
      message,
    };

    // Cache failure for at most 2 seconds
    cachedHealth = {
      result: disconnectedResult,
      expiresAt: now + 2_000,
    };

    return disconnectedResult;
  }
}
