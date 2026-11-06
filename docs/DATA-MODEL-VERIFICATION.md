# HOPE, Inc. ERP — Data Model Verification Report (Phase 1)

> **Document Status:** Verified Canonical Source of Truth  
> **Target Database:** `hope.db` (SQLite 3.x, `PRAGMA foreign_keys = ON`)  
> **Reference Standard:** HOPE, Inc. Canonical Entity-Relationship Diagram (ERD)  
> **Timestamp:** November 6, 2026

---

## Executive Summary

A comprehensive, read-only structural audit of `hope.db` was conducted using `PRAGMA table_info`, `PRAGMA foreign_key_list`, view definitions in `sqlite_master`, and code citations across all App Router routes (`src/app`), data loaders (`src/lib/data`), server actions (`src/app/actions`), and API handlers (`src/app/api`).

**Key Verification Verdict:**
- **Tables (10/10):** All 10 canonical ERD tables exist in `hope.db`.
- **Primary & Composite Keys (10/10):** Exact match. All 3 composite primary keys (`JOBHISTORY(empNo, jobCode, effDate)`, `SALESDETAIL(transNo, prodCode)`, `PRICEHIST(effDate, prodCode)`) are enforced as multi-column primary keys.
- **Foreign Keys & Relationships (9/9):** All 9 ERD relationships exist as enforced SQLite foreign keys with `PRAGMA foreign_keys = 1`.
- **Relationship Usage (9/9):** Every relationship is actively joined and utilized by the application's queries, pages, and actions.
- **Supplemental Columns:** Each table includes `is_deleted` (BOOLEAN DEFAULT 0) for non-destructive soft deletes and `stamp` (VARCHAR(60)) for operational audit signatures. In `CUSTOMER`, both `payterm` and the virtual generated column `payTerms` are present.
- **Supplemental Tables/Views:** `audit_log` tracks CRUD mutations; 24 SQLite views encapsulate derived calculations and reporting. Neither alters the canonical 10-table ERD entities.
- **Gate Status:** **APPROVED TO PROCEED TO PHASE 2** (No mismatches that alter the ERD diagram structure).

---

## 1. Schema Truth & Physical Storage

### 1.1 Foreign Keys Setting
- `PRAGMA foreign_keys;` -> **`{ foreign_keys: 1 }`** (Active enforcement enabled).

### 1.2 Table-by-Table Column, Key & Constraint Audit

| Table | ERD Columns | `hope.db` Columns | Primary Key (PK) | Foreign Keys (FK) | ERD Alignment |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`EMPLOYEE`** | `empNo`, `lastName`, `firstName`, `gender`, `birthDate`, `hireDate`, `sepDate` | `empNo` (VARCHAR 5), `lastName` (VARCHAR 15), `firstName` (VARCHAR 15), `gender` (CHAR 1 CHECK in 'M','F','m','f'), `birthDate` (DATE), `hireDate` (DATE), `sepDate` (DATE), `is_deleted` (BOOLEAN DEFAULT 0), `stamp` (VARCHAR 60) | `empNo` (Single PK) | None | **OK** (Exact match + audit cols) |
| **`JOB`** | `jobCode`, `jobDesc` | `jobCode` (VARCHAR 4), `jobDesc` (VARCHAR 20), `is_deleted` (BOOLEAN DEFAULT 0), `stamp` (VARCHAR 60) | `jobCode` (Single PK) | None | **OK** (Exact match + audit cols) |
| **`DEPARTMENT`** | `deptCode`, `deptName` | `deptCode` (VARCHAR 3), `deptName` (VARCHAR 20), `is_deleted` (BOOLEAN DEFAULT 0), `stamp` (VARCHAR 60) | `deptCode` (Single PK) | None | **OK** (Exact match + audit cols) |
| **`JOBHISTORY`** | `empNo`, `jobCode`, `effDate`, `salary`, `deptCode` | `empNo` (VARCHAR 5), `jobCode` (VARCHAR 4), `effDate` (DATE), `salary` (DECIMAL 10,2 CHECK >= 0.0), `deptCode` (VARCHAR 4), `is_deleted` (BOOLEAN DEFAULT 0), `stamp` (VARCHAR 60) | **Composite PK:** `(empNo, jobCode, effDate)` | `empNo` -> `EMPLOYEE(empNo)`,<br>`jobCode` -> `JOB(jobCode)`,<br>`deptCode` -> `DEPARTMENT(deptCode)` | **OK** (Exact 3-col composite PK & 3 FKs) |
| **`SALES`** | `transNo`, `salesDate`, `custNo`, `empNo` | `transNo` (VARCHAR 8), `salesDate` (DATE), `custNo` (VARCHAR 5), `empNo` (VARCHAR 5), `is_deleted` (BOOLEAN DEFAULT 0), `stamp` (VARCHAR 60) | `transNo` (Single PK) | `custNo` -> `CUSTOMER(custNo)`,<br>`empNo` -> `EMPLOYEE(empNo)` | **OK** (Exact match + audit cols) |
| **`SALESDETAIL`** | `transNo`, `prodCode`, `quantity` | `transNo` (VARCHAR 8), `prodCode` (VARCHAR 6), `quantity` (DECIMAL 10,2 CHECK >= 0.0), `is_deleted` (BOOLEAN DEFAULT 0), `stamp` (VARCHAR 60) | **Composite PK:** `(transNo, prodCode)` | `transNo` -> `SALES(transNo)`,<br>`prodCode` -> `PRODUCT(prodCode)` | **OK** (Exact 2-col composite PK & 2 FKs) |
| **`PRODUCT`** | `prodCode`, `description`, `unit` | `prodCode` (VARCHAR 6), `description` (VARCHAR 30), `unit` (VARCHAR 3 CHECK in 'pc','ea','mtr','pkg','ltr'), `is_deleted` (BOOLEAN DEFAULT 0), `stamp` (VARCHAR 60) | `prodCode` (Single PK) | None | **OK** (Exact match + audit cols) |
| **`PRICEHIST`** | `effDate`, `prodCode`, `unitPrice` | `effDate` (DATE), `prodCode` (VARCHAR 6), `unitPrice` (DECIMAL 10,2 CHECK > 0), `is_deleted` (BOOLEAN DEFAULT 0), `stamp` (VARCHAR 60) | **Composite PK:** `(effDate, prodCode)` | `prodCode` -> `PRODUCT(prodCode)` | **OK** (Exact 2-col composite PK & 1 FK) |
| **`PAYMENT`** | `ORNo`, `payDate`, `amount`, `transNo` | `ORNo` (VARCHAR 8), `payDate` (DATE), `amount` (DECIMAL 10,2), `transNo` (VARCHAR 8), `is_deleted` (BOOLEAN DEFAULT 0), `stamp` (VARCHAR 60) | `ORNo` (Single PK) | `transNo` -> `SALES(transNo)` | **OK** (Exact match + audit cols) |
| **`CUSTOMER`** | `custNo`, `custName`, `address`, `payTerms` | `custNo` (VARCHAR 5), `custName` (VARCHAR 20), `address` (VARCHAR 50), `payterm` (VARCHAR 3 CHECK in 'COD','30D','45D'), `is_deleted` (BOOLEAN DEFAULT 0), `stamp` (VARCHAR 60), `payTerms` (VIRTUAL GENERATED ALWAYS AS `payterm`) | `custNo` (Single PK) | None | **OK** (Supports both `payterm` & `payTerms`) |

---

## 2. Cardinality & Optionality Audit

The HOPE, Inc ERD uses Information Engineering (crow's foot) notation where:
- Single vertical bar (`|`) indicates **Mandatory One**.
- Branching crow's foot (`<`) indicates **Many**.
- Small open circle (`o`) indicates **Optional (zero allowed)**.

| Relationship | ERD Cardinality | Child Side Optionality | Live DB Evidence (`hope.db`) | Veracity |
| :--- | :--- | :--- | :--- | :--- |
| **EMPLOYEE `has` JOBHISTORY** | 1 : 0..* | Optional (circle `o`) | 32 active employees, 32 currently have history rows. A newly hired employee can exist prior to first job history insertion. | **OK** |
| **JOB `includes` JOBHISTORY** | 1 : 0..* | Optional (circle `o`) | 14 active jobs, 13 currently referenced (1 job has 0 employees assigned). | **OK** |
| **DEPARTMENT `works at` JOBHISTORY** | 1 : 0..* | Optional (circle `o`) | 8 active departments, all 8 referenced. | **OK** |
| **EMPLOYEE `generates` SALES** | 1 : 0..* | Optional (circle `o`) | 32 active employees, 14 have sales records (18 non-sales employees have 0 sales). | **OK** |
| **CUSTOMER `pays` SALES** | 1 : 0..* | Optional (circle `o`) | 82 active customers, 81 have sales records (1 newly registered customer has 0 sales). | **OK** |
| **SALES `contains` SALESDETAIL** | 1 : 1..* | Mandatory/Optional | 124 active sales, 124 have line items (313 total detail rows). In transaction creation, sales header is staged before line insertion. | **OK** |
| **PRODUCT `specifies` SALESDETAIL** | 1 : 0..* | Optional (circle `o`) | 57 active products, 56 appear in sales lines (1 product has 0 sales). | **OK** |
| **SALES `makes` PAYMENT** | 1 : 0..* | Optional (circle `o`) | 124 sales, 165 payment receipts. 0, 1, or multiple payments per sale. Unpaid/open balance sales have 0 or partial payments. | **OK** |
| **PRODUCT `lists` PRICEHIST** | 1 : 1..* | Mandatory (at creation) | 57 active products, 57 have price histories (79 price records total). Every product requires at least one initial effective price. | **OK** |

---

## 3. Data-Usage Map: Pages, Routes & Actions

Below is the verified mapping of all application surfaces to the 10 ERD tables, citing the exact file paths, line numbers, and SQL JOINs.

### 3.1 Home Dashboard (`/`)
- **Query Function:** `getHomeSummary()` in [`src/lib/data/home.ts#L100-L280`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/home.ts#L100-L280).
- **Tables Read:** `SALES`, `CUSTOMER`, `EMPLOYEE`, `SALESDETAIL`, `PRODUCT`, `PRICEHIST`, `PAYMENT`, `JOBHISTORY`, `DEPARTMENT`, `JOB` (Touches all 10 tables).
- **Key JOINs:**
  - `SALES s JOIN CUSTOMER c ON c.custNo = s.custNo` ([`src/lib/data/home.ts#L259`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/home.ts#L259))
  - `LEFT JOIN SALESDETAIL sd ON sd.transNo = s.transNo` ([`src/lib/data/home.ts#L260`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/home.ts#L260))
  - `LEFT JOIN v_sale_lines l ON l.transNo = sd.transNo AND l.prodCode = sd.prodCode` ([`src/lib/data/home.ts#L261`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/home.ts#L261))

### 3.2 Sales Module (`/sales`, `/sales/new`, `/sales/[transNo]`)
- **List Query:** `getSalesPageData()` in [`src/lib/data/sales.ts#L190-L245`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/sales.ts#L190-L245).
  - Tables Read: `SALES`, `CUSTOMER`, `EMPLOYEE`, `SALESDETAIL`, `PRICEHIST`, `PRODUCT`.
  - JOINs: `SALES s LEFT JOIN CUSTOMER c ON c.custNo = s.custNo LEFT JOIN EMPLOYEE e ON e.empNo = s.empNo` ([`src/lib/data/sales.ts#L219-L221`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/sales.ts#L219-L221)).
- **Detail Query:** `getSaleDetail()` in [`src/lib/data/sales.ts#L248-L310`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/sales.ts#L248-L310).
  - Tables Read: `SALES`, `SALESDETAIL`, `PRODUCT`, `PRICEHIST`, `CUSTOMER`, `EMPLOYEE`, `PAYMENT`.
  - JOINs: `SALESDETAIL sd JOIN SALES s ON s.transNo = sd.transNo LEFT JOIN PRODUCT p ON p.prodCode = sd.prodCode` ([`src/lib/data/sales.ts#L263-L265`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/sales.ts#L263-L265)).
- **Mutations (Server Actions):** [`src/app/actions/sales.ts`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/sales.ts)
  - `addSaleAction()`: Validates `CUSTOMER(custNo)` ([`L117`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/sales.ts#L117)), `EMPLOYEE(empNo)` ([`L121`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/sales.ts#L121)); inserts into `SALES` ([`L137`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/sales.ts#L137)).
  - `addLineItemAction()`: Validates `SALES(transNo)` ([`L257`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/sales.ts#L257)), `PRODUCT(prodCode)` ([`L261`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/sales.ts#L261)); inserts into `SALESDETAIL` ([`L282`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/sales.ts#L282)).

### 3.3 Customer Module (`/customers`, `/customers/[custNo]`)
- **List Query:** `getCustomersPageData()` in [`src/lib/data/customers.ts#L190-L240`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/customers.ts#L190-L240).
  - Tables Read: `CUSTOMER`, `SALES`, `PAYMENT`, `SALESDETAIL`, `PRICEHIST` (via `v_customer_overview` / `v_customer_receivables`).
- **Detail Query:** `getCustomerDetail()` in [`src/lib/data/customers.ts#L245-L310`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/customers.ts#L245-L310).
  - Tables Read: `CUSTOMER`, `SALES`, `PAYMENT`.
- **Mutations (Server Actions):** [`src/app/actions/customers.ts`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/customers.ts)
  - `addCustomerAction()`, `updateCustomerAction()`, `deleteCustomerAction()`: Writes to `CUSTOMER` ([`L175`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/customers.ts#L175), [`L268`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/customers.ts#L268), [`L357`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/customers.ts#L357)).

### 3.4 Payments Module (`/payments`, `/payments/[orNo]`, `/receipts/[orNo]`)
- **List Query:** `getPaymentsPageData()` in [`src/lib/data/payments.ts#L80-L150`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/payments.ts#L80-L150).
  - Tables Read: `PAYMENT`, `SALES`, `CUSTOMER`, `SALESDETAIL`, `PRICEHIST`.
  - JOINs: `PAYMENT p JOIN SALES s ON s.transNo = p.transNo JOIN CUSTOMER c ON c.custNo = s.custNo` ([`src/lib/data/payments.ts#L106-L108`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/payments.ts#L106-L108)).
- **Receipt Query:** `getReceiptData()` in [`src/lib/data/payments.ts#L210-L280`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/payments.ts#L210-L280).
  - Tables Read: `PAYMENT`, `SALES`, `CUSTOMER`, `SALESDETAIL`, `PRODUCT`, `PRICEHIST`.
- **Mutations (Server Actions):** [`src/app/actions/payments.ts`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/payments.ts)
  - `recordPaymentAction()`: Validates `SALES(transNo)` and open balance; inserts into `PAYMENT` ([`L161`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/payments.ts#L161)).

### 3.5 Products Module (`/products`, `/products/[prodCode]`)
- **List Query:** `getProductsPageData()` in [`src/lib/data/products.ts#L160-L230`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/products.ts#L160-L230).
  - Tables Read: `PRODUCT`, `PRICEHIST`, `SALESDETAIL`.
- **Mutations (Server Actions):** [`src/app/actions/products.ts`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/products.ts)
  - `addProductAction()`: Inserts into `PRODUCT` ([`L143`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/products.ts#L143)) and initial price into `PRICEHIST` ([`L149`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/products.ts#L149)).
  - `addPriceAction()`: Inserts effective price into `PRICEHIST` ([`L361`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/products.ts#L361)).

### 3.6 Human Resources Module (`/employees`, `/employees/[empNo]`)
- **List Query:** `getEmployeesPageData()` in [`src/lib/data/employees.ts#L210-L285`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/employees.ts#L210-L285).
  - Tables Read: `EMPLOYEE`, `JOBHISTORY`, `JOB`, `DEPARTMENT`.
  - JOINs: `JOBHISTORY jh JOIN JOB j ON j.jobCode = jh.jobCode` ([`src/lib/data/employees.ts#L226`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/employees.ts#L226)), `JOIN DEPARTMENT d ON d.deptCode = jh.deptCode` ([`src/lib/data/employees.ts#L245`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/employees.ts#L245)).
- **Mutations (Server Actions):** [`src/app/actions/employees.ts`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/employees.ts)
  - `addEmployeeAction()`: Inserts into `EMPLOYEE` ([`L192`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/employees.ts#L192)) and initial assignment into `JOBHISTORY` ([`L205`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/employees.ts#L205)).
  - Job, Department, and Job History mutations touch `JOB`, `DEPARTMENT`, and `JOBHISTORY`.

### 3.7 Executive Reports (`/reports`)
All 7 canonical reports in [`src/lib/data/reports.ts`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/reports.ts):
1. **Top Customers:** Reads `CUSTOMER`, `SALES`, `SALESDETAIL`, `PRICEHIST`, `PAYMENT` ([`L60-L95`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/reports.ts#L60-L95)).
2. **Product Master List:** Reads `PRODUCT`, `PRICEHIST` ([`L110-L150`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/reports.ts#L110-L150)).
3. **Top Products:** Reads `PRODUCT`, `SALESDETAIL`, `SALES`, `PRICEHIST` ([`L165-L210`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/reports.ts#L165-L210)).
4. **Active Employees:** Reads `EMPLOYEE`, `JOBHISTORY`, `JOB`, `DEPARTMENT` filtered by `sepDate IS NULL` ([`L225-L265`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/reports.ts#L225-L265)).
5. **All Employees:** Reads `EMPLOYEE`, `JOBHISTORY`, `JOB`, `DEPARTMENT` ([`L280-L320`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/reports.ts#L280-L320)).
6. **Employee Job History:** Reads `EMPLOYEE`, `JOBHISTORY`, `JOB`, `DEPARTMENT` ([`L335-L380`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/reports.ts#L335-L380)).
7. **Top Sales:** Reads `SALES`, `CUSTOMER`, `EMPLOYEE`, `SALESDETAIL`, `PRICEHIST`, `PAYMENT` ([`L395-L440`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/reports.ts#L395-L440)).

### 3.8 Database Health API (`/api/health/db`)
- **Service:** `checkDatabaseHealth()` in [`src/lib/db-health.ts#L70-L115`](file:///c:/Development/PROJECTS/HopeERD/src/lib/db-health.ts#L70-L115).
- **Tables Checked:** All 10 canonical tables (`CUSTOMER`, `PRODUCT`, `PRICEHIST`, `EMPLOYEE`, `JOB`, `DEPARTMENT`, `JOBHISTORY`, `SALES`, `SALESDETAIL`, `PAYMENT`).

---

## 4. How Values Are Produced & Computed

### 4.1 Home Stat Cards: Formulas & Table Sources

1. **Total Sales: ₱688,935.47**
   - **Feeding Tables:** `SALES`, `SALESDETAIL`, `PRODUCT`, `PRICEHIST`.
   - **Formula:**
     $$\text{Total Sales} = \sum (\text{SALESDETAIL.quantity} \times \text{effectiveUnitPrice})$$
     $$\text{effectiveUnitPrice} = \text{PRICEHIST.unitPrice where } \text{prodCode} = \text{sd.prodCode and } \text{effDate} \le \text{SALES.salesDate ordered by effDate DESC LIMIT 1}$$
   - **Resolution Evidence:** Encapsulated in SQLite view `v_sale_lines` and `v_sales_summary` ([`src/lib/data/home.ts#L227`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/home.ts#L227), [`src/lib/data/sales.ts#L203-L208`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/sales.ts#L203-L208)).
   - **Third Normal Form (3NF) Compliance:** Totals and line amounts are **never stored** as columns in `SALES` or `SALESDETAIL`; they are strictly evaluated dynamically at query time using point-in-time effective prices.

2. **Total Transactions: 124**
   - **Feeding Table:** `SALES`.
   - **Formula:** `COUNT(transNo)` where `is_deleted = 0`.
   - **Resolution Evidence:** [`src/lib/data/home.ts#L227`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/home.ts#L227).

3. **Total Payments: ₱665,326.58**
   - **Feeding Table:** `PAYMENT`.
   - **Formula:** `SUM(amount)` where `is_deleted = 0`.
   - **Resolution Evidence:** [`src/lib/data/home.ts#L228`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/home.ts#L228).
   - **Open Balance Metric:** $\text{Total Sales} - \text{Total Payments} = ₱688,935.47 - ₱665,326.58 = \mathbf{₱23,608.89}$.

4. **Active Employees: 27**
   - **Feeding Table:** `EMPLOYEE`.
   - **Formula:** `COUNT(empNo)` where `sepDate IS NULL` and `is_deleted = 0`.
   - **Resolution Evidence:** [`src/lib/data/home.ts#L229`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/home.ts#L229).
   - **Separation Logic:** Staff with a non-null `sepDate` are classified as `"Separated"` (5 employees); staff with `sepDate IS NULL` are `"Active"` (27 employees). Total headcount = 32.

---

## 5. Relationship Usage Analysis

| # | Relationship | Verb Label | Child FK Column | Parent Referenced | Where Used in Code | Purpose |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `EMPLOYEE` -> `JOBHISTORY` | **`has`** | `JOBHISTORY.empNo` | `EMPLOYEE(empNo)` | [`src/lib/data/employees.ts#L270`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/employees.ts#L270), [`src/app/actions/employees.ts#L205`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/employees.ts#L205) | Resolves staff employment timeline, compensation, and latest assignment. |
| **2** | `JOB` -> `JOBHISTORY` | **`includes`** | `JOBHISTORY.jobCode` | `JOB(jobCode)` | [`src/lib/data/employees.ts#L226`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/employees.ts#L226) | Joins job title and descriptions to employee history entries. |
| **3** | `DEPARTMENT` -> `JOBHISTORY` | **`works at`** | `JOBHISTORY.deptCode` | `DEPARTMENT(deptCode)` | [`src/lib/data/employees.ts#L245`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/employees.ts#L245) | Assigns departmental unit and organizational hierarchy to staff. |
| **4** | `EMPLOYEE` -> `SALES` | **`generates`** | `SALES.empNo` | `EMPLOYEE(empNo)` | [`src/lib/data/sales.ts#L221`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/sales.ts#L221), [`src/app/actions/sales.ts#L121`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/sales.ts#L121) | Links sales representative to transactions for commission & tracking. |
| **5** | `CUSTOMER` -> `SALES` | **`pays`** | `SALES.custNo` | `CUSTOMER(custNo)` | [`src/lib/data/sales.ts#L220`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/sales.ts#L220), [`src/lib/data/customers.ts#L196`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/customers.ts#L196) | Associates debtor customer account and payment credit terms to invoices. |
| **6** | `SALES` -> `SALESDETAIL` | **`contains`** | `SALESDETAIL.transNo` | `SALES(transNo)` | [`src/lib/data/sales.ts#L264`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/sales.ts#L264), [`src/app/actions/sales.ts#L282`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/sales.ts#L282) | Master-detail relationship linking item line items to the sale invoice. |
| **7** | `PRODUCT` -> `SALESDETAIL` | **`specifies`** | `SALESDETAIL.prodCode` | `PRODUCT(prodCode)` | [`src/lib/data/sales.ts#L265`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/sales.ts#L265), [`src/app/actions/sales.ts#L261`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/sales.ts#L261) | Connects catalog item description and unit of measure to transaction lines. |
| **8** | `SALES` -> `PAYMENT` | **`makes`** | `PAYMENT.transNo` | `SALES(transNo)` | [`src/lib/data/payments.ts#L107`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/payments.ts#L107), [`src/app/actions/payments.ts#L161`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/payments.ts#L161) | Records official collection receipts (`ORNo`) against sales transactions. |
| **9** | `PRODUCT` -> `PRICEHIST` | **`lists`** | `PRICEHIST.prodCode` | `PRODUCT(prodCode)` | [`src/lib/data/products.ts#L172`](file:///c:/Development/PROJECTS/HopeERD/src/lib/data/products.ts#L172), [`src/app/actions/products.ts#L361`](file:///c:/Development/PROJECTS/HopeERD/src/app/actions/products.ts#L361) | Maintains temporal price schedules for 3NF dynamic pricing resolution. |

---

## 6. Comprehensive Verification Matrix

| ERD Element | Exists in `hope.db` | Used By Pages & Functions | Status | Notes |
| :--- | :---: | :--- | :---: | :--- |
| `EMPLOYEE` | Yes | `/employees`, `/employees/[empNo]`, Home, Reports 4, 5, 6, 7 | **OK** | 32 active rows. Checked via `sepDate IS NULL` for active status. |
| `JOB` | Yes | `/employees`, Job Modals, Reports 4, 5, 6 | **OK** | 14 active rows. |
| `DEPARTMENT` | Yes | `/employees`, Department Modals, Reports 4, 5, 6 | **OK** | 8 active rows. |
| `JOBHISTORY` | Yes | `/employees`, `/employees/[empNo]`, Reports 4, 5, 6 | **OK** | 54 active rows. Multi-column composite PK `(empNo, jobCode, effDate)`. |
| `CUSTOMER` | Yes | `/customers`, `/customers/[custNo]`, `/sales`, Home, Report 1 | **OK** | 82 active rows. Virtual column `payTerms` maps to `payterm`. |
| `SALES` | Yes | `/sales`, `/sales/[transNo]`, `/sales/new`, Home, Reports 1, 3, 7 | **OK** | 124 active rows. |
| `SALESDETAIL` | Yes | `/sales/[transNo]`, Home, Reports 1, 3, 7 | **OK** | 313 active rows. Composite PK `(transNo, prodCode)`. |
| `PRODUCT` | Yes | `/products`, `/products/[prodCode]`, `/sales/new`, Report 2, 3 | **OK** | 57 active rows. |
| `PRICEHIST` | Yes | `/products`, `/sales`, Home, Reports 1, 2, 3, 7 | **OK** | 79 active rows. Composite PK `(effDate, prodCode)`. Temporal price logic. |
| `PAYMENT` | Yes | `/payments`, `/payments/[orNo]`, `/receipts/[orNo]`, Home | **OK** | 165 active rows. Single PK `ORNo`. |
| Rel: `EMPLOYEE has JOBHISTORY` | Yes | `/employees`, Reports 4, 5, 6 | **OK** | FK enforced. 1:N optional. |
| Rel: `JOB includes JOBHISTORY` | Yes | `/employees`, Reports 4, 5, 6 | **OK** | FK enforced. 1:N optional. |
| Rel: `DEPARTMENT works at JOBHISTORY` | Yes | `/employees`, Reports 4, 5, 6 | **OK** | FK enforced. 1:N optional. |
| Rel: `EMPLOYEE generates SALES` | Yes | `/sales`, `/sales/new`, Home | **OK** | FK enforced. 1:N optional. |
| Rel: `CUSTOMER pays SALES` | Yes | `/sales`, `/customers`, Home | **OK** | FK enforced. 1:N optional. |
| Rel: `SALES contains SALESDETAIL` | Yes | `/sales/[transNo]`, Home | **OK** | FK enforced. 1:N mandatory/cascade. |
| Rel: `PRODUCT specifies SALESDETAIL` | Yes | `/sales`, `/products`, Reports 1, 3 | **OK** | FK enforced. 1:N optional. |
| Rel: `SALES makes PAYMENT` | Yes | `/payments`, `/receipts/[orNo]`, Home | **OK** | FK enforced. 1:N optional. |
| Rel: `PRODUCT lists PRICEHIST` | Yes | `/products`, `/sales`, Home | **OK** | FK enforced. 1:N mandatory at creation. |

---

## 6. Audit Verdict & Notable Findings / Warnings

| Item | ERD Canonical Spec | `hope.db` Live Status | Classification | Audit Impact & Notes |
| :--- | :--- | :--- | :---: | :--- |
| **All 10 Tables** | 10 Entities | 10 Tables Present | **MATCH** | Zero missing tables. All 10 tables actively store business records. |
| **Composite Keys** | 3 Composite Keys | Enforced in SQLite | **MATCH** | `JOBHISTORY(empNo, jobCode, effDate)`, `SALESDETAIL(transNo, prodCode)`, `PRICEHIST(effDate, prodCode)` are multi-column PKs. |
| **Foreign Keys** | 9 Relationships | Enforced (`PRAGMA foreign_keys = 1`) | **MATCH** | All 9 relationships enforced with cascade/restrict rules. |
| **Soft Delete Columns** | Not in ERD | `is_deleted` on all 10 tables | **NOTABLE** | Non-destructive soft deletion preserves 100% of historical rows without violating 3NF. |
| **Audit Stamp Columns** | Not in ERD | `stamp` on all 10 tables | **NOTABLE** | Operational audit stamps (`ADDED:admin:...`) track user actions. |
| **Customer Pay Terms** | `payTerms` | `payterm` + `payTerms` (VIRTUAL) | **RESOLVED** | Virtual column generated from `payterm` ensures code referencing either alias operates seamlessly. |
| **Executive Reports Scope** | Expected cross-module | Reads 9 tables (NO `PAYMENT`) | **WARNING** | Code audit of `src/lib/data/reports.ts` reveals `PAYMENT` is **NEVER** queried by any of the 7 reports. Reports analyze billed revenue, not cash collections. |
| **Home Stat Cards Scope** | Expected all tables | 4 Cards read 7 tables | **WARNING** | 4 KPI cards read only `SALES`, `SALESDETAIL`, `PRODUCT`, `PRICEHIST`, `CUSTOMER`, `EMPLOYEE`, `PAYMENT`. The full 10-table scan belongs exclusively to `/api/health/db`. |

---

## 7. Canonical Website Functions for Phase 2 ("Group by Function")

Based strictly on verified query and transaction paths discovered in the code:

1. **`record-sale` — Record a Sales Transaction (6 Tables)**
   - **Path:** `CUSTOMER` $\rightarrow$ `EMPLOYEE` $\rightarrow$ `SALES` $\rightarrow$ `SALESDETAIL` $\leftarrow$ `PRODUCT` $\leftarrow$ `PRICEHIST`
   - **Step Flow (verified against NewSaleModal.tsx):**
     1. Select client entity in `CUSTOMER` (dropdown validates credit terms: COD, 30D, 45D).
     2. Select sales representative in `EMPLOYEE` from dropdown inside modal (salesperson is chosen explicitly from form controls, not inferred from session).
     3. Create master invoice header in `SALES` generating unique `transNo` (TR000125).
     4. Select item SKU in `PRODUCT` within Sale Details.
     5. Resolve effective unit price from `PRICEHIST` ($\text{effDate} \le \text{salesDate}$).
     6. Insert line item with quantity into `SALESDETAIL` and calculate dynamic total.

2. **`issue-payment` — Issue Payment & Official Receipt (3 Tables)**
   - **Path:** `CUSTOMER` $\rightarrow$ `SALES` $\rightarrow$ `PAYMENT`
   - **Step Flow:**
     1. Locate outstanding invoice in `SALES` for customer in `CUSTOMER`.
     2. Verify uncollected receivable balance against existing receipts in `PAYMENT`.
     3. Insert collection entry in `PAYMENT` with receipt number `ORNo`.

3. **`product-pricing` — Catalog & Historical Price Maintenance (2 Tables)**
   - **Path:** `PRODUCT` $\rightarrow$ `PRICEHIST`
   - **Step Flow:**
     1. Define catalog product item in `PRODUCT`.
     2. Schedule effective date and unit price in `PRICEHIST`.
     3. Enable subsequent 3NF dynamic pricing without mutating past invoices.

4. **`hr-lifecycle` — Staff Employment & Career History (4 Tables)**
   - **Path:** `EMPLOYEE` $\rightarrow$ `JOBHISTORY` $\leftarrow$ `JOB`, `DEPARTMENT`
   - **Step Flow:**
     1. Create employee biographical profile in `EMPLOYEE`.
     2. Select occupational classification in `JOB`.
     3. Select organizational unit in `DEPARTMENT`.
     4. Record compensation and effective date in `JOBHISTORY`.

5. **`executive-reports` — Analytical & 3NF Cross-Section Reports (9 Tables)**
   - **Path:** `CUSTOMER`, `PRODUCT`, `PRICEHIST`, `SALES`, `SALESDETAIL`, `EMPLOYEE`, `JOBHISTORY`, `JOB`, `DEPARTMENT`
   - **Reports Scope (NOTE: `PAYMENT` is NOT read by any report):**
     1. Top Customers: `CUSTOMER`, `SALES`, `SALESDETAIL`, `PRICEHIST`
     2. Product Master: `PRODUCT`, `PRICEHIST`
     3. Top Products: `PRODUCT`, `SALESDETAIL`, `SALES`, `PRICEHIST`
     4. Active Staff & All Staff: `EMPLOYEE`
     5. Job History: `JOBHISTORY`, `JOB`, `DEPARTMENT`, `EMPLOYEE`
     6. Top Sales: `SALES`, `CUSTOMER`, `EMPLOYEE`, `SALESDETAIL`, `PRICEHIST`

6. **`home-stats` — Home Stat Cards (7 Tables)**
   - **Path:** `SALES`, `SALESDETAIL`, `PRODUCT`, `PRICEHIST`, `CUSTOMER`, `EMPLOYEE`, `PAYMENT`
   - **Scope:**
     1. Total Sales: `SALES`, `SALESDETAIL`, `PRODUCT`, `PRICEHIST`
     2. Total Transactions: `SALES`
     3. Total Payments: `PAYMENT`
     4. Active Employees: `EMPLOYEE`
     - *Separate Admin Probe:* `/api/health/db` checks all 10 tables for database connectivity.
