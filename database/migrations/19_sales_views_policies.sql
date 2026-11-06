-- =============================================================================
-- HOPE Group4 - SALES VIEWS & RLS POLICIES (MIGRATION 24)
-- Computed views without stored balances / debt fields (Section 11.3)
-- Safe to re-run
-- =============================================================================

-- 1. View: v_sale_lines
-- Detailed line items with effective unit price on the sale date
DROP VIEW IF EXISTS v_sale_lines CASCADE;
CREATE VIEW v_sale_lines
WITH (security_invoker = true) AS
SELECT 
    sd."transNo",
    s."salesDate",
    sd."prodCode",
    p."description",
    p."unit",
    sd."quantity",
    COALESCE(ph."unitPrice", 0.0) AS "unitPrice",
    ph."effDate" AS "priceEffDate",
    (sd."quantity" * COALESCE(ph."unitPrice", 0.0))::NUMERIC(14,2) AS "lineAmount"
FROM "SALESDETAIL" sd
JOIN "SALES" s ON s."transNo" = sd."transNo"
JOIN "PRODUCT" p ON p."prodCode" = sd."prodCode"
LEFT JOIN LATERAL (
    SELECT ph1."unitPrice", ph1."effDate"
    FROM "PRICEHIST" ph1
    WHERE ph1."prodCode" = sd."prodCode" AND ph1."effDate" <= s."salesDate"
    ORDER BY ph1."effDate" DESC
    LIMIT 1
) ph ON true;

-- 2. View: v_sales_summary
-- Header summary with rep attribution, department on sale date, itemCount and calculated total
DROP VIEW IF EXISTS v_sales_summary CASCADE;
CREATE VIEW v_sales_summary
WITH (security_invoker = true) AS
SELECT 
    s."transNo",
    s."salesDate",
    c."custNo",
    c."custName",
    e."empNo",
    (e."firstName" || ' ' || e."lastName") AS "repName",
    jh."deptCode",
    d."deptName",
    COALESCE(COUNT(sd."prodCode"), 0)::INT AS "itemCount",
    COALESCE(SUM(l."lineAmount"), 0.0)::NUMERIC(14,2) AS "totalAmount"
FROM "SALES" s
JOIN "CUSTOMER" c ON c."custNo" = s."custNo"
JOIN "EMPLOYEE" e ON e."empNo" = s."empNo"
LEFT JOIN LATERAL (
    SELECT jh1."deptCode"
    FROM "JOBHISTORY" jh1
    WHERE jh1."empNo" = s."empNo" AND jh1."effDate" <= s."salesDate"
    ORDER BY jh1."effDate" DESC
    LIMIT 1
) jh ON true
LEFT JOIN "DEPARTMENT" d ON d."deptCode" = jh."deptCode"
LEFT JOIN "SALESDETAIL" sd ON sd."transNo" = s."transNo"
LEFT JOIN v_sale_lines l ON l."transNo" = sd."transNo" AND l."prodCode" = sd."prodCode"
GROUP BY s."transNo", s."salesDate", c."custNo", c."custName", e."empNo", e."firstName", e."lastName", jh."deptCode", d."deptName";

-- 3. Row Level Security (RLS) on SALES and SALESDETAIL
ALTER TABLE "SALES" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SALESDETAIL" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_sales_select ON "SALES";
CREATE POLICY p_sales_select ON "SALES"
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "USER_ROLES" ur
            WHERE ur.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS p_salesdetail_select ON "SALESDETAIL";
CREATE POLICY p_salesdetail_select ON "SALESDETAIL"
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM "USER_ROLES" ur
            WHERE ur.user_id = auth.uid()
        )
    );

-- 4. Revoke anonymous access completely
REVOKE ALL ON "SALES" FROM anon, public;
REVOKE ALL ON "SALESDETAIL" FROM anon, public;
REVOKE ALL ON v_sale_lines FROM anon, public;
REVOKE ALL ON v_sales_summary FROM anon, public;

GRANT SELECT ON "SALES" TO authenticated;
GRANT SELECT ON "SALESDETAIL" TO authenticated;
GRANT SELECT ON v_sale_lines TO authenticated;
GRANT SELECT ON v_sales_summary TO authenticated;
