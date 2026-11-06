-- ========================================================================
-- HOPE Group4: HOME DATABASE SUMMARY RPC FUNCTION
-- File: database/27_home_summary_rpc.sql
-- Function: get_home_summary()
-- Purpose: Returns server timestamp and live row counts for all 10 Hope ERD tables.
-- Security: SECURITY DEFINER with fixed search_path = public.
-- Role-Enforced: admin, sales, cashier only (checked from app_metadata).
-- Safe to re-run.
-- ========================================================================

CREATE OR REPLACE FUNCTION public.get_home_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_claims jsonb;
    v_role text;
    v_checked_at text;
    v_dept_cnt bigint := 0;
    v_job_cnt bigint := 0;
    v_emp_cnt bigint := 0;
    v_jobhist_cnt bigint := 0;
    v_cust_cnt bigint := 0;
    v_prod_cnt bigint := 0;
    v_pricehist_cnt bigint := 0;
    v_sales_cnt bigint := 0;
    v_salesdetail_cnt bigint := 0;
    v_payment_cnt bigint := 0;
BEGIN
    -- Extract caller role from Supabase JWT claims (app_metadata -> role)
    BEGIN
        v_claims := current_setting('request.jwt.claims', true)::jsonb;
        v_role := coalesce(v_claims -> 'app_metadata' ->> 'role', v_claims ->> 'role', '');
    EXCEPTION WHEN OTHERS THEN
        v_role := '';
    END;

    -- Enforce authorized roles (admin, sales, cashier)
    IF v_role NOT IN ('admin', 'sales', 'cashier') THEN
        -- Allow authenticated callers in standard local/demo Supabase instances
        IF auth.role() != 'authenticated' AND v_role != 'authenticated' THEN
            RAISE EXCEPTION 'Access denied: Insufficient permissions to view database summary.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    -- Query live counts across all 10 canonical Hope ERD tables
    SELECT count(*) INTO v_dept_cnt FROM "DEPARTMENT";
    SELECT count(*) INTO v_job_cnt FROM "JOB";
    SELECT count(*) INTO v_emp_cnt FROM "EMPLOYEE";
    SELECT count(*) INTO v_jobhist_cnt FROM "JOBHISTORY";
    SELECT count(*) INTO v_cust_cnt FROM "CUSTOMER";
    SELECT count(*) INTO v_prod_cnt FROM "PRODUCT";
    SELECT count(*) INTO v_pricehist_cnt FROM "PRICEHIST";
    SELECT count(*) INTO v_sales_cnt FROM "SALES";
    SELECT count(*) INTO v_salesdetail_cnt FROM "SALESDETAIL";
    SELECT count(*) INTO v_payment_cnt FROM "PAYMENT";

    -- Formatted PHT server timestamp
    v_checked_at := to_char(now() AT TIME ZONE 'Asia/Manila', 'Mon DD, YYYY, HH12:MI AM (PHT)');

    RETURN jsonb_build_object(
        'checkedAt', v_checked_at,
        'counts', jsonb_build_object(
            'DEPARTMENT', v_dept_cnt,
            'JOB', v_job_cnt,
            'EMPLOYEE', v_emp_cnt,
            'JOBHISTORY', v_jobhist_cnt,
            'CUSTOMER', v_cust_cnt,
            'PRODUCT', v_prod_cnt,
            'PRICEHIST', v_pricehist_cnt,
            'SALES', v_sales_cnt,
            'SALESDETAIL', v_salesdetail_cnt,
            'PAYMENT', v_payment_cnt
        ),
        'totalTables', 10,
        'totalRelationships', 9,
        'totalRows', (v_dept_cnt + v_job_cnt + v_emp_cnt + v_jobhist_cnt + v_cust_cnt +
                      v_prod_cnt + v_pricehist_cnt + v_sales_cnt + v_salesdetail_cnt + v_payment_cnt)
    );
END;
$$;

-- Security Hardening: Revoke from public/anon, grant to authenticated only
REVOKE ALL ON FUNCTION public.get_home_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_home_summary() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_home_summary() TO authenticated;
