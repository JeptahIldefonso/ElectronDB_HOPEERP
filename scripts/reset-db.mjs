// scripts/reset-db.mjs
// Recreates the local working database (hope.work.db) from the pristine master seed (hope.db).

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const masterPath = path.join(rootDir, 'hope.db');
const workPath = path.join(rootDir, 'hope.work.db');
const walPath = path.join(rootDir, 'hope.work.db-wal');
const shmPath = path.join(rootDir, 'hope.work.db-shm');

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

export function resetWorkingDatabase() {
  console.log('----------------------------------------------------');
  console.log(' Hope, Inc. ERP — Reset Working Database (db:reset)');
  console.log('----------------------------------------------------');

  if (!fs.existsSync(masterPath)) {
    console.error(`[FAIL] Master seed database does not exist at: ${masterPath}`);
    process.exit(1);
  }

  // Remove existing working database and WAL/SHM artifacts
  try {
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
    if (fs.existsSync(workPath)) fs.unlinkSync(workPath);
    console.log('[1/3] Removed prior working database and journal files.');
  } catch (err) {
    console.warn('[WARN] Could not cleanly unlink prior working files (might be locked):', err.message);
  }

  // Copy pristine master hope.db to hope.work.db
  try {
    fs.copyFileSync(masterPath, workPath);
    console.log('[2/3] Copied pristine master hope.db -> hope.work.db');
  } catch (err) {
    console.error('[FAIL] Failed to copy master hope.db to hope.work.db:', err.message);
    process.exit(1);
  }

  // Verify working copy
  let db;
  let totalRows = 0;
  let tablesFound = 0;
  try {
    db = new DatabaseSync(workPath);
    for (const table of CANONICAL_TABLES) {
      const countRow = db.prepare(`SELECT count(*) as count FROM "${table}"`).get();
      const count = countRow ? countRow.count : 0;
      totalRows += count;
      tablesFound++;
    }
    db.close();
  } catch (err) {
    console.error('[FAIL] Could not verify working database:', err.message);
    process.exit(1);
  }

  console.log(`[3/3] Verified ${tablesFound}/10 tables, ${totalRows} total records in hope.work.db.`);
  console.log('----------------------------------------------------');
  if (tablesFound === 10 && totalRows === 928) {
    console.log('[SUCCESS] Working database reset to 100% pristine canonical 928 records.');
  } else {
    console.warn(`[WARNING] Working database row count mismatch: found ${totalRows}, expected 928.`);
  }
  console.log('----------------------------------------------------\n');
}

resetWorkingDatabase();
