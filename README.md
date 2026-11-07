# HOPE Group4 Sales and Payments Monitoring System

> **Subject:** Information Management (2nd Year Computer Science Capstone)  
> **Corporate Branding:** HOPE Group4 — Enterprise Database & Information Management  
> **Schema Rule:** Strictly 10 Tables (Hope ERD Faithful • Zero Extra Tables • Standard Audit Trail)  
> **Canonical Dataset Rule:** 100% Faithful to Jeremias C. Esperanza (NEU CCS) `HopeDB_audit.sql.txt` (928 canonical records: 32 Employees, 8 Departments, 14 Jobs, 54 JobHistories, 82 Customers, 57 Products, 79 PriceHistories, 124 Sales, 313 SalesDetails, 165 Payments). This is THE ONLY authoritative data used by the system (all legacy/alternative datasets removed).  
> **Full-Stack Architecture:** Next.js 15 (App Router, Server Actions, TypeScript), Tailwind CSS  
> **Production Target:** Vercel

---

## 📌 1. Project Concept & Architecture

The **HOPE Group4 Sales and Payments Monitoring System** is an enterprise sales monitoring and payment tracking platform built strictly on the canonical 10-table **Hope ERD**. It provides staff daily tools to record sales transactions, inspect line items (product, quantity, computed amounts), record customer payments with auto-numbered Official Receipts (OR), monitor customer profiles, and track PC hardware price histories.

### The Four Core Tabs

The application is structured into four primary operational tabs (plus Home):
1. **Employees:** Workforce records, historical job assignments, and department assignments.
2. **Products & Pricing:** Product specifications, current unit prices, and historical price adjustments.
3. **Customers & Payments:** Master-detail customer directory, payment records (OR #, payment date, sale #, amount), and payment recording.
4. **Sales:** Invoiced sales transactions and sales details (transaction number, product code, quantity, computed amount).

### Strictly 10-Table Relational Schema

```
EMPLOYEE (empNo PK) ──< has >── JOBHISTORY (empNo, jobCode, effDate PK) >── DEPARTMENT (deptCode PK)
         │                                       │
         │                                    includes
         │                                       │
         │                                  JOB (jobCode PK)
         │
     generates
         │
         v
       SALES (transNo PK) ──< contains >── SALESDETAIL (transNo, prodCode PK) >── PRODUCT (prodCode PK)
         │                                                                              │
       makes                                                                          lists
         │                                                                              │
         v                                                                              v
      PAYMENT (ORNo PK)                                                      PRICEHIST (prodCode, effDate PK)
         ^
        pays
         │
     CUSTOMER (custNo PK)
```

### Business Rules Derived Strictly from the ERD
1. **Point-in-Time Unit Pricing:** `SALESDETAIL` has no `unitPrice` column. Prices are dynamically computed from `PRICEHIST` where `effDate <= salesDate ORDER BY effDate DESC LIMIT 1`.
2. **Point-in-Time Department Assignment:** Sales revenue is attributed to the employee's assigned `DEPARTMENT` in `JOBHISTORY` on the transaction date.
3. **Payment Records & Official Receipts:** `PAYMENT` records are linked directly to `SALES`. Official Receipts are auto-numbered and cannot exceed the sale total.
4. **Historical Immutability (Backdating Prevention):** Triggers reject any `PRICEHIST` row dated on or before a recorded sale for that product, and reject any `JOBHISTORY` row dated on or before an employee's recorded sales.
5. **Structured PC Hardware Catalog:** Without adding a category column, product categories are parsed from codes (`CPU`, `GPU`, `MB`, `RAM`, `SSD`, `PSU`, `CASE`, `MON`, `KB`, `MS`), and specifications are parsed from pipe-delimited descriptions (`Brand Model | Spec 1 | Spec 2 | Spec 3`).

---

## 🖥️ 2. Navigation & Captions

The sidebar displays each section label with a secondary descriptive caption:

| Nav Item | Label | Caption | URL Path | Description & Role Access |
|---|---|---|---|---|
| **Home** | **Home** | ERD Overview | `/` | Operational home page: live database connectivity status, interactive 10-table Hope ERD with relationships, and exploration cards for the four modules. (All roles) |
| **Sales** | **Sales** | Sales Detail | `/sales` | Invoiced sales transactions, sales detail line items, CSV export, and New Sale modal. (All roles) |
| **Customers** | **Customers** | Payments | `/customers` | Master-detail customer directory, Payments tab (OR #, Date, Sale #, Amount, Receipt action link), and Record Payment dialog. (All roles) |
| **Products** | **Products** | Price History | `/products` | Hardware catalog with current prices, price trends, and Price History timeline. (All roles) |
| **Employees** | **Employees** | Job, Department | `/employees` | Master-detail workforce directory, job assignment history, and department transfers. (Admin only) |

### Home Page Blocks (`/`)
1. **Welcome Card:** Personalized greeting (*“Welcome back, {firstName}.”*), company introduction, and direct **New Sale** and **Record Payment** action buttons.
2. **Database Status Card:** Server-rendered verification connecting to Supabase (`get_home_summary`), showing operational status, checked timestamp (PHT), a manual Refresh button, and 3 summary metric chips: *10 tables*, *9 relationships*, and *{total rows} rows*.
3. **ERD Card ("Our database"):** Interactive SVG diagram rendering the 10 Hope ERD tables, 9 relationships, crow's foot cardinalities (`||`, `O<`, `|<`), module tint headers, and live row-count chips with hover-highlighting and role-aware navigation.
4. **Explore the System Grid:** Two-column grid presenting cards for the 4 core business sections (Employees, Products & Pricing, Customers & Payments, Sales) with order badges, table chips, and direct entry buttons (restricted for non-admins on Employees).

### Additional Specialized Routes
- **Sale Detail:** `/sales/[transNo]` — Transaction summary, itemized line items, official receipts, and in-place payment recording.
- **Official Receipt:** `/receipts/[orNo]` — Printable Official Receipt displaying HOPE Group4, OR #, payment date, sale #, customer name, and amount.

---

## ⚡ 3. How to Run Locally

### Prerequisites
- Node.js 20+ installed

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Database Commands
npm run db:verify        # Verifies 10 canonical tables and 928 records
npm run db:reset         # Resets local working database (hope.work.db) from pristine seed (hope.db)
npm run db:reset:turso   # Restores production Turso database (requires --confirm=RESET_PRODUCTION_TURSO)

# 3. Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser. You will be redirected to `/` or `/login`.

### Demo Login Credentials & Account Registration
On the `/login` screen, you can sign in directly or register a new staff account:
- 👑 **Executive Administrator** (`admin@hope.demo` / Password: `demo`): Full access including employee records, compensation details, and organization configuration.
- 💼 **Sales Representative** (`sales@hope.demo` / Password: `demo`): Invoicing, customer account management, and product catalog access.
- 💳 **Billing Cashier** (`cashier@hope.demo` / Password: `demo`): Payment receipt validation, Official Receipts issuance, and payment records access.

> **Secure Local Account Storage:** Newly registered staff accounts are securely hashed using **bcrypt (10 salt rounds)** and stored permanently in an isolated local database (`auth.db`), preserving the strict 10-table canonical schema of `hope.db`.

---

## ☁️ 4. Deploying to Vercel with Supabase

### Step 1: Execute Database Setup in Supabase
1. Open your [Supabase Dashboard](https://supabase.com).
2. Go to the **SQL Editor**.
3. Copy and run the entire contents of [`database/hope_erd_master_setup.sql`](database/hope_erd_master_setup.sql). This executes:
   - DDL for all 10 tables with composite primary keys and foreign keys.
   - Triggers for backdating prevention and payment validation.
   - 7 analytical SQL views with `security_invoker = true`.
   - Seed data and transaction dates.

### Step 2: Push to GitHub & Import into Vercel
1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "HOPE Group4 - Sales & Payments Monitoring System completed"
   git push origin main
   ```
2. In [Vercel](https://vercel.com), click **Add New Project** and import the repository.
3. Configure the following Environment Variables in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL (`https://xxxx.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase Anon/Public API Key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (for admin management)
4. Click **Deploy**. Your system will be live at `https://hope-group4.vercel.app`!

---

## ⚠️ Limitations
- Warranty tracking is not included.
- Reporting and analytics are not included. Sales can be filtered by period, department and sales rep and exported to CSV.
