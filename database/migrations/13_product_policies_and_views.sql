-- ========================================================================
-- HOPE Group4: PRODUCT POLICIES (RLS) AND SECURE VIEWS
-- File: database/16_product_policies_and_views.sql
-- Satisfies Rules: Section 5, 12.3, 12.4
-- Note: Safe to re-run. Do NOT execute automatically; run in Supabase SQL editor.
-- ========================================================================

-- 1. Ensure RLS is enabled on PRODUCT and PRICEHIST
ALTER TABLE "PRODUCT" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PRICEHIST" ENABLE ROW LEVEL SECURITY;

-- 2. Revoke all permissions from anon on PRODUCT and PRICEHIST
REVOKE ALL ON "PRODUCT" FROM anon;
REVOKE ALL ON "PRICEHIST" FROM anon;

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'role',
        current_setting('request.jwt.claims', true)::json ->> 'role',
        ''
    ) = 'admin';
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Policies on PRODUCT
DROP POLICY IF EXISTS p_product_select ON "PRODUCT";
CREATE POLICY p_product_select ON "PRODUCT"
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS p_product_insert ON "PRODUCT";
CREATE POLICY p_product_insert ON "PRODUCT"
    FOR INSERT TO authenticated
    WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS p_product_update ON "PRODUCT";
CREATE POLICY p_product_update ON "PRODUCT"
    FOR UPDATE TO authenticated
    USING (is_admin_user())
    WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS p_product_delete ON "PRODUCT";
CREATE POLICY p_product_delete ON "PRODUCT"
    FOR DELETE TO authenticated
    USING (false);

-- 4. Policies on PRICEHIST
DROP POLICY IF EXISTS p_pricehist_select ON "PRICEHIST";
CREATE POLICY p_pricehist_select ON "PRICEHIST"
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS p_pricehist_insert ON "PRICEHIST";
CREATE POLICY p_pricehist_insert ON "PRICEHIST"
    FOR INSERT TO authenticated
    WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS p_pricehist_update ON "PRICEHIST";
CREATE POLICY p_pricehist_update ON "PRICEHIST"
    FOR UPDATE TO authenticated
    USING (is_admin_user())
    WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS p_pricehist_delete ON "PRICEHIST";
CREATE POLICY p_pricehist_delete ON "PRICEHIST"
    FOR DELETE TO authenticated
    USING (false);

-- 5. View: v_price_history (security_invoker = true)
DROP VIEW IF EXISTS v_price_history CASCADE;
CREATE VIEW v_price_history
WITH (security_invoker = true) AS
WITH ranked_prices AS (
    SELECT 
        ph.prodCode,
        p.description,
        p.unit,
        ph.effDate,
        ph.unitPrice,
        LAG(ph.unitPrice) OVER (
            PARTITION BY ph.prodCode 
            ORDER BY ph.effDate ASC
        ) AS previousPrice,
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE AS v_today
    FROM "PRICEHIST" ph
    JOIN "PRODUCT" p ON p.prodCode = ph.prodCode
),
latest_valid_date AS (
    SELECT 
        prodCode,
        MAX(effDate) AS max_valid_eff_date
    FROM "PRICEHIST"
    WHERE effDate <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE
    GROUP BY prodCode
)
SELECT 
    rp.prodCode,
    rp.description,
    rp.unit,
    rp.effDate,
    rp.unitPrice,
    rp.previousPrice,
    CASE
        WHEN rp.effDate > rp.v_today THEN 'Future-dated'
        WHEN rp.effDate = lvd.max_valid_eff_date THEN 'Current'
        ELSE 'Past'
    END AS status
FROM ranked_prices rp
LEFT JOIN latest_valid_date lvd ON lvd.prodCode = rp.prodCode
ORDER BY rp.effDate DESC, rp.prodCode ASC;

REVOKE ALL ON v_price_history FROM anon;
GRANT SELECT ON v_price_history TO authenticated;

-- 6. View: v_product_overview (security_invoker = true)
DROP VIEW IF EXISTS v_product_overview CASCADE;
CREATE VIEW v_product_overview
WITH (security_invoker = true) AS
WITH current_and_prev_prices AS (
    SELECT 
        ph.prodCode,
        ph.effDate AS priceSince,
        ph.unitPrice AS currentUnitPrice,
        LAG(ph.unitPrice) OVER (
            PARTITION BY ph.prodCode 
            ORDER BY ph.effDate ASC
        ) AS previousPrice,
        ROW_NUMBER() OVER (
            PARTITION BY ph.prodCode 
            ORDER BY ph.effDate DESC
        ) AS rn
    FROM "PRICEHIST" ph
    WHERE ph.effDate <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE
),
product_counts AS (
    SELECT 
        prodCode,
        COUNT(*) AS priceRecordCount
    FROM "PRICEHIST"
    GROUP BY prodCode
),
product_sales_agg AS (
    SELECT 
        sd.prodCode,
        COALESCE(SUM(sd.quantity), 0) AS unitsSold,
        COALESCE(SUM(
            sd.quantity * (
                SELECT ph_sale.unitPrice 
                FROM "PRICEHIST" ph_sale 
                WHERE ph_sale.prodCode = sd.prodCode 
                  AND ph_sale.effDate <= s.salesDate 
                ORDER BY ph_sale.effDate DESC 
                LIMIT 1
            )
        ), 0.0) AS salesRevenue,
        MAX(s.salesDate) AS lastSold
    FROM "SALESDETAIL" sd
    JOIN "SALES" s ON s.transNo = sd.transNo
    GROUP BY sd.prodCode
)
SELECT 
    p.prodCode,
    p.description,
    p.unit,
    SPLIT_PART(p.prodCode, '-', 1) AS family,
    cpp.currentUnitPrice,
    cpp.priceSince,
    cpp.previousPrice,
    COALESCE(pc.priceRecordCount, 0) AS priceRecordCount,
    COALESCE(psa.unitsSold, 0) AS unitsSold,
    COALESCE(psa.salesRevenue, 0.0) AS salesRevenue,
    psa.lastSold
FROM "PRODUCT" p
LEFT JOIN (SELECT * FROM current_and_prev_prices WHERE rn = 1) cpp ON cpp.prodCode = p.prodCode
LEFT JOIN product_counts pc ON pc.prodCode = p.prodCode
LEFT JOIN product_sales_agg psa ON psa.prodCode = p.prodCode
ORDER BY p.prodCode ASC;

REVOKE ALL ON v_product_overview FROM anon;
GRANT SELECT ON v_product_overview TO authenticated;
