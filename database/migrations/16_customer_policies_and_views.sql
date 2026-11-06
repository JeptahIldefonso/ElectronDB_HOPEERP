-- ========================================================================
-- HOPE Group4: CUSTOMER AND PAYMENT POLICIES AND VIEWS
-- File: database/20_customer_policies_and_views.sql
-- Satisfies Rules: Section 10.3, Section 10.4, security_invoker = true
-- Note: Safe to re-run. Do NOT execute automatically; run in Supabase SQL editor.
-- ========================================================================

-- 1. Enable RLS
ALTER TABLE "CUSTOMER" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PAYMENT" ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS p_customer_select_auth ON "CUSTOMER";
DROP POLICY IF EXISTS p_payment_select_auth ON "PAYMENT";

-- 3. Create SELECT policies for authenticated users
CREATE POLICY p_customer_select_auth ON "CUSTOMER"
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY p_payment_select_auth ON "PAYMENT"
    FOR SELECT TO authenticated
    USING (true);

-- 4. Revoke direct anon access
REVOKE ALL ON "CUSTOMER" FROM anon;
REVOKE ALL ON "PAYMENT" FROM anon;
GRANT SELECT ON "CUSTOMER" TO authenticated;
GRANT SELECT ON "PAYMENT" TO authenticated;

-- 5. Recreate View: v_customer_overview
DROP VIEW IF EXISTS v_customer_overview;
CREATE VIEW v_customer_overview
WITH (security_invoker = true)
AS
SELECT 
    c.custNo,
    c.custName,
    c.address,
    c.payTerms,
    COUNT(DISTINCT s.transNo) AS ordersPlaced,
    COUNT(p.ORNo) AS paymentCount,
    COALESCE(SUM(p.amount), 0.0) AS totalPaid,
    (
        COUNT(DISTINCT s.transNo) - COUNT(DISTINCT p.transNo)
    ) AS unpaidOrders,
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
GROUP BY c.custNo, c.custName, c.address, c.payTerms;

-- 6. Recreate View: v_customer_payments
DROP VIEW IF EXISTS v_customer_payments;
CREATE VIEW v_customer_payments
WITH (security_invoker = true)
AS
SELECT 
    p.ORNo,
    p.payDate,
    p.amount,
    p.transNo,
    s.custNo,
    c.custName,
    s.salesDate,
    CASE WHEN s.transNo IS NULL THEN true ELSE false END AS isUnlinked
FROM "PAYMENT" p
LEFT JOIN "SALES" s ON s.transNo = p.transNo
LEFT JOIN "CUSTOMER" c ON c.custNo = s.custNo
ORDER BY p.payDate DESC, p.ORNo DESC;

-- Revoke anon, grant authenticated on views
REVOKE ALL ON v_customer_overview FROM anon;
REVOKE ALL ON v_customer_payments FROM anon;
GRANT SELECT ON v_customer_overview TO authenticated;
GRANT SELECT ON v_customer_payments TO authenticated;
