// scripts/reset-turso.mjs
// Restores the live Turso production database to the pristine canonical 928 rows from hope.db.
// Requires explicit guard flag: --confirm=RESET_PRODUCTION_TURSO

import { createClient } from '@libsql/client';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const masterDbPath = path.join(rootDir, 'hope.db');

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

function loadEnvLocal() {
  const envPath = path.join(rootDir, '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

async function main() {
  loadEnvLocal();

  console.log('====================================================');
  console.log(' ElectronDB ERP — Guarded Turso Database Reset Tool');
  console.log('====================================================');

  const args = process.argv.slice(2);
  const confirmArg = args.find((a) => a === '--confirm=RESET_PRODUCTION_TURSO');

  if (!confirmArg) {
    console.error('\n[SAFETY GUARD TRIGGERED]');
    console.error('This script wipes and re-initializes the remote Turso database with canonical seed data.');
    console.error('To proceed, you must pass the exact confirmation flag:');
    console.error('\n   node scripts/reset-turso.mjs --confirm=RESET_PRODUCTION_TURSO\n');
    console.error('Operation aborted safely. No remote data was modified.\n');
    process.exit(1);
  }

  // Get credentials
  const url = process.env.TURSO_DATABASE_URL || args.find((a) => a.startsWith('--url='))?.split('=')[1];
  const authToken = process.env.TURSO_AUTH_TOKEN || args.find((a) => a.startsWith('--token='))?.split('=')[1];

  if (!url) {
    console.error('\n[CONFIG ERROR]');
    console.error('TURSO_DATABASE_URL environment variable is missing.');
    console.error('Set TURSO_DATABASE_URL in .env.local or pass --url="libsql://your-db.turso.io"');
    process.exit(1);
  }

  if (!fs.existsSync(masterDbPath)) {
    console.error(`[ERROR] Canonical master database not found at ${masterDbPath}`);
    process.exit(1);
  }

  console.log(`Connecting to Turso: ${url}`);
  const turso = createClient({ url, authToken });
  const localDb = new DatabaseSync(masterDbPath, { readOnly: true });

  console.log('\n[1/5] Extracting schema & records from canonical hope.db...');

  // Get list of tables in canonical hope.db (excluding sqlite internal)
  const tables = localDb.prepare(`
    SELECT name, sql FROM sqlite_master 
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log(`Found ${tables.length} tables in canonical master: ${tables.map((t) => t.name).join(', ')}`);

  console.log('\n[2/5] Preparing Turso database tables...');
  // Drop tables in safe order
  const dropOrder = [
    'SALESDETAIL',
    'PAYMENT',
    'SALES',
    'PRICEHIST',
    'JOBHISTORY',
    'EMPLOYEE',
    'JOB',
    'DEPARTMENT',
    'CUSTOMER',
    'PRODUCT',
    'audit_log',
    'USERRIGHTS',
    'USERS',
    'RIGHTS',
    'staff_accounts',
  ];

  for (const t of dropOrder) {
    try {
      await turso.execute(`DROP TABLE IF EXISTS "${t}"`);
    } catch (e) {
      // ignore drop errors
    }
  }

  // Create tables using canonical DDL
  for (const t of tables) {
    if (t.sql) {
      await turso.execute(t.sql);
      console.log(`  ✓ Created table ${t.name}`);
    }
  }

  console.log('\n[3/5] Migrating canonical 928 records from hope.db into Turso...');

  for (const t of tables) {
    const rows = localDb.prepare(`SELECT * FROM "${t.name}"`).all();
    if (rows.length === 0) continue;

    // Chunk into batches of 50 to avoid network limits
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const batch = rows.slice(i, i + chunkSize);
      const stmts = batch.map((row) => {
        const keys = Object.keys(row);
        const placeholders = keys.map(() => '?').join(', ');
        const values = Object.values(row);
        return {
          sql: `INSERT INTO "${t.name}" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders})`,
          args: values,
        };
      });
      await turso.batch(stmts, 'write');
    }
    console.log(`  ✓ Inserted ${String(rows.length).padStart(4)} rows -> ${t.name}`);
  }

  console.log('\n[4/5] Initializing Auth schema & administrator account in Turso...');

  // Create USERS, RIGHTS, USERRIGHTS
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS USERS (
      userId TEXT PRIMARY KEY,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Superadmin', 'Admin', 'User')),
      isBlocked INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Inactive')),
      stamp TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS RIGHTS (
      rightCode TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      description TEXT NOT NULL
    );
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS USERRIGHTS (
      userId TEXT NOT NULL,
      rightCode TEXT NOT NULL,
      PRIMARY KEY (userId, rightCode),
      FOREIGN KEY (userId) REFERENCES USERS(userId) ON DELETE CASCADE,
      FOREIGN KEY (rightCode) REFERENCES RIGHTS(rightCode) ON DELETE CASCADE
    );
  `);

  // Canonical rights
  const canonicalRights = [
    { code: 'add_customer', mod: 'Customer', desc: 'Add new customer records' },
    { code: 'edit_customer', mod: 'Customer', desc: 'Edit customer profiles' },
    { code: 'delete_customer', mod: 'Customer', desc: 'Soft-delete customer records' },
    { code: 'view_customer', mod: 'Customer', desc: 'View customer directory' },
    { code: 'add_product', mod: 'Product', desc: 'Add new catalog products' },
    { code: 'edit_product', mod: 'Product', desc: 'Edit product descriptions' },
    { code: 'delete_product', mod: 'Product', desc: 'Soft-delete products' },
    { code: 'manage_prices', mod: 'Product', desc: 'Update price schedules' },
    { code: 'add_sale', mod: 'Sales', desc: 'Create sales transactions' },
    { code: 'edit_sale', mod: 'Sales', desc: 'Edit sale header details' },
    { code: 'delete_sale', mod: 'Sales', desc: 'Soft-delete sales transactions' },
    { code: 'add_sale_detail', mod: 'Sales', desc: 'Add itemized products to sale' },
    { code: 'edit_sale_detail', mod: 'Sales', desc: 'Modify itemized quantities' },
    { code: 'delete_sale_detail', mod: 'Sales', desc: 'Remove items from sale' },
    { code: 'view_sale_details', mod: 'Sales', desc: 'View itemized sale contents' },
    { code: 'record_payment', mod: 'Payments', desc: 'Issue official receipts' },
    { code: 'view_payments', mod: 'Payments', desc: 'View payments ledger' },
    { code: 'add_employee', mod: 'HR', desc: 'Hire new employee' },
    { code: 'edit_employee', mod: 'HR', desc: 'Update employee records' },
    { code: 'delete_employee', mod: 'HR', desc: 'Soft-delete employee' },
    { code: 'manage_departments', mod: 'HR', desc: 'Add/edit departments' },
    { code: 'manage_jobs', mod: 'HR', desc: 'Add/edit job positions' },
    { code: 'add_job_history', mod: 'HR', desc: 'Record promotion/transfer' },
    { code: 'edit_job_history', mod: 'HR', desc: 'Adjust job compensation' },
    { code: 'delete_job_history', mod: 'HR', desc: 'Remove job history entries' },
    { code: 'report_monthly_sales', mod: 'Reports', desc: 'Monthly sales summary' },
    { code: 'report_top_customers', mod: 'Reports', desc: 'Top 5 spending clients' },
    { code: 'report_cashier_remittance', mod: 'Reports', desc: 'Daily collections audit' },
    { code: 'report_product_master', mod: 'Reports', desc: 'Full product directory' },
    { code: 'report_top_products', mod: 'Reports', desc: 'Best-selling catalog items' },
    { code: 'report_employee_master', mod: 'Reports', desc: 'Full workforce listing' },
    { code: 'report_salary_history', mod: 'Reports', desc: 'Compensation histories' },
    { code: 'user_management', mod: 'System', desc: 'Manage user accounts and rights' },
    { code: 'system_settings', mod: 'System', desc: 'ERP configuration options' },
    { code: 'database_health', mod: 'System', desc: 'View database telemetry' },
    { code: 'audit_log_view', mod: 'System', desc: 'Review security audit trail' },
  ];

  for (const r of canonicalRights) {
    await turso.execute({
      sql: 'INSERT OR IGNORE INTO RIGHTS (rightCode, module, description) VALUES (?, ?, ?)',
      args: [r.code, r.mod, r.desc],
    });
  }

  // Provision canonical demo & admin accounts
  const HASH_USERADMIN = '$2b$10$X9w/MWVa3yaCKf9RSO.g4u4hBJ.DL16yJQ/gQ/OwaUSIXLupimuVO';
  const HASH_USERSUPERADMIN = '$2b$10$a5H8U/QMgwhb7hbZabadZescwCitO.C/nU/QgdAj/SeiaMwOGsFGm';
  const OLD_MISMATCHED_HASH = '$2b$10$Llhh3Wm5yBZ1lzxToRg..evyWWX0HNLT2hGsYS8qO5jVruBZyIS5O';

  const rawAdminHash = process.env.DEV_ADMIN_PASSWORD_HASH?.trim();
  let adminHash = rawAdminHash;
  if (rawAdminHash?.startsWith('base64:')) {
    try {
      adminHash = Buffer.from(rawAdminHash.slice(7), 'base64').toString('utf8').trim();
    } catch {
      adminHash = undefined;
    }
  } else if (rawAdminHash && !rawAdminHash.startsWith('$2')) {
    try {
      const decoded = Buffer.from(rawAdminHash, 'base64').toString('utf8').trim();
      if (decoded.startsWith('$2')) adminHash = decoded;
    } catch {
      // Not base64
    }
  }

  const effectiveSuperadminHash =
    adminHash && adminHash !== OLD_MISMATCHED_HASH ? adminHash : HASH_USERSUPERADMIN;
  const adminEmail = (process.env.DEV_ADMIN_EMAIL || 'ildefonsojeptahashleyr@gmail.com').toLowerCase().trim();

  const canonicalAccounts = [
    {
      userId: 'usr-admin1',
      firstName: 'Admin',
      lastName: 'One',
      email: 'admin1@gmail.com',
      passwordHash: HASH_USERADMIN,
      role: 'User',
      rights: [
        'add_customer', 'edit_customer',
        'add_product', 'edit_product', 'add_price', 'edit_price',
        'add_sale', 'edit_sale', 'view_sale_details', 'add_sale_detail', 'edit_sale_detail',
        'add_employee', 'edit_employee', 'view_job_history',
        'report_top_customers', 'report_product_master', 'report_top_products',
        'report_active_employees', 'report_all_employees', 'report_employee_job_history', 'report_top_sales'
      ],
    },
    {
      userId: 'usr-admin2',
      firstName: 'Admin',
      lastName: 'Two',
      email: 'admin2@gmail.com',
      passwordHash: HASH_USERADMIN,
      role: 'Admin',
      rights: CANONICAL_36_RIGHTS.map(r => r.code),
    },
    {
      userId: 'usr-superadmin',
      firstName: 'Hope',
      lastName: 'Superadmin',
      email: 'superadmin@hope.com',
      passwordHash: HASH_USERADMIN,
      role: 'Superadmin',
      rights: CANONICAL_36_RIGHTS.map(r => r.code),
    },
    {
      userId: 'usr-dev-jeptah',
      firstName: 'Jeptah Ashley',
      lastName: 'Ildefonso',
      email: adminEmail,
      passwordHash: effectiveSuperadminHash,
      role: 'Superadmin',
      rights: CANONICAL_36_RIGHTS.map(r => r.code),
    },
  ];

  for (const acc of canonicalAccounts) {
    const existingRes = await turso.execute({
      sql: 'SELECT userId FROM USERS WHERE LOWER(email) = LOWER(?)',
      args: [acc.email],
    });
    const existing = existingRes.rows[0];
    const activeUserId = existing ? existing.userId : acc.userId;
    if (!existing) {
      await turso.execute({
        sql: 'INSERT INTO USERS (userId, firstName, lastName, email, passwordHash, role, isBlocked, status, stamp) VALUES (?, ?, ?, ?, ?, ?, 0, "Active", "CREATED system")',
        args: [acc.userId, acc.firstName, acc.lastName, acc.email.toLowerCase(), acc.passwordHash, acc.role],
      });
    } else {
      await turso.execute({
        sql: 'UPDATE USERS SET passwordHash = ?, role = ?, isBlocked = 0, status = "Active" WHERE userId = ?',
        args: [acc.passwordHash, acc.role, existing.userId],
      });
    }

    for (const code of acc.rights) {
      await turso.execute({
        sql: 'INSERT OR IGNORE INTO USERRIGHTS (userId, rightCode) VALUES (?, ?)',
        args: [activeUserId, code],
      });
    }
  }
  console.log('  ✓ Initialized 4 canonical accounts and user rights in Turso');

  console.log('\n[5/5] Running Parity & KPI Assertions...');
  console.log('----------------------------------------------------');

  let totalCanonicalRows = 0;
  for (const table of CANONICAL_TABLES) {
    const res = await turso.execute(`SELECT COUNT(*) as count FROM "${table}"`);
    const count = Number(res.rows[0]?.count || 0);
    totalCanonicalRows += count;
    console.log(`  ✓ ${table.padEnd(14)} : ${String(count).padStart(5)} rows`);
  }

  console.log('----------------------------------------------------');
  console.log(`Total 10-Table Rows: ${totalCanonicalRows} (Canonical target: 928)`);

  // Headline KPI 1: Total Sales (₱688,935.47)
  const salesKpiRes = await turso.execute(`
    SELECT ROUND(SUM(sd.quantity * ph.unitPrice), 2) AS totalSales
    FROM SALESDETAIL sd
    JOIN SALES s ON sd.transNo = s.transNo
    JOIN PRODUCT p ON sd.prodCode = p.prodCode
    JOIN PRICEHIST ph ON p.prodCode = ph.prodCode
    WHERE sd.is_deleted = 0
      AND s.is_deleted = 0
      AND ph.is_deleted = 0
      AND ph.effDate = (
        SELECT MAX(effDate)
        FROM PRICEHIST
        WHERE prodCode = p.prodCode
          AND effDate <= s.salesDate
          AND is_deleted = 0
      )
  `);
  const totalSales = Number(salesKpiRes.rows[0]?.totalSales || 0);

  // Headline KPI 2: Sales Transactions (124)
  const transRes = await turso.execute('SELECT COUNT(DISTINCT transNo) AS count FROM SALES WHERE is_deleted = 0');
  const transCount = Number(transRes.rows[0]?.count || 0);

  // Headline KPI 3: Official Receipts (165)
  const payRes = await turso.execute('SELECT COUNT(*) AS count FROM PAYMENT WHERE is_deleted = 0');
  const payCount = Number(payRes.rows[0]?.count || 0);

  // Headline KPI 4: Active Employees (27)
  const empRes = await turso.execute('SELECT COUNT(*) AS count FROM EMPLOYEE WHERE (sepDate IS NULL OR sepDate = "") AND is_deleted = 0');
  const empCount = Number(empRes.rows[0]?.count || 0);

  console.log('\n--- KPI PARITY CHECKS ---');
  console.log(`  Total Sales Revenue   : ₱${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} (Target: ₱688,935.47) -> ${Math.abs(totalSales - 688935.47) < 0.01 ? 'PASS' : 'FAIL'}`);
  console.log(`  Sales Transactions    : ${transCount} (Target: 124) -> ${transCount === 124 ? 'PASS' : 'FAIL'}`);
  console.log(`  Official Receipts     : ${payCount} (Target: 165) -> ${payCount === 165 ? 'PASS' : 'FAIL'}`);
  console.log(`  Active Staff Count    : ${empCount} (Target: 27) -> ${empCount === 27 ? 'PASS' : 'FAIL'}`);
  console.log('----------------------------------------------------');

  if (totalCanonicalRows === 928 && Math.abs(totalSales - 688935.47) < 0.01 && transCount === 124 && payCount === 165 && empCount === 27) {
    console.log('[SUCCESS] Turso database 100% matched to canonical 928 records & headline KPIs!\n');
  } else {
    console.warn('[WARNING] Parity discrepancy detected. Review table counts above.\n');
  }

  localDb.close();
}

main().catch((err) => {
  console.error('\n[FATAL ERROR]', err);
  process.exit(1);
});
