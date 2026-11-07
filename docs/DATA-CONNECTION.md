# Data Connection & Database Architecture — ElectronDB ERP

This document explains how database connections, data persistence, and health monitoring work in the **ElectronDB ERP** (Hope, Inc. ERP) project across both local development and cloud deployment on Vercel.

---

## 1. Dual-Engine Architecture Overview

To balance **local zero-setup offline speed** with **persistent cloud writes on Vercel serverless**, ElectronDB ERP uses an adaptive architecture:

| Environment | Database Engine | Database Target | Writes Persist? | Role / Safety |
| :--- | :--- | :--- | :--- | :--- |
| **Local Development** | Native SQLite (`@libsql/client` `file:` adapter) | `hope.work.db` (working copy in repo root) | **Yes** (persists in `hope.work.db`) | Master `hope.db` is pristine (928 rows). Working copy can be reset anytime via `npm run db:reset`. |
| **Production (Configured)** | Turso Cloud libSQL (`@libsql/client` remote) | `TURSO_DATABASE_URL` (libsql cloud cluster) | **Yes** (persists across all Vercel cold starts) | Multi-replica distributed SQLite with full ACID transactions. |
| **Production (Fallback)** | Native SQLite (Bundled read-only) | Bundled `hope.db` | **No** (Safe Read-Only Demo) | If `TURSO_DATABASE_URL` is omitted, write actions display friendly demo badges instead of throwing raw database errors. |

---

## 2. End-to-End Data Path

```text
===================================================================================
1. USER BROWSER
   │
   ├─► Navigates to Page (e.g., /sales, /products, /employees)
   │     │  (Next.js Server Component executes data queries)
   │     ▼
   └─► User Action (e.g., Create Sale, Add Employee, Record Payment)
         │  (Server Action with Zod validation and atomic transactions)
         ▼
===================================================================================
2. SERVER RUNTIME (Next.js App Router)
   │
   ├── Server Actions: src/app/actions/*.ts
   │     │ Enforces role permissions (checkUserPermission)
   │     │ Wraps multi-table mutations in BEGIN / COMMIT / ROLLBACK
   │     ▼
   └── Data Access Layer: src/lib/data/*.ts
         │ Queries analytics, audit trails, and master records
         ▼
===================================================================================
3. UNIFIED DATABASE CLIENT (src/lib/hope-db.ts)
   │
   ├─► Checks Environment:
   │     ├─► Are TURSO_DATABASE_URL & TURSO_AUTH_TOKEN set?
   │     │     ▼
   │     │   [YES: TURSO CLOUD ENGINE]
   │     │   Connects via @libsql/client remote HTTP/WebSocket
   │     │   Full read-write persistence across all serverless invocations
   │     │
   │     └─► [NO / LOCAL DEVELOPMENT]
   │           ▼
   │           ├─► On Vercel: Opens bundled hope.db in read-only mode
   │           └─► Locally: Auto-creates hope.work.db from pristine hope.db
   │               Connects via @libsql/client file: adapter
   ▼
===================================================================================
4. DATABASE STORAGE
   │
   ├── Canonical 10 ERP Tables (928 records):
   │     CUSTOMER (82), PRODUCT (57), PRICEHIST (79), EMPLOYEE (32),
   │     JOB (14), DEPARTMENT (8), JOBHISTORY (54), SALES (124),
   │     SALESDETAIL (313), PAYMENT (165)
   │
   ├── Audit Logging:
   │     audit_log (Tracks every INSERT, UPDATE, DELETE with before/after JSON)
   │
   └── Unified Authentication & RBAC:
         USERS, RIGHTS (36 permissions), USERRIGHTS
===================================================================================
```

---

## 3. Database Isolation: Master Seed vs. Working Database

To safeguard canonical test fixtures and report assertions, the project strictly isolates master data from mutations during local development:

1. **`hope.db` (Master Seed):**
   - Committed to git.
   - Contains exactly **928 canonical records**.
   - NEVER written to directly during application execution.
   - Verified via: `npm run db:verify -- --master`

2. **`hope.work.db` (Local Working Copy):**
   - Automatically generated on first run by copying `hope.db`.
   - Ignored by git (`.gitignore`).
   - Receives all local insertions, edits, and deletions.
   - Can be wiped and restored to canonical 928 rows anytime via:
     ```bash
     npm run db:reset
     ```

---

## 4. Production Turso Cloud Setup & Migration

### A. Environment Variables Required on Vercel
Add the following in your **Vercel Project Settings → Environment Variables**:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `TURSO_DATABASE_URL` | The `libsql://` connection URL from Turso | `libsql://electrondb-hope-yourteam.turso.io` |
| `TURSO_AUTH_TOKEN` | The secret access token generated for your database | `eyJhbGciOiJIUzI1NiIsInR5...` |

*(Never commit these secrets to git. Keep them strictly in Vercel environment variables or your local `.env.local` for testing).*

### B. Initializing Turso with Canonical Parity
To populate your remote Turso database with all 10 canonical tables, 928 records, and auth credentials, run the guarded migration script:

```powershell
node scripts/reset-turso.mjs --confirm=RESET_PRODUCTION_TURSO
```

The script performs:
1. Complete table schema creation from `hope.db`.
2. Safe batch insertion of all 928 canonical records.
3. Creation of `USERS`, `RIGHTS` (36 rights), and `USERRIGHTS`.
4. Automated verification asserting exact headline parity:
   - **Total Sales:** ₱688,935.47
   - **Sales Transactions:** 124
   - **Official Receipts:** 165
   - **Active Workforce:** 27

---

## 5. Backup & Disaster Recovery

### Local Database Backup
```powershell
# Copy working state to a timestamped backup
Copy-Item hope.work.db "backups/hope.work.$(Get-Date -Format 'yyyyMMdd-HHmmss').db"
```

### Remote Turso Cloud Backup
Using the Turso CLI:
```bash
turso db dump <your-db-name> > backup-turso-$(date +%Y%m%d).sql
```

To restore from the canonical master at any time:
```powershell
npm run db:reset:turso -- --confirm=RESET_PRODUCTION_TURSO
```

---

## 6. Demo Safety & Production Access Control

To protect database integrity on the public deployment:
1. **One-Click Superadmin Access Disabled on Vercel:**
   The one-click demo login buttons in production allow login as limited roles (**User / Staff**). Attempting one-click Superadmin sign in on the live site is rejected with an explanatory security notice.
2. **Superadmin Login Requires Credentials:**
   Full administrator privileges require typing the genuine account credentials in the sign-in form.
3. **Friendly Error Sanitization:**
   Raw SQLite or libSQL error strings are intercepted by `sanitizeDbError()` and replaced with user-friendly error banners in the UI.
