# Slice Plan: Developer Tasks (S1-DEV-01 to S4-DEV-08)

This slice plan maps all 32 Developer tasks from `pr_manifest.csv` to the exact files, functions, and components from the frozen `SNAPSHOT` repository (`https://github.com/seanarrul/erp_electroDB` at commit `0e55e1024681f2d8472d63681edfbf4caf34479e`).

---

## Sprint 1: Foundation, Authentication, User Management, and Dashboard

### 1. `[S1-DEV-01]` Project scaffold: app skeleton, env config, DB connection
- **Task ID:** `S1-DEV-01`
- **Branch:** `s1-dev-01-project-scaffold`
- **PR Title:** `[S1-DEV-01] Project scaffold: app skeleton, env config, DB connection`
- **Dependencies:** None (Base root commit on `sprint-replay`)
- **Files & Slices:**
  - **Configuration & Build:**
    - `.env.example`
    - `.eslintrc.json`
    - `.gitignore`
    - `next.config.ts`
    - `next-env.d.ts`
    - `package.json`
    - `package-lock.json`
    - `postcss.config.mjs`
    - `tailwind.config.ts`
    - `tsconfig.json`
    - `README.md`
  - **Scripts & Database Setup:**
    - `scripts/verify-db.mjs`
    - `hope.db`
    - `database/HopeDB_audit.sql`
    - `database/hope_erd_master_setup.sql`
    - `database/migrations/` (01 to 22 SQL migration scripts)
    - `database/seeds/00_hope_postgres_seed.sql`
    - `database/seeds/00_hope_sqlite_seed.sql`
  - **Documentation & Static Assets:**
    - `docs/DATA-CONNECTION.md`
    - `docs/DATA-MODEL-VERIFICATION.md`
    - `docs/DATA-MODEL.md`
    - `docs/HOPE_ERP_SYSTEM_GUIDELINES.md`
    - `public/avatars/default-avatar.jpg`
  - **Core Application Framework:**
    - `src/app/globals.css`
    - `src/app/layout.tsx`
    - `src/app/loading.tsx`
    - `src/app/error.tsx`
    - `src/app/not-found.tsx`
    - `src/app/landing/page.tsx`
    - `src/app/api/health/db/route.ts`
  - **Shared Libraries & Database Clients:**
    - `src/lib/types.ts`
    - `src/lib/utils.ts`
    - `src/lib/brand.ts`
    - `src/lib/hope-db.ts`
    - `src/lib/db-health.ts`
    - `src/lib/theme/theme.ts`
    - `src/lib/supabase/client.ts`
    - `src/lib/supabase/middleware.ts`
    - `src/lib/supabase/server.ts`
  - **Core UI Primitives & Ambient Components:**
    - `src/components/ambient/TopographicCanvas.tsx`
    - `src/components/brand/HopeLogo.tsx`
    - `src/components/landing/PublicLandingPage.tsx`
    - `src/components/ui/Button.tsx`
    - `src/components/ui/Badge.tsx`
    - `src/components/ui/Card.tsx`
    - `src/components/ui/Input.tsx`
    - `src/components/ui/Modal.tsx`
    - `src/components/ui/Skeleton.tsx`
    - `src/components/ui/Table.tsx`
    - `src/components/ui/ThemeToggle.tsx`
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 2. `[S1-DEV-02]` Register user form and API (new users start as pending)
- **Task ID:** `S1-DEV-02`
- **Branch:** `s1-dev-02-register-user-form-and-api`
- **PR Title:** `[S1-DEV-02] Register user form and API (new users start as pending)`
- **Dependencies:** `S1-DEV-01`
- **Files & Slices:**
  - `src/lib/auth-db.ts` (SQLite authentication database layer: `insertAccount`, `findAccountByEmail`, `findAccountByUsername`, password hashing, pending status handling, role initialization).
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 3. `[S1-DEV-03]` Login and logout with session handling; password hashing and set-password on first login; blocked users cannot sign in
- **Task ID:** `S1-DEV-03`
- **Branch:** `s1-dev-03-login-and-logout-with-session-handling`
- **PR Title:** `[S1-DEV-03] Login and logout with session handling; password hashing and set-password on first login; blocked users cannot sign in`
- **Dependencies:** `S1-DEV-02`
- **Files & Slices:**
  - `src/app/login/layout.tsx`: Login viewport layout.
  - `src/app/login/page.tsx`: Authentication screen (Sign In, Register, First-time Password Setup).
  - `src/app/actions/auth.ts`: Server actions for `loginAction`, `registerAction`, `logoutAction`, `setPasswordAction`, session cookie management (`sealSession`, `unsealSession`, `getCurrentUser`), blocked user guard.
  - `src/middleware.ts`: Route guard middleware for authenticated session validation.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 4. `[S1-DEV-04]` Authentication Security & Access Management
- **Status:** Password reset flow removed per requirements; user accounts and credentials are administered via User Management screen.

---

### 5. `[S1-DEV-05]` User Management screen: user list, Add User, Edit User, Block/Unblock; Admin manages Users only and Superadmin accounts are hidden
- **Task ID:** `S1-DEV-05`
- **Branch:** `s1-dev-05-user-management-screen`
- **PR Title:** `[S1-DEV-05] User Management screen: user list, Add User, Edit User, Block/Unblock; Admin manages Users only and Superadmin accounts are hidden`
- **Dependencies:** `S1-DEV-03`
- **Files & Slices:**
  - `src/app/(dashboard)/user-management/page.tsx`: User management route wrapper.
  - `src/app/(dashboard)/users/page.tsx`: User management directory page.
  - `src/components/users/UserManagementView.tsx`: User list table, search, role filtering, block/unblock actions, and superadmin isolation for standard admins.
  - `src/components/users/AddUserModal.tsx`: Admin dialog to register new accounts.
  - `src/components/users/EditUserModal.tsx`: Admin dialog to edit account details and roles.
  - `src/components/ui/RoleBadge.tsx`: Visual badge for user role levels (`superadmin`, `admin`, `user`).
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 6. `[S1-DEV-06]` Superadmin: approve pending users and designate admins; block removing or disabling the last remaining superadmin
- **Task ID:** `S1-DEV-06`
- **Branch:** `s1-dev-06-superadmin`
- **PR Title:** `[S1-DEV-06] Superadmin: approve pending users and designate admins; block removing or disabling the last remaining superadmin`
- **Dependencies:** `S1-DEV-05`
- **Files & Slices:**
  - `src/lib/permissions.ts`: Superadmin authorization functions (`approveUser`, `designateAdmin`, `protectLastSuperadmin`, `canAccess`).
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 7. `[S1-DEV-07]` Rights dialog: admin/superadmin assign per-action rights by module with module checkbox and All/None; log every rights change in audit_log
- **Task ID:** `S1-DEV-07`
- **Branch:** `s1-dev-07-rights-dialog`
- **PR Title:** `[S1-DEV-07] Rights dialog: admin/superadmin assign per-action rights by module (Customer, Product, Human Resources, Sales, Reports) with module checkbox and All/None; log every rights change in audit_log`
- **Dependencies:** `S1-DEV-05`, `S1-DEV-06`
- **Files & Slices:**
  - `src/components/users/RightsModal.tsx`: Granular 36-right permissions matrix dialog across Customer, Product, Human Resources, Sales, Reports; module bulk select / deselect, All/None toggle, and audit logging.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 8. `[S1-DEV-08]` Main page: sidebar and module tiles by role and rights, plus server-side permission check
- **Task ID:** `S1-DEV-08`
- **Branch:** `s1-dev-08-main-page`
- **PR Title:** `[S1-DEV-08] Main page: sidebar and module tiles by role and rights, plus server-side permission check`
- **Dependencies:** `S1-DEV-07`
- **Files & Slices:**
  - `src/app/(dashboard)/layout.tsx`: Main dashboard authenticated shell with navigation check.
  - `src/app/(dashboard)/page.tsx`: Home dashboard landing with permission-filtered module tiles.
  - `src/app/(dashboard)/dashboard/page.tsx`: Dashboard route alias.
  - `src/components/layout/Header.tsx`: Top header navigation, user details, theme switcher, logout.
  - `src/components/layout/Sidebar.tsx`: Sidebar navigation filtered by role and rights.
  - `src/components/layout/SidebarContext.tsx`: Sidebar state context.
  - `src/components/layout/GlobalSearchBar.tsx`: Global search modal dialog.
  - `src/components/home/HomeMainView.tsx`: Dashboard main view container.
  - `src/components/home/DashboardHeader.tsx`: Header banner and greetings.
  - `src/components/home/DashboardKpis.tsx`: Overview KPI metric cards.
  - `src/components/home/DbStatusPill.tsx`: SQLite and database connectivity indicator.
  - `src/components/home/ProjectTeamCard.tsx`: Project team credits.
  - `src/components/home/QuickActions.tsx`: Role-based quick actions panel.
  - `src/components/home/WelcomeStrip.tsx`: Welcome notification banner.
  - `src/app/actions/search.ts`: Server action for cross-module search.
  - `src/lib/data/home.ts`: Home KPIs and summary query helpers.
  - `src/lib/data/search.ts`: Search query routines.
  - `src/lib/labels.ts`: Navigation menu hierarchy and role permission mappings.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

## Sprint 2: Customer and Product Modules with Price History

### 9. `[S2-DEV-01]` Customer list with search and filter (permission-checked)
- **Task ID:** `S2-DEV-01`
- **Branch:** `s2-dev-01-customer-list-with-search-and-filter`
- **PR Title:** `[S2-DEV-01] Customer list with search and filter (permission-checked)`
- **Dependencies:** `S1-DEV-08`
- **Files & Slices:**
  - `src/app/(dashboard)/customers/page.tsx`: Customer directory route guarded by `canAccess(user.role, 'customers', ...)`.
  - `src/components/customers/CustomersMainView.tsx`: Customer table view with client/server search and payment terms filter.
  - `src/components/customers/CustomerDetailPanel.tsx`: Quick slide-over customer details drawer.
  - `src/lib/data/customers.ts`: `getCustomersPageData` function.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 10. `[S2-DEV-02]` Customer create and edit form
- **Task ID:** `S2-DEV-02`
- **Branch:** `s2-dev-02-customer-create-and-edit-form`
- **PR Title:** `[S2-DEV-02] Customer create and edit form`
- **Dependencies:** `S2-DEV-01`
- **Files & Slices:**
  - `src/components/customers/AddCustomerModal.tsx`: Modal form for adding a new customer with schema validation.
  - `src/components/customers/EditCustomerModal.tsx`: Modal form for updating customer address and payment terms.
  - `src/app/(dashboard)/customers/[custNo]/page.tsx`: Individual customer overview profile page.
  - `src/app/actions/customers.ts`: `addCustomerAction`, `updateCustomerAction`.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 11. `[S2-DEV-03]` Customer soft delete and restore
- **Task ID:** `S2-DEV-03`
- **Branch:** `s2-dev-03-customer-soft-delete-and-restore`
- **PR Title:** `[S2-DEV-03] Customer soft delete and restore`
- **Dependencies:** `S2-DEV-02`
- **Files & Slices:**
  - `src/app/actions/customers.ts`: `deleteCustomerAction`, `restoreCustomerAction` (including child-record integrity check against active sales).
  - Updates in `src/components/customers/CustomersMainView.tsx`: Soft delete and restore button triggers, status badges (`ACTIVE` vs `DELETED`).
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 12. `[S2-DEV-04]` Product list with search and filter
- **Task ID:** `S2-DEV-04`
- **Branch:** `s2-dev-04-product-list-with-search-and-filter`
- **PR Title:** `[S2-DEV-04] Product list with search and filter`
- **Dependencies:** `S1-DEV-08`
- **Files & Slices:**
  - `src/app/(dashboard)/products/page.tsx`: Product catalog page with permission guard.
  - `src/components/products/ProductsMainView.tsx`: Product inventory table with search, category filtering, and status filters.
  - `src/components/products/ProductDetailPanel.tsx`: Side panel preview for product attributes.
  - `src/lib/data/products.ts`: `getProductsPageData` data access function.
  - `src/lib/products.ts`: Helper utilities for SKU code generation, product family, and category classification.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 13. `[S2-DEV-05]` Product create and edit form
- **Task ID:** `S2-DEV-05`
- **Branch:** `s2-dev-05-product-create-and-edit-form`
- **PR Title:** `[S2-DEV-05] Product create and edit form`
- **Dependencies:** `S2-DEV-04`
- **Files & Slices:**
  - `src/components/products/AddProductModal.tsx`: Add product modal with unit validation and SKU generator.
  - `src/components/products/EditProductModal.tsx`: Edit product modal.
  - `src/app/(dashboard)/products/[prodCode]/page.tsx`: Product detail profile page.
  - `src/app/actions/products.ts`: `addProductAction`, `updateProductAction`.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 14. `[S2-DEV-06]` Product soft delete and restore
- **Task ID:** `S2-DEV-06`
- **Branch:** `s2-dev-06-product-soft-delete-and-restore`
- **PR Title:** `[S2-DEV-06] Product soft delete and restore`
- **Dependencies:** `S2-DEV-05`
- **Files & Slices:**
  - `src/app/actions/products.ts`: `deleteProductAction`, `restoreProductAction` (including child-record integrity check against sales details).
  - Updates in `src/components/products/ProductsMainView.tsx`: Soft delete/restore action triggers and status tags.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 15. `[S2-DEV-07]` Price history: add, edit and delete price with effective date
- **Task ID:** `S2-DEV-07`
- **Branch:** `s2-dev-07-price-history`
- **PR Title:** `[S2-DEV-07] Price history: add, edit and delete price with effective date`
- **Dependencies:** `S2-DEV-05`
- **Files & Slices:**
  - `src/components/products/PriceHistoryModal.tsx`: Modal displaying complete price history logs.
  - `src/components/products/NewPriceModal.tsx`: Modal to add new price with effective date.
  - `src/components/products/CorrectPriceModal.tsx`: Modal to correct existing price record.
  - `src/app/actions/products.ts`: `addPriceAction`, `updatePriceAction`, `deletePriceAction`, `restorePriceAction`, `correctPriceAction`.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 16. `[S2-DEV-08]` Current-price display on product page; per-action rights checks (Add/Edit/Delete) across both modules
- **Task ID:** `S2-DEV-08`
- **Branch:** `s2-dev-08-current-price-display-on-product-page`
- **PR Title:** `[S2-DEV-08] Current-price display on product page; per-action rights checks (Add/Edit/Delete) across both modules`
- **Dependencies:** `S2-DEV-03`, `S2-DEV-07`
- **Files & Slices:**
  - `src/components/products/ProductPriceTrend.tsx`: Interactive SVG / chart visualizing historical price trend.
  - Updates across `src/components/customers/CustomersMainView.tsx` and `src/components/products/ProductsMainView.tsx`: Enforcing granular rights (`canAccess` checks for Add Customer, Edit Customer, Delete Customer, Add Product, Edit Product, Delete Product, View Price History, Manage Prices).
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

## Sprint 3: Human Resources (Department, Job, Employee, Job History)

### 17. `[S3-DEV-01]` Department list and CRUD
- **Task ID:** `S3-DEV-01`
- **Branch:** `s3-dev-01-department-list-and-crud`
- **PR Title:** `[S3-DEV-01] Department list and CRUD`
- **Dependencies:** `S1-DEV-08`
- **Files & Slices:**
  - `src/components/employees/AddDepartmentModal.tsx`: Add department modal with code and description.
  - `src/components/employees/EditDepartmentModal.tsx`: Edit department modal.
  - `src/app/actions/employees.ts`: `addDepartmentAction`, `updateDepartmentAction`, `deleteDepartmentAction`, `restoreDepartmentAction`, `renameDepartmentAction`.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 18. `[S3-DEV-02]` Job list and CRUD
- **Task ID:** `S3-DEV-02`
- **Branch:** `s3-dev-02-job-list-and-crud`
- **PR Title:** `[S3-DEV-02] Job list and CRUD`
- **Dependencies:** `S3-DEV-01`
- **Files & Slices:**
  - `src/components/employees/AddJobModal.tsx`: Add job title modal.
  - `src/components/employees/EditJobModal.tsx`: Edit job title modal.
  - `src/components/employees/ManageJobsDeptsModal.tsx`: Unified administrative dialog for managing job codes and departments.
  - `src/app/actions/employees.ts`: `addJobAction`, `updateJobAction`, `deleteJobAction`, `restoreJobAction`, `renameJobAction`.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 19. `[S3-DEV-03]` Employee list with search and filter
- **Task ID:** `S3-DEV-03`
- **Branch:** `s3-dev-03-employee-list-with-search-and-filter`
- **PR Title:** `[S3-DEV-03] Employee list with search and filter`
- **Dependencies:** `S3-DEV-02`
- **Files & Slices:**
  - `src/app/(dashboard)/employees/page.tsx`: Employees roster page with permission check.
  - `src/app/(dashboard)/human-resources/page.tsx`: Human Resources route redirect/alias.
  - `src/components/employees/EmployeesListView.tsx`: Employee table with search, department filtering, and active/separated status toggles.
  - `src/lib/data/employees.ts`: `getEmployeesPageData` function.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 20. `[S3-DEV-04]` Employee create and edit form
- **Task ID:** `S3-DEV-04`
- **Branch:** `s3-dev-04-employee-create-and-edit-form`
- **PR Title:** `[S3-DEV-04] Employee create and edit form`
- **Dependencies:** `S3-DEV-03`
- **Files & Slices:**
  - `src/components/employees/AddEmployeeModal.tsx`: Employee onboarding modal with department and job dropdowns.
  - `src/components/employees/EditEmployeeModal.tsx`: Modal for modifying employee details.
  - `src/app/actions/employees.ts`: `addEmployeeAction`, `updateEmployeeAction`.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 21. `[S3-DEV-05]` Employee soft delete/restore and separation date
- **Task ID:** `S3-DEV-05`
- **Branch:** `s3-dev-05-employee-soft-delete-restore-and-separation`
- **PR Title:** `[S3-DEV-05] Employee soft delete/restore and separation date`
- **Dependencies:** `S3-DEV-04`
- **Files & Slices:**
  - `src/components/employees/SeparateEmployeeModal.tsx`: Separation modal capturing separation date and status.
  - `src/app/actions/employees.ts`: `deleteEmployeeAction`, `restoreEmployeeAction`, `separateEmployeeAction`.
  - Updates in `src/components/employees/EmployeesListView.tsx`: Separation and delete/restore actions.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 22. `[S3-DEV-06]` Job history: add, edit and delete promotion or transfer (effective date, salary)
- **Task ID:** `S3-DEV-06`
- **Branch:** `s3-dev-06-job-history`
- **PR Title:** `[S3-DEV-06] Job history: add, edit and delete promotion or transfer (effective date, salary)`
- **Dependencies:** `S3-DEV-04`
- **Files & Slices:**
  - `src/components/employees/AddJobHistoryModal.tsx`: Promotion or transfer dialog recording new job, effective date, and salary.
  - `src/components/employees/EditJobHistoryModal.tsx`: Dialog to update job history record.
  - `src/components/employees/JobHistoryModal.tsx`: Full employee career and promotion history dialog.
  - `src/components/employees/NewJobRecordModal.tsx`: Quick record modal.
  - `src/app/actions/employees.ts`: `addJobHistoryAction`, `updateJobHistoryAction`, `deleteJobHistoryAction`, `restoreJobHistoryAction`, `addJobRecordAction`.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 23. `[S3-DEV-07]` Employee profile with job timeline
- **Task ID:** `S3-DEV-07`
- **Branch:** `s3-dev-07-employee-profile-with-job-timeline`
- **PR Title:** `[S3-DEV-07] Employee profile with job timeline`
- **Dependencies:** `S3-DEV-06`
- **Files & Slices:**
  - `src/app/(dashboard)/employees/[empNo]/page.tsx`: Employee profile route.
  - `src/components/employees/EmployeeDetailView.tsx`: Comprehensive profile view with chronological visual timeline of job assignments, department placements, and career progression.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 24. `[S3-DEV-08]` Restrict job history and salary visibility with the View Job History right
- **Task ID:** `S3-DEV-08`
- **Branch:** `s3-dev-08-restrict-job-history-and-salary-visibility`
- **PR Title:** `[S3-DEV-08] Restrict job history and salary visibility with the View Job History right`
- **Dependencies:** `S3-DEV-07`
- **Files & Slices:**
  - `src/components/employees/HumanResourcesAuditModal.tsx`: HR audit log modal for superadmins.
  - Granular rights check in `src/components/employees/EmployeesListView.tsx`, `src/components/employees/EmployeeDetailView.tsx`, and `src/components/employees/JobHistoryModal.tsx`: Masking or hiding salary and job history details if user lacks the `View Job History` right.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

## Sprint 4: Sales, Payments, Reports, and Audit Trail

### 25. `[S4-DEV-01]` Sales list with search and New Sale header (auto-numbered transaction, customer and salesperson drop-downs)
- **Task ID:** `S4-DEV-01`
- **Branch:** `s4-dev-01-sales-list-with-search-and-new`
- **PR Title:** `[S4-DEV-01] Sales list with search and New Sale header (auto-numbered transaction, customer and salesperson drop-downs)`
- **Dependencies:** `S1-DEV-08`, `S2-DEV-01`, `S3-DEV-03`
- **Files & Slices:**
  - `src/app/(dashboard)/sales/page.tsx`: Sales register page with permission check.
  - `src/app/(dashboard)/sales/new/page.tsx`: Route redirect helper for new sale.
  - `src/components/sales/SalesMainView.tsx`: Main sales ledger table, filtering, payment status indicators.
  - `src/components/sales/SalesSearchInput.tsx`: Real-time transaction search with debounce.
  - `src/components/sales/NewSaleModal.tsx`: Modal for creating sales headers with auto-generated transaction number, customer dropdown, and salesperson dropdown.
  - `src/lib/data/sales.ts`: `getSalesPageData`, `getNextTransactionNumberPreview`.
  - `src/app/actions/sales.ts`: `createSaleHeaderAction`, `createSaleAction`.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 26. `[S4-DEV-02]` Sale details: add, edit and delete line items (product, quantity); auto-fill unit price from price history as of sales date
- **Task ID:** `S4-DEV-02`
- **Branch:** `s4-dev-02-sale-details`
- **PR Title:** `[S4-DEV-02] Sale details: add, edit and delete line items (product, quantity); auto-fill unit price from price history as of sales date`
- **Dependencies:** `S4-DEV-01`, `S2-DEV-07`
- **Files & Slices:**
  - `src/components/sales/SaleDetailsModal.tsx`: Sales invoice line items modal (master-detail view).
  - `src/components/sales/AddLineItemModal.tsx`: Add line item dialog with product picker and auto-lookup of unit price effective on transaction date.
  - `src/components/sales/EditLineItemModal.tsx`: Line item quantity update dialog.
  - `src/app/actions/sales.ts`: `addLineItemAction`, `updateLineItemAction`, `deleteLineItemAction`, `restoreLineItemAction`, `getPriceForProductDateAction`.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 27. `[S4-DEV-03]` Record payment against a transaction
- **Task ID:** `S4-DEV-03`
- **Branch:** `s4-dev-03-record-payment-against-a-transaction`
- **PR Title:** `[S4-DEV-03] Record payment against a transaction`
- **Dependencies:** `S4-DEV-01`
- **Files & Slices:**
  - `src/components/payments/RecordPaymentDialog.tsx`: Dialog to enter Official Receipt (OR) details for a transaction.
  - `src/components/payments/RecordPaymentModal.tsx`: Payment recording modal with validation against remaining balance.
  - `src/components/customers/RecordCustomerPaymentModal.tsx`: Payment entry modal triggered from customer profile.
  - `src/components/sales/SaleRecordPaymentButton.tsx`: Direct payment action button from sales view.
  - `src/app/actions/payments.ts`: `recordPaymentAction`, `getPaymentFormDataAction`.
  - `src/app/actions/customers.ts`: `recordCustomerPaymentAction`.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 28. `[S4-DEV-04]` Reports module, part 1: Product Master List, Active Employees, All Employees, Employee Job History (per-report rights, Print / Save as PDF)
- **Task ID:** `S4-DEV-04`
- **Branch:** `s4-dev-04-reports-module`
- **PR Title:** `[S4-DEV-04] Reports module, part 1: Product Master List, Active Employees, All Employees, Employee Job History (per-report rights, Print / Save as PDF)`
- **Dependencies:** `S1-DEV-08`, `S2-DEV-04`, `S3-DEV-03`, `S3-DEV-06`
- **Files & Slices:**
  - `src/app/(dashboard)/reports/page.tsx`: Reports portal route with module permission check.
  - `src/components/reports/ReportsMainView.tsx` (Part 1 tabs):
    - Product Master List report tab
    - Active Employees report tab
    - All Employees report tab
    - Employee Job History report tab
  - `src/components/sales/PrintButton.tsx`: Print and PDF export trigger.
  - `src/lib/data/reports.ts`: `getProductMasterList`, `getActiveEmployees`, `getAllEmployeesReport`, `getEmployeeJobHistoryReport`, `getEmployeesListForDropdown`.
  - `src/app/actions/reports.ts`: `fetchEmployeeJobHistoryAction`.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 29. `[S4-DEV-05]` Reports module, part 2: Top Customers, Top Products, Top Sales (date range, Top N, per-report rights, Print / Save as PDF)
- **Task ID:** `S4-DEV-05`
- **Branch:** `s4-dev-05-reports-module`
- **PR Title:** `[S4-DEV-05] Reports module, part 2: Top Customers, Top Products, Top Sales (date range, Top N, per-report rights, Print / Save as PDF)`
- **Dependencies:** `S4-DEV-04`
- **Files & Slices:**
  - `src/components/reports/ReportsMainView.tsx` (Part 2 tabs):
    - Top Customers by sales volume with date range and Top N controls
    - Top Products by sales volume with date range and Top N controls
    - Top Sales transactions with date range and Top N controls
  - `src/lib/data/reports.ts`: `getTopCustomers`, `getTopProducts`, `getTopSales`.
  - `src/app/actions/reports.ts`: `fetchTopCustomersAction`, `fetchTopProductsAction`, `fetchTopSalesAction`.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 30. `[S4-DEV-06]` Balance view per transaction and customer
- **Task ID:** `S4-DEV-06`
- **Branch:** `s4-dev-06-balance-view-per-transaction-and-customer`
- **PR Title:** `[S4-DEV-06] Balance view per transaction and customer`
- **Dependencies:** `S4-DEV-03`
- **Files & Slices:**
  - `src/app/(dashboard)/payments/page.tsx`: Payment ledger page showing invoice balance breakdown.
  - `src/app/(dashboard)/payments/[orNo]/page.tsx`: Individual payment transaction detail route.
  - `src/app/(dashboard)/receipts/[orNo]/page.tsx`: Official receipt printable document page.
  - `src/components/payments/PaymentsMainView.tsx`: Outstanding balance ledger per transaction and customer balance rollups.
  - `src/lib/data/payments.ts`: `getPaymentsLedger`, `getSalesForPayment`, `getNextORNumberPreview`, `getOfficialReceipt`.
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 31. `[S4-DEV-07]` Sales soft delete and restore with status and stamp; Sale and Sale Detail rights enforced
- **Task ID:** `S4-DEV-07`
- **Branch:** `s4-dev-07-sales-soft-delete-and-restore-with`
- **PR Title:** `[S4-DEV-07] Sales soft delete and restore with status and stamp; Sale and Sale Detail rights enforced`
- **Dependencies:** `S4-DEV-02`
- **Files & Slices:**
  - `src/app/(dashboard)/sales/[transNo]/page.tsx`: Detailed sales invoice view displaying transaction audit stamps (`STATUS: ACTIVE/CANCELLED`, Created By, Edited By).
  - `src/components/sales/EditSaleModal.tsx`: Edit sales header transaction metadata modal.
  - `src/app/actions/sales.ts`: `deleteSaleAction`, `restoreSaleAction`, `updateSaleHeaderAction` (enforcing soft-delete timestamp and user audit stamp).
  - Updates in `src/components/sales/SalesMainView.tsx`: Delete and restore triggers with per-action permission checks (`Delete Sale`, `Restore Sale`).
- **Code Match Status:** Present and complete in `SNAPSHOT`.

---

### 32. `[S4-DEV-08]` Audit log viewer for superadmin
- **Task ID:** `S4-DEV-08`
- **Branch:** `s4-dev-08-audit-log-viewer-for-superadmin`
- **PR Title:** `[S4-DEV-08] Audit log viewer for superadmin`
- **Dependencies:** `S1-DEV-06`, `S4-DEV-07`
- **Files & Slices:**
  - `src/components/sales/SalesAuditModal.tsx`: Superadmin sales audit trail modal showing 3NF relational change history.
  - `src/components/employees/HumanResourcesAuditModal.tsx`: Superadmin HR audit trail modal.
  - Audit viewer button triggers integrated into `src/components/sales/SalesMainView.tsx` and `src/components/employees/EmployeesListView.tsx`, restricted exclusively to `superadmin` role.
- **Code Match Status:** Present and complete in `SNAPSHOT`.
