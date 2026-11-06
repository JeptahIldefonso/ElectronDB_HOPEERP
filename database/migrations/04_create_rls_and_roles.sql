-- ========================================================================
-- HOPE Group4: ROW LEVEL SECURITY & ROLE AUTHORIZATION
-- Enforces: Role-based permissions via Supabase Auth app_metadata
-- Roles: admin, sales, cashier
-- ========================================================================

-- Enable RLS on all 10 Hope ERD tables
ALTER TABLE DEPARTMENT ENABLE ROW LEVEL SECURITY;
ALTER TABLE JOB ENABLE ROW LEVEL SECURITY;
ALTER TABLE EMPLOYEE ENABLE ROW LEVEL SECURITY;
ALTER TABLE JOBHISTORY ENABLE ROW LEVEL SECURITY;
ALTER TABLE CUSTOMER ENABLE ROW LEVEL SECURITY;
ALTER TABLE PRODUCT ENABLE ROW LEVEL SECURITY;
ALTER TABLE PRICEHIST ENABLE ROW LEVEL SECURITY;
ALTER TABLE SALES ENABLE ROW LEVEL SECURITY;
ALTER TABLE SALESDETAIL ENABLE ROW LEVEL SECURITY;
ALTER TABLE PAYMENT ENABLE ROW LEVEL SECURITY;

-- Revoke all permissions from anon (public unauthenticated users)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Policy 1: Authenticated users can read lookup and catalog data
CREATE POLICY "authenticated_read_department" ON DEPARTMENT FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_job" ON JOB FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_employee" ON EMPLOYEE FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_customer" ON CUSTOMER FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_product" ON PRODUCT FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_pricehist" ON PRICEHIST FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_sales" ON SALES FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_salesdetail" ON SALESDETAIL FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_payment" ON PAYMENT FOR SELECT TO authenticated USING (true);

-- Policy 2: Salaries in JOBHISTORY visible ONLY to Admin
CREATE POLICY "admin_only_jobhistory" ON JOBHISTORY 
FOR SELECT TO authenticated 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Policy 3: New Sales can be created by Admin or Sales roles
CREATE POLICY "sales_and_admin_insert_sales" ON SALES 
FOR INSERT TO authenticated 
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'sales'));

CREATE POLICY "sales_and_admin_insert_salesdetail" ON SALESDETAIL 
FOR INSERT TO authenticated 
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'sales'));

-- Policy 4: Payments can be recorded by Admin or Cashier roles
CREATE POLICY "cashier_and_admin_insert_payment" ON PAYMENT 
FOR INSERT TO authenticated 
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'cashier'));

-- Policy 5: Price changes & Employee master updates restricted to Admin
CREATE POLICY "admin_only_pricehist_insert" ON PRICEHIST 
FOR INSERT TO authenticated 
WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin_only_employee_insert" ON EMPLOYEE 
FOR ALL TO authenticated 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "admin_only_customer_write" ON CUSTOMER 
FOR ALL TO authenticated 
USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'sales'));
