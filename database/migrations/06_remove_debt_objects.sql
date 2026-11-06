-- ========================================================================
-- HOPE Group4: DATABASE MIGRATION 07 (07_remove_debt_objects.sql)
-- Safe to re-run. Eliminates debt, balances, due dates, overdue and aging.
-- Recreates analytical views with security_invoker = true.
-- Enforces row-locked payment total constraint in Postgres RPC function.
-- Revokes public/anon access on all tables, views, and functions.
--
-- DO NOT RUN AUTOMATICALLY: Manual migration script for PostgreSQL / Supabase
-- ========================================================================

-- 1. Drop old debt, aging, and balance views & functions
DROP VIEW IF EXISTS v_customer_aging CASCADE;
DROP VIEW IF EXISTS v_receivables_aging CASCADE;
DROP VIEW IF EXISTS v_customer_receivables CASCADE;

-- 2. Recreate v_sales_summary WITHOUT balance, paymentStatus, dueDate, termDays, or overdue
-- Explicitly declared WITH (security_invoker = true) to strictly adhere to caller RLS
CREATE OR REPLACE VIEW v_sales_summary 
WITH (security_invoker = true) AS
SELECT 
    s.transNo,
    s.salesDate,
    c.custNo,
    c.custName,
    c.address AS custAddress,
    vd.empNo,
    vd.empName,
    vd.deptCode,
    vd.deptName,
    vd.jobDesc,
    COALESCE(COUNT(sd.prodCode), 0)::INT AS itemCount,
    COALESCE(SUM(sd.quantity * ph.unitPrice), 0.00)::NUMERIC(12,2) AS totalAmount
FROM SALES s
JOIN CUSTOMER c ON c.custNo = s.custNo
JOIN v_dept_attribution vd ON vd.transNo = s.transNo
LEFT JOIN SALESDETAIL sd ON sd.transNo = s.transNo
LEFT JOIN LATERAL (
    SELECT unitPrice 
    FROM PRICEHIST 
    WHERE prodCode = sd.prodCode AND effDate <= s.salesDate 
    ORDER BY effDate DESC 
    LIMIT 1
) ph ON true
GROUP BY s.transNo, s.salesDate, c.custNo, c.custName, c.address, vd.empNo, vd.empName, vd.deptCode, vd.deptName, vd.jobDesc;

-- 3. Recreate v_payments_ledger WITH (security_invoker = true)
CREATE OR REPLACE VIEW v_payments_ledger 
WITH (security_invoker = true) AS
SELECT 
    p.ORNo AS orNo,
    p.payDate,
    p.amount,
    p.transNo,
    s.salesDate,
    c.custNo,
    c.custName
FROM PAYMENT p
JOIN SALES s ON s.transNo = p.transNo
JOIN CUSTOMER c ON c.custNo = s.custNo;

-- 4. Revoke all privileges on all tables, views, and sequences from anon
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

-- Ensure authenticated role can read the views and underlying tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 5. Define atomic, row-locked payment recording RPC function
CREATE OR REPLACE FUNCTION record_payment_receipt(
    p_trans_no INT,
    p_amount NUMERIC,
    p_pay_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
    v_sales_date DATE;
    v_sale_total NUMERIC(12,2);
    v_existing_payments NUMERIC(12,2);
    v_latest_pay_date DATE;
    v_next_or INT;
    v_today DATE;
BEGIN
    -- A. Role verification: only cashier or admin can record payments
    v_role := COALESCE(
        (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role'),
        ''
    );

    IF v_role NOT IN ('admin', 'cashier') THEN
        RAISE EXCEPTION 'Access denied: Only cashier or admin can record payments.';
    END IF;

    -- B. Input validation
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero.';
    END IF;

    IF p_pay_date IS NULL THEN
        RAISE EXCEPTION 'Valid payment date is required.';
    END IF;

    -- C. Advisory lock to prevent simultaneous concurrent race conditions
    PERFORM pg_advisory_xact_lock(hashtext('hope_sale_payment_' || p_trans_no::TEXT));

    -- D. Row-level lock on the sale record
    SELECT s.salesDate
    INTO v_sales_date
    FROM SALES s
    WHERE s.transNo = p_trans_no
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction #% does not exist.', p_trans_no;
    END IF;

    -- E. Strict date ordering validations
    v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE;

    IF p_pay_date < v_sales_date THEN
        RAISE EXCEPTION 'Payment date cannot be before the sale date (%).', to_char(v_sales_date, 'YYYY-MM-DD');
    END IF;

    IF p_pay_date > v_today THEN
        RAISE EXCEPTION 'Payment date cannot be in the future.';
    END IF;

    SELECT MAX(payDate)
    INTO v_latest_pay_date
    FROM PAYMENT
    WHERE transNo = p_trans_no;

    IF v_latest_pay_date IS NOT NULL AND p_pay_date < v_latest_pay_date THEN
        RAISE EXCEPTION 'Payment date cannot be before the latest receipt date (%).', to_char(v_latest_pay_date, 'YYYY-MM-DD');
    END IF;

    -- F. Compute point-in-time sale total
    SELECT COALESCE(SUM(sd.quantity * ph.unitPrice), 0.00)
    INTO v_sale_total
    FROM SALESDETAIL sd
    CROSS JOIN LATERAL (
        SELECT unitPrice 
        FROM PRICEHIST 
        WHERE prodCode = sd.prodCode AND effDate <= v_sales_date 
        ORDER BY effDate DESC 
        LIMIT 1
    ) ph
    WHERE sd.transNo = p_trans_no;

    -- G. Compute existing payments
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_existing_payments
    FROM PAYMENT
    WHERE transNo = p_trans_no;

    -- H. Invisible payment limit validation
    IF (v_existing_payments + p_amount > v_sale_total) THEN
        RAISE EXCEPTION 'Payments for this sale would exceed its total of ₱%.', to_char(v_sale_total, 'FM999,999,999.00');
    END IF;

    -- I. Determine next OR number in sequence inside lock
    SELECT COALESCE(MAX(ORNo), 9000) + 1
    INTO v_next_or
    FROM PAYMENT;

    -- J. Insert payment receipt
    INSERT INTO PAYMENT (ORNo, payDate, amount, transNo)
    VALUES (v_next_or, p_pay_date, p_amount, p_trans_no);

    RETURN jsonb_build_object(
        'success', true,
        'orNo', v_next_or,
        'amount', p_amount,
        'payDate', p_pay_date,
        'transNo', p_trans_no
    );
END;
$$;

-- 6. Function permissions: revoke from public/anon, grant strictly to authenticated
REVOKE ALL ON FUNCTION record_payment_receipt(INT, NUMERIC, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION record_payment_receipt(INT, NUMERIC, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION record_payment_receipt(INT, NUMERIC, DATE) TO authenticated;
