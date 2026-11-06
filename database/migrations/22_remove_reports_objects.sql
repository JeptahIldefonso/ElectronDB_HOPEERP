-- ========================================================================
-- HOPE Group4: REMOVE REPORTS & ANALYTICS DATABASE OBJECTS
-- File: database/28_remove_reports_objects.sql
-- 
-- Drops legacy analytical views used exclusively by the decommissioned
-- Reports module.
--
-- PRESERVED CANONICAL OBJECTS (CONFIRMED BY CODE SEARCH):
-- 1. v_sales_summary        (Used by /sales, /customers, /)
-- 2. v_sale_lines           (Used by /sales, /sales/[transNo])
-- 3. v_customer_overview    (Used by /customers)
-- 4. v_customer_payments    (Used by /customers, /receipts)
-- 5. v_product_overview     (Used by /products)
-- 6. v_price_history        (Used by /products)
-- 7. v_employee_directory   (Used by /employees)
-- 8. v_employee_assignments (Used by /employees)
-- 9. v_employee_current_status (Used by /employees)
-- 10. v_product_sales_analytics (Used by search.ts)
-- 11. get_home_summary()    (Used by /)
-- 12. create_sale()         (Used by /sales/new)
-- 13. record_payment()      (Used by shared payment dialog)
--
-- Strict 10-table schema: ZERO tables or columns touched.
-- DO NOT RUN AUTOMATICALLY (Reference migration file).
-- ========================================================================

-- Drop report-only departmental sales performance aggregation view
DROP VIEW IF EXISTS v_department_sales_performance CASCADE;

-- Drop legacy intermediate priced lines view (superseded by canonical v_sale_lines)
DROP VIEW IF EXISTS v_sales_details_priced CASCADE;

-- Drop legacy intermediate sales with department view (superseded by canonical v_sales_summary)
DROP VIEW IF EXISTS v_sales_with_dept CASCADE;
