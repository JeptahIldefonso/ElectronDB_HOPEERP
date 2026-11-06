// scripts/verify-db.mjs
// Developer verification tool for Hope, Inc. ERP canonical database.
// Tests opening hope.db via the canonical path resolution and node:sqlite engine.

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export const CANONICAL_TABLES = [
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
];

function resolveDbPath() {
  if (process.env.VERCEL) {
    const tmpPath = path.join('/tmp', 'hope.db');
    if (!fs.existsSync(tmpPath)) {
      const srcPath = path.join(rootDir, 'hope.db');
      if (fs.existsSync(srcPath)) {
        fs.mkdirSync(path.dirname(tmpPath), { recursive: true });
        fs.copyFileSync(srcPath, tmpPath);
      }
    }
    return tmpPath;
  }
  return path.join(rootDir, 'hope.db');
}

export function runDbVerification() {
  const startTime = performance.now();
  console.log('----------------------------------------------------');
  console.log(' Hope, Inc. ERP — Database Verification Tool');
  console.log('----------------------------------------------------');
  console.log(`Environment: ${process.env.VERCEL ? 'Vercel Serverless (/tmp)' : 'Local Workstation'}`);
  console.log(`Node Version: ${process.version}`);

  const targetPath = resolveDbPath();
  console.log(`Target Path : ${targetPath}`);

  if (!fs.existsSync(targetPath)) {
    console.error(`[FAIL] Database file does not exist at: ${targetPath}`);
    process.exit(1);
  }

  let db;
  try {
    db = new DatabaseSync(targetPath);
    console.log('[OK] SQLite database opened successfully.');
  } catch (err) {
    console.error('[FAIL] Could not open SQLite database:', err.message);
    process.exit(1);
  }

  // 1. SELECT 1 ping test
  try {
    const pingStart = performance.now();
    const pingRow = db.prepare('SELECT 1 as ping').get();
    const pingLatency = (performance.now() - pingStart).toFixed(2);
    if (pingRow && pingRow.ping === 1) {
      console.log(`[OK] SELECT 1 ping successful (${pingLatency} ms).`);
    } else {
      console.error('[FAIL] Ping query returned unexpected result:', pingRow);
    }
  } catch (err) {
    console.error('[FAIL] Ping query failed:', err.message);
    process.exit(1);
  }

  // 2. Discover tables & inspect 10 canonical tables
  console.log('\n--- Checking 10 Canonical ERP Tables ---');
  let totalRows = 0;
  let tablesFound = 0;

  for (const table of CANONICAL_TABLES) {
    try {
      const countRow = db.prepare(`SELECT count(*) as count FROM "${table}"`).get();
      const count = countRow ? countRow.count : 0;
      totalRows += count;
      tablesFound++;
      console.log(`  ✓ ${table.padEnd(14)} : ${String(count).padStart(5)} rows`);
    } catch (err) {
      console.log(`  ✗ ${table.padEnd(14)} : MISSING or query error (${err.message})`);
    }
  }

  const durationMs = (performance.now() - startTime).toFixed(2);
  console.log('----------------------------------------------------');
  console.log(`Tables Found : ${tablesFound} / ${CANONICAL_TABLES.length}`);
  console.log(`Total Rows   : ${totalRows} (Expected: 928 canonical records)`);
  console.log(`Total Latency: ${durationMs} ms`);

  if (tablesFound === 10 && totalRows === 928) {
    console.log('[STATUS: 100% VERIFIED CANONICAL DATA]');
  } else {
    console.warn('[STATUS: INCOMPLETE OR MISMATCHED DATA]');
  }
  console.log('----------------------------------------------------\n');
}

runDbVerification();
