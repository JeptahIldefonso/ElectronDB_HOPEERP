-- ========================================================================
-- HOPE Group4: DATABASE MIGRATION 06
-- Clean up Track Order functions and policies, and revoke all privileges
-- on every table and view from the anon role.
--
-- DO NOT RUN AUTOMATICALLY: Manual migration script for PostgreSQL / Supabase
-- Only /login stays public at the application layer.
-- ========================================================================

-- 1. Drop any policies that allowed anonymous or public order tracking
DROP POLICY IF EXISTS "anon_read_track_order" ON SALES;
DROP POLICY IF EXISTS "anon_read_track_salesdetail" ON SALESDETAIL;
DROP POLICY IF EXISTS "anon_read_track_payment" ON PAYMENT;
DROP POLICY IF EXISTS "public_order_tracking_policy" ON SALES;

-- 2. Drop any RPC functions created specifically for public order verification
DROP FUNCTION IF EXISTS verify_order(INT, INT);
DROP FUNCTION IF EXISTS track_order(INT, INT);
DROP FUNCTION IF EXISTS get_order_tracking_details(INT, INT);

-- 3. Revoke all privileges on every table and view from the anon role
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public FROM anon;
REVOKE USAGE ON SCHEMA public FROM anon;

-- Ensure authenticated role maintains its strict RLS access
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
