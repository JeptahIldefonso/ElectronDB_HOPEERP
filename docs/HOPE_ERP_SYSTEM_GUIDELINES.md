# Hope, Inc. ERP — System Architecture & Implementation Guidelines

> **Document Type:** Canonical Master System Specification  
> **Source Standard:** *Hope, Inc. ERP — A beginner’s guide to building a database-driven business system, explained with its own screens* (October 2026)  
> **Technical Stack:** Next.js 15 (App Router, Server Actions, TypeScript), Tailwind CSS, SQLite (`hope.db` + `auth.db`)  
> **Core Mandate:** 100% functional and structural fidelity to the Student Guide with modern UI enhancements. Strict database preservation: zero loss, zero modification of existing 928 records.

---

## 1. The Big Picture

### 1.1 Purpose & Enterprise Resource Planning Concept
Hope, Inc. ERP is a small business system that keeps customers, products, employees, and sales in one place. Instead of separate spreadsheets for each department, every module reads and writes the same centralized database.

### 1.2 The Six Core Modules

| Module | What It Manages | Main Tables | Role Access |
|---|---|---|:---:|
| **Customers** | Buyer directory, address, credit terms (Net 30, COD, Prepaid...) | `CUSTOMER` | All roles (View filtered by rights) |
| **Products** | Hardware catalog and each product's price history over time | `PRODUCT`, `PRICEHIST` | All roles |
| **Human Resources** | Employees, job titles, departments, and job/salary history | `EMPLOYEE`, `JOB`, `DEPARTMENT`, `JOBHISTORY` | Admin & Superadmin (Users if granted) |
| **Sales** | Sale header (date, buyer, seller) and product line items | `SALES`, `SALESDETAIL`, `PAYMENT` | All roles |
| **Reports** | 7 read-only analytical SQL summaries with Print & Save as PDF | Reads all tables | All roles (Subject to individual rights) |
| **User Management** | Accounts, authentication, password hashes, role promotion, blocking, and the 36-rights matrix | `USERS`, `RIGHTS`, `USERRIGHTS` | Superadmin & Admin only |

### 1.3 The Three System Roles

```
┌────────────────────────────────────────────────────────┐
│                      Superadmin                        │  (System Owner)
│   • Full access to all 6 modules & System Settings     │
│   • Can assign any role (Superadmin, Admin, User)      │
│   • Sees all records incl. deleted, Status & Stamp     │
└───────────────────────────┬────────────────────────────┘
                            │ promotes
┌───────────────────────────▼────────────────────────────┐
│                        Admin                           │  (Manager)
│   • Manages modules, accounts, and user rights         │
│   • Cannot see or modify Superadmin accounts           │
│   • Sees all records incl. deleted, Status & Stamp     │
└───────────────────────────┬────────────────────────────┘
                            │ assigns 36 rights
┌───────────────────────────▼────────────────────────────┐
│                        User                            │  (Staff)
│   • Access ONLY to modules & actions granted by Admin  │
│   • Sees status = 'Active' rows only                   │
│   • Status and Stamp columns are STRICTLY HIDDEN       │
└────────────────────────────────────────────────────────┘
```

---

## 2. The Database & Relational Architecture

### 2.1 The 10 Canonical ERD Tables

All 928 active production records across these 10 tables in `hope.db` are permanently preserved:

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

### 2.2 Table Dictionary

| Table | One Row Is... | Primary Key | Foreign Keys |
|---|---|---|---|
| `EMPLOYEE` | A person who works or worked for Hope | `empNo` | — |
| `JOB` | A job title (e.g. Software Engineer, Sales Rep) | `jobCode` | — |
| `DEPARTMENT` | An organisational unit (e.g. Engineering, Sales) | `deptCode` | — |
| `JOBHISTORY` | One job assignment starting on a date with salary | `empNo + jobCode + effDate` | `empNo → EMPLOYEE`, `jobCode → JOB`, `deptCode → DEPARTMENT` |
| `CUSTOMER` | A buyer with address and payment terms | `custNo` | — |
| `PRODUCT` | An item for sale (code, description, unit) | `prodCode` | — |
| `PRICEHIST` | The unit price of a product starting on a date | `prodCode + effDate` | `prodCode → PRODUCT` |
| `SALES` | Header of one sale (date, who bought, who sold) | `transNo` | `custNo → CUSTOMER`, `empNo → EMPLOYEE` |
| `SALESDETAIL` | One product line on a sale | `transNo + prodCode` | `transNo → SALES`, `prodCode → PRODUCT` |
| `PAYMENT` | One payment (Official Receipt) made on a sale | `ORNo` | `transNo → SALES` |

---

### 2.3 Status and Stamp Columns (Audit & Soft-Delete Policy)

Every table supports soft-delete and latest audit tracking:
* **`status`** (`'Active'` / `'Inactive'`):
  - Deleting a row sets `status = 'Inactive'` (soft delete).
  - Admin/Superadmin can **Restore** an inactive row.
  - Users see only `status = 'Active'` rows.
* **`stamp`** (`VARCHAR(80)`):
  - Audit trail of the latest operation: `CREATED system 2026-10-01 9:00 AM`, `EDITED user1 ...`, `DELETED user2 ...`, `RESTORED user1 ...`.
  - For Users, `status` and `stamp` columns are completely hidden.

---

### 2.4 User Management Schema (Dedicated `auth.db`)

Separated in `auth.db` to protect `hope.db`'s 10-table canonical schema:
1. **`USERS`**:
   `userId` (PK), `firstName`, `lastName`, `email` (unique), `passwordHash` (bcrypt salted), `role` (`'Superadmin'`, `'Admin'`, `'User'`), `isBlocked` (boolean), `status`, `stamp`, `createdAt`.
2. **`RIGHTS`**:
   `rightCode` (PK), `module`, `description` — 36 canonical rights.
3. **`USERRIGHTS`**:
   `userId` (FK) + `rightCode` (FK) composite PK.

---

### 2.5 Derived Data Is NOT Stored

1. **`SALES` has no `total` column:** Computed on demand:
   $$\text{Total} = \sum (\text{SALESDETAIL.quantity} \times \text{PRICEHIST.unitPrice})$$
   where `PRICEHIST.effDate <= SALES.salesDate` (latest active price).
2. **`PRODUCT` has no `currentPrice` column:** Computed from:
   $$\text{Current Price} = \text{PRICEHIST.unitPrice where } \text{effDate} \le \text{CURRENT\_DATE ORDER BY effDate DESC LIMIT 1}$$
3. **`SALESDETAIL` has no `unitPrice` column:** Point-in-time pricing ensures an older sale preserves its historical price even if product prices increase later.

---

## 3. Screen Specifications & Module Guidelines

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HOPE, INC. ERP SCREENS                          │
├─────────────────┬───────────────────────┬──────────────────────────────┤
│ 1. Public Flow  │ 2. Operations         │ 3. Security & Governance     │
│  • Landing (/)  │  • Customers (/cust)  │  • User Management (/users)  │
│  • Login        │  • Products (/prod)   │  • 36-Rights Matrix Modal    │
│  • Register     │  • HR (/employees)    │  • Reports (/reports - 7)    │
│  • Reset Pass   │  • Sales (/sales)     │  • Block / Unblock Engine    │
└─────────────────┴───────────────────────┴──────────────────────────────┘
```

### 3.1 Public Landing & Authentication (§3.1, Figures 2–5)
* **Public Landing Page (`/` or `/landing`):**
  - Hero headline: *"Run your entire business with confidence"*.
  - 4 module preview cards: Customers, Products, Human Resources, Sales.
  - Direct action buttons: "Sign In to Dashboard", "Register".
* **Register Form (Figure 3):**
  - Inputs: First name, Last name, Email address, Password.
  - Notice box: *"New accounts are created as User. Superadmin and Admin roles can only be assigned by existing administrators."*
  - Automatically assigns role `User`.
* **Login Form (Figure 4):**
  - Inputs: Email address, Password, "Reset password" link.

* **Password Recovery (`/reset-password`, Figure 5):**
  - Enter registered email to verify account, then proceed to set new password directly.

---

### 3.2 Dynamic Dashboards (§3.2, Figures 6–8)
* **Superadmin View (Figure 6):** Full menu including User Management and System Settings.
* **Admin View (Figure 7):** All business modules and User Management (no Superadmin root settings).
* **User View (Figure 8):** Only modules and actions granted to them. Ungranted modules are hidden from sidebar and disabled in Quick Actions.
* **Live KPI Cards:**
  - Real SQL queries from active rows:
    - Customers: `SELECT COUNT(*) FROM CUSTOMER WHERE status = 'Active'`
    - Products: `SELECT COUNT(*) FROM PRODUCT WHERE status = 'Active'`
    - Orders: `SELECT COUNT(*) FROM SALES WHERE status = 'Active'`
    - Revenue: Calculated sum of all active sales line items.

---

### 3.3 Customer Management (§3.3, Figures 9–10)
* **Admin View (Figure 9):**
  - Status tabs: `Active (X)`, `Inactive (Y)`, `All (Z)` with item counts.
  - Search box filtering rows as you type.
  - Columns: `CUST NO`, `CUSTOMER NAME`, `ADDRESS`, `PAY TERMS`, `STATUS` (badge), `STAMP`, `ACTIONS`.
  - Actions: `Edit`, `Delete` (active rows) / `Restore` (inactive rows). Inactive rows are shaded.
  - `+ Add Customer` modal button.
* **User View (Figure 10):**
  - No status tabs. Filtered to `WHERE status = 'Active'`.
  - Columns: `CUST NO`, `CUSTOMER NAME`, `ADDRESS`, `PAY TERMS`, `ACTIONS`.
  - `STATUS` and `STAMP` columns are **strictly hidden**.

---

### 3.4 Product Management & Price History (§3.4, Figures 11–14)
* **Products Catalog:**
  - Columns: `PROD CODE`, `DESCRIPTION`, `UNIT`, `CURRENT PRICE`, `STATUS`*, `STAMP`*, `ACTIONS`.
  - Current Price dynamically fetched from `PRICEHIST`. Displays `—` if no effective price.
* **Price History Modal (Figures 12–13):**
  - Triggered via `Prices` button on a product row.
  - Table: `EFFECTIVE DATE`, `UNIT PRICE`, `STATUS`*, `STAMP`*, `ACTIONS`.
  - `+ Add Price` modal button.
  - *Note: `STATUS` and `STAMP` hidden for User view.*

---

### 3.5 Human Resources: Three-Tab Architecture (§3.5, Figures 15–22)
* **Three Top-Level Tabs:** `Employees`, `Jobs`, `Departments`.
* **Employees Tab (Figure 15 & 20):**
  - Columns: `EMP NO`, `LAST NAME`, `FIRST NAME`, `GENDER`, `BIRTH DATE`, `HIRE DATE`, `SEP DATE`, `STATUS`*, `STAMP`*, `ACTIONS`.
  - Actions: `History`, `Edit`, `Delete` / `Restore`.
  - `+ Add Employee` modal button.
* **Job History Modal (Figures 16–17):**
  - Triggered via `History` button on an employee.
  - Columns: `EFF DATE`, `JOB`, `DEPARTMENT`, `SALARY`, `STATUS`*, `STAMP`*, `ACTIONS`.
  - `+ Add History` modal button.
  - **Data Privacy Act of 2012 (RA 10173):** Salaries and Job History are personal data; hidden unless user holds `view_job_history` right.
* **Jobs Tab (Figures 18 & 21):**
  - Columns: `JOB CODE`, `DESCRIPTION`, `STATUS`*, `STAMP`*, `ACTIONS`.
  - `+ Add Job` modal button.
* **Departments Tab (Figures 19 & 22):**
  - Columns: `DEPT CODE`, `DEPARTMENT NAME`, `STATUS`*, `STAMP`*, `ACTIONS`.
  - `+ Add Department` modal button.

---

### 3.6 Sales: Master-Detail Architecture (§3.6, Figures 23–27)
* **Sales Management Screen (Figures 23 & 27):**
  - Columns: `TRANS NO`, `SALES DATE`, `CUSTOMER`, `EMPLOYEE`, `TOTAL`, `STATUS`*, `STAMP`*, `ACTIONS`.
  - Actions: `Details`, `Edit`, `Delete` / `Restore`. Soft-deleted sale total displays as `$0.00`.
  - `+ New Sale` button.
* **New Sale Form (Figure 24 - 4 Strict Rules):**
  1. Transaction No. is auto-numbered and read-only.
  2. Customer is a dropdown from `CUSTOMER` table.
  3. Employee is a dropdown from `EMPLOYEE` table.
  4. Status and Stamp are generated by the system, not typed.
* **Sale Details Screen / Dialog (Figures 25–26):**
  - Header displays Transaction No, Date, Customer.
  - Itemized lines table: `PRODUCT`, `QTY`, `UNIT PRICE`, `LINE TOTAL`, `STATUS`*, `STAMP`*, `ACTIONS`.
  - Unit price looked up from `PRICEHIST` as of `salesDate`.
  - `+ Add Line` button. Bottom summary shows total sum.

---

### 3.7 The Reports Module: 7 Canonical Reports (§3.7, Figures 28–34)
Dedicated `/reports` route with 7 tabs, including **Print** and **Save as PDF** buttons:

| # | Report Title | Business Question | Inputs / Filters | Output Columns |
|---|---|---|---|---|
| **1** | **Top Customers by Sales** | Who buys the most? | From date, To date, Top N | Rank, Cust No, Customer Name, Total Sales |
| **2** | **Product Master List** | What do we sell and at what current price? | Active products only | Prod Code, Description, Unit, Current Price |
| **3** | **Top Products by Sales Amount** | Which products earn the most? | From date, To date, Top N | Rank, Prod Code, Description, Qty Sold, Sales Amount |
| **4** | **Active Employees** | Who currently works here? | `sepDate IS NULL` | Emp No, Last Name, First Name, Gender, Birth Date, Hire Date |
| **5** | **All Employees** | Full roster including separated staff | — | Emp No, Last Name, First Name, Gender, Birth Date, Hire Date, Sep Date, Status |
| **6** | **Employee Job History** | How did an employee's career/salary evolve? | Choose an employee | Eff Date, Job, Department, Salary |
| **7** | **Top Sales** | Which transactions are the largest? | From date, To date, Top N | Rank, Trans No, Date, Customer, Employee, Total |

* **Cross-Report Consistency Verification ("Try It", p. 15):**
  $$\sum \text{Top Products} \equiv \sum \text{Top Customers} \equiv \sum \text{Top Sales} \quad (\text{Equal across any matching date window})$$

---

### 3.8 User Management & 36-Rights Matrix (§3.8, Figures 35–40)
* **User Management Table (`/users`):**
  - Columns: `NAME`, `EMAIL`, `ROLE`, `STATUS`, `ACTIONS`.
  - Superadmin accounts are hidden from Admins. Other Admins display `—` in Actions.
  - Actions for Users: **Block / Unblock**, **Rights**, and **Edit**.
* **Block / Unblock Engine:**
  - Status changes to red `Blocked`. Button switches to `Unblock`. Blocked users are rejected at login.
* **The 36 Canonical Rights:**
  - **Customer (3):** `add_customer`, `edit_customer`, `delete_customer`
  - **Product (6):** `add_product`, `edit_product`, `delete_product`, `add_price`, `edit_price`, `delete_price`
  - **Human Resources (13):** `add_job`, `edit_job`, `delete_job`, `add_department`, `edit_department`, `delete_department`, `add_employee`, `edit_employee`, `delete_employee`, `view_job_history`, `add_job_history`, `edit_job_history`, `delete_job_history`
  - **Sales (7):** `add_sale`, `edit_sale`, `delete_sale`, `view_sale_details`, `add_sale_detail`, `edit_sale_detail`, `delete_sale_detail`
  - **Reports (7):** `report_top_customers`, `report_product_master`, `report_top_products`, `report_active_employees`, `report_all_employees`, `report_employee_job_history`, `report_top_sales`
* **Rights Modal:** Grouped into 5 module boxes with **All** and **None** quick-toggle buttons.
* **Server Enforcement:** The server verifies permissions on every request; never rely solely on client button hiding.

---

### 3.9 Payments Extension (§4.2)
* `PAYMENT` table (`ORNo`, `payDate`, `amount`, `transNo`).
* Payments screen (`/payments`) and printable Official Receipt (`/receipts/[orNo]`).
* Displays outstanding balance: $\text{Balance} = \text{Sale Total} - \sum \text{Payments}$.

---

## 4. Build Roadmap & Verification Gates

### 4.1 Suggested Build Order (§4.1)
1. **Database Schema:** Tables, composite keys, `status` and `stamp` columns.
2. **Sample Data:** Populate initial rows without data corruption.
3. **Authentication & Roles:** Register, login, salted password hashes, session cookies.
4. **Customers Module:** First full CRUD template with soft-delete and restore.
5. **Products & Price History:** First parent-child one-to-many screen with effective date lookup.
6. **Human Resources:** Lookups first (`Jobs`, `Departments`), then `Employees`, then `Job History`.
7. **Sales Module:** Master-detail transaction headers and detail lines.
8. **Reports:** Analytical queries reading across all tables with PDF export.
9. **User Management & Rights:** Wire the 36 rights into navigation, UI buttons, and Server Actions.

---

### 4.2 Role Testing Matrix (§4.3)

| Test Item | Superadmin | Admin | User |
|---|:---:|:---:|:---:|
| **See soft-deleted rows (shaded)** | ✅ Yes | ✅ Yes | ❌ Filtered out |
| **See Status & Stamp columns** | ✅ Yes | ✅ Yes | ❌ Strictly hidden |
| **Restore soft-deleted records** | ✅ Yes | ✅ Yes | ❌ No |
| **Access User Management** | ✅ All accounts | ✅ Users only | ❌ Access Denied |
| **Access System Settings** | ✅ Yes | ❌ No | ❌ No |
| **Execute Modifying Actions** | ✅ All | ✅ All | ⚠️ Only if granted in rights |
| **Blocked User Sign In** | ❌ Refused | ❌ Refused | ❌ Refused |

---

## 5. Architectural Style & Sidebar Identity

The application maintains the high-aesthetic editorial typographic sidebar:
- **Title:** `ElectronDB` in `font-editorial italic text-[25px]`
- **Subtitle:** `MONITORING • HOPEERP` in `font-mono text-[10px] tracking-widest`
- **Sections:** `OVERVIEW`, `TRANSACTIONS`, `CATALOG`, `ORGANIZATION`, `ADMINISTRATION` in `font-mono text-[10px]`
- **Items:** `text-[15px] font-sans` with `ChevronRight`
- **Profile:** Verified user handle with `CheckCircle2` and lock sign-out.
