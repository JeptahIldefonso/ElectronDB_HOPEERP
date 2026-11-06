-- ========================================================================
-- HOPE Group4: REMOVE WARRANTY OBJECTS AND VIEWS
-- File: database/26_remove_warranty_objects.sql
-- Satisfies: Complete removal of warranty data, rules, views, and functions
-- Note: Safe to re-run. Do NOT execute automatically; run in Supabase SQL editor if needed.
-- ========================================================================

-- 1. Drop warranty-related views if any exist
DROP VIEW IF EXISTS v_orders_and_warranties CASCADE;
DROP VIEW IF EXISTS v_customer_warranties CASCADE;
DROP VIEW IF EXISTS v_warranty_tracking CASCADE;
DROP VIEW IF EXISTS v_product_warranties CASCADE;

-- 2. Drop any warranty helper functions if any exist
DROP FUNCTION IF EXISTS calculate_warranty_status CASCADE;
DROP FUNCTION IF EXISTS get_warranty_expiry CASCADE;
DROP FUNCTION IF EXISTS check_warranty_validity CASCADE;

-- 3. Drop legacy non-ERD extension tables if any exist
DROP TABLE IF EXISTS "SERVICETICKET" CASCADE;
DROP TABLE IF EXISTS "serviceticket" CASCADE;
