-- ========================================================================
-- HOPE Group4: CUSTOMER AND PAYMENT RPC FUNCTIONS
-- File: database/19_customer_functions.sql
-- Satisfies Rules: R-01 to R-11, Role checks (Section 5, Section 10.2)
-- Note: Safe to re-run. Do NOT execute automatically; run in Supabase SQL editor.
-- ========================================================================

-- Helper: Check user role from JWT claims
CREATE OR REPLACE FUNCTION fn_check_customer_user_role(required_roles text[])
RETURNS boolean AS $$
DECLARE
    user_role text;
BEGIN
    user_role := COALESCE(
        current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role',
        current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role',
        ''
    );
    
    -- If no JWT context (e.g. direct service role or local dev), permit execution
    IF user_role = '' OR user_role IS NULL THEN
        RETURN true;
    END IF;
    
    RETURN user_role = ANY(required_roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. create_customer (Admin & Sales only)
CREATE OR REPLACE FUNCTION create_customer(
    p_cust_no int,
    p_cust_name text,
    p_address text,
    p_pay_terms text
)
RETURNS int AS $$
DECLARE
    v_clean_name text;
    v_clean_addr text;
    v_clean_terms text;
BEGIN
    -- Role verification
    IF NOT fn_check_customer_user_role(ARRAY['admin', 'sales']) THEN
        RAISE EXCEPTION 'Unauthorized: Only Admin and Sales staff can create customers.';
    END IF;

    -- Clean inputs
    v_clean_name := TRIM(p_cust_name);
    v_clean_addr := TRIM(p_address);
    v_clean_terms := UPPER(TRIM(p_pay_terms));

    -- R-02: custNo required and unique
    IF p_cust_no IS NULL OR p_cust_no <= 0 THEN
        RAISE EXCEPTION 'Customer number (custNo) must be a positive integer.';
    END IF;
    IF EXISTS (SELECT 1 FROM "CUSTOMER" WHERE custNo = p_cust_no) THEN
        RAISE EXCEPTION 'Customer number % is already in use (R-02).', p_cust_no;
    END IF;

    -- R-03: custName and address required
    IF v_clean_name = '' OR v_clean_name IS NULL THEN
        RAISE EXCEPTION 'Customer name is required (R-03).';
    END IF;
    IF v_clean_addr = '' OR v_clean_addr IS NULL THEN
        RAISE EXCEPTION 'Customer address is required (R-03).';
    END IF;

    -- R-04: payTerms must be COD, 30D, or 45D
    IF v_clean_terms NOT IN ('COD', '30D', '45D') THEN
        RAISE EXCEPTION 'Choose an existing payment term (COD, 30D or 45D) (R-04).';
    END IF;

    -- Insert record
    INSERT INTO "CUSTOMER" (custNo, custName, address, payTerms)
    VALUES (p_cust_no, v_clean_name, v_clean_addr, v_clean_terms);

    RETURN p_cust_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. update_customer (Admin & Sales only)
CREATE OR REPLACE FUNCTION update_customer(
    p_cust_no int,
    p_cust_name text,
    p_address text,
    p_pay_terms text
)
RETURNS boolean AS $$
DECLARE
    v_clean_name text;
    v_clean_addr text;
    v_clean_terms text;
BEGIN
    -- Role verification
    IF NOT fn_check_customer_user_role(ARRAY['admin', 'sales']) THEN
        RAISE EXCEPTION 'Unauthorized: Only Admin and Sales staff can edit customers.';
    END IF;

    -- Check existence
    IF NOT EXISTS (SELECT 1 FROM "CUSTOMER" WHERE custNo = p_cust_no) THEN
        RAISE EXCEPTION 'Customer #% was not found.', p_cust_no;
    END IF;

    -- Clean inputs
    v_clean_name := TRIM(p_cust_name);
    v_clean_addr := TRIM(p_address);
    v_clean_terms := UPPER(TRIM(p_pay_terms));

    -- R-03: custName and address required
    IF v_clean_name = '' OR v_clean_name IS NULL THEN
        RAISE EXCEPTION 'Customer name is required (R-03).';
    END IF;
    IF v_clean_addr = '' OR v_clean_addr IS NULL THEN
        RAISE EXCEPTION 'Customer address is required (R-03).';
    END IF;

    -- R-04: payTerms validation
    IF v_clean_terms NOT IN ('COD', '30D', '45D') THEN
        RAISE EXCEPTION 'Choose an existing payment term (COD, 30D or 45D) (R-04).';
    END IF;

    -- Update fields (custNo is locked by trigger)
    UPDATE "CUSTOMER"
    SET custName = v_clean_name,
        address = v_clean_addr,
        payTerms = v_clean_terms
    WHERE custNo = p_cust_no;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. record_payment (Admin & Cashier only)
CREATE OR REPLACE FUNCTION record_payment(
    p_or_no int,
    p_pay_date date,
    p_amount numeric,
    p_trans_no int,
    p_cust_no int
)
RETURNS int AS $$
DECLARE
    v_sale_date date;
    v_sale_cust_no int;
    v_today_manila date;
BEGIN
    -- Role verification
    IF NOT fn_check_customer_user_role(ARRAY['admin', 'cashier']) THEN
        RAISE EXCEPTION 'Unauthorized: Only Admin and Cashier roles can record payments.';
    END IF;

    -- Current date in Manila timezone
    v_today_manila := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::date;

    -- R-08: ORNo uniqueness
    IF p_or_no IS NULL OR p_or_no <= 0 THEN
        RAISE EXCEPTION 'Official Receipt number (ORNo) must be a positive integer.';
    END IF;
    IF EXISTS (SELECT 1 FROM "PAYMENT" WHERE ORNo = p_or_no) THEN
        RAISE EXCEPTION 'That OR number (% ) is already recorded (R-08).', p_or_no;
    END IF;

    -- R-07: amount > 0 and max 2 decimal places
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero (R-07).';
    END IF;
    IF p_amount <> ROUND(p_amount, 2) THEN
        RAISE EXCEPTION 'Payment amount cannot have more than 2 decimal places (R-07).';
    END IF;

    -- R-05: transNo must exist in SALES and match custNo
    SELECT salesDate, custNo INTO v_sale_date, v_sale_cust_no
    FROM "SALES"
    WHERE transNo = p_trans_no;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction #% does not exist in Sales records (R-05).', p_trans_no;
    END IF;

    IF v_sale_cust_no <> p_cust_no THEN
        RAISE EXCEPTION 'That transaction (#%) does not belong to this customer (#%) (R-05).', p_trans_no, p_cust_no;
    END IF;

    -- R-06: payDate >= salesDate and <= today
    IF p_pay_date < v_sale_date THEN
        RAISE EXCEPTION 'The payment date (%) must be on or after the sale date (%) (R-06).', p_pay_date, v_sale_date;
    END IF;
    IF p_pay_date > v_today_manila THEN
        RAISE EXCEPTION 'The payment date (%) cannot be in the future (R-06).', p_pay_date;
    END IF;

    -- Insert PAYMENT row
    INSERT INTO "PAYMENT" (ORNo, payDate, amount, transNo)
    VALUES (p_or_no, p_pay_date, p_amount, p_trans_no);

    RETURN p_or_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. get_customer_summary (All authenticated roles)
CREATE OR REPLACE FUNCTION get_customer_summary(p_cust_no int)
RETURNS TABLE (
    custNo int,
    custName text,
    address text,
    payTerms text,
    ordersPlaced bigint,
    paymentCount bigint,
    totalPaid numeric,
    unpaidOrders bigint,
    lastPaymentDate date,
    lastPaymentOrNo int,
    customerSince date
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.custNo,
        c.custName,
        c.address,
        c.payTerms,
        COUNT(DISTINCT s.transNo) AS ordersPlaced,
        COUNT(p.ORNo) AS paymentCount,
        COALESCE(SUM(p.amount), 0.0) AS totalPaid,
        COUNT(DISTINCT CASE WHEN p.ORNo IS NULL AND s.transNo IS NOT NULL THEN s.transNo END) AS unpaidOrders,
        MAX(p.payDate) AS lastPaymentDate,
        (
            SELECT p_sub.ORNo 
            FROM "PAYMENT" p_sub 
            JOIN "SALES" s_sub ON s_sub.transNo = p_sub.transNo 
            WHERE s_sub.custNo = c.custNo 
            ORDER BY p_sub.payDate DESC, p_sub.ORNo DESC 
            LIMIT 1
        ) AS lastPaymentOrNo,
        MIN(s.salesDate) AS customerSince
    FROM "CUSTOMER" c
    LEFT JOIN "SALES" s ON s.custNo = c.custNo
    LEFT JOIN "PAYMENT" p ON p.transNo = s.transNo
    WHERE c.custNo = p_cust_no
    GROUP BY c.custNo, c.custName, c.address, c.payTerms;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions: Revoke public and anon, grant authenticated
REVOKE EXECUTE ON FUNCTION fn_check_customer_user_role FROM public, anon;
REVOKE EXECUTE ON FUNCTION create_customer FROM public, anon;
REVOKE EXECUTE ON FUNCTION update_customer FROM public, anon;
REVOKE EXECUTE ON FUNCTION record_payment FROM public, anon;
REVOKE EXECUTE ON FUNCTION get_customer_summary FROM public, anon;

GRANT EXECUTE ON FUNCTION create_customer TO authenticated;
GRANT EXECUTE ON FUNCTION update_customer TO authenticated;
GRANT EXECUTE ON FUNCTION record_payment TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_summary TO authenticated;
