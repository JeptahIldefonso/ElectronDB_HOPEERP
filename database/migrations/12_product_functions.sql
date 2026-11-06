-- ========================================================================
-- HOPE Group4: PRODUCT STORED FUNCTIONS AND TRANSACTION LOGIC
-- File: database/15_product_functions.sql
-- Satisfies Rules: R-01, R-02, R-03, R-04, R-05, R-06, R-08, R-09, R-12
-- Note: Safe to re-run. Do NOT execute automatically; run in Supabase SQL editor.
-- ========================================================================

-- Helper function to assert admin role from JWT app_metadata
CREATE OR REPLACE FUNCTION rpc_assert_admin_role()
RETURNS VOID AS $$
DECLARE
    v_role TEXT;
BEGIN
    v_role := COALESCE(
        current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'role',
        current_setting('request.jwt.claims', true)::json ->> 'role',
        ''
    );
    IF v_role <> 'admin' THEN
        RAISE EXCEPTION 'Access denied. Only system administrators can perform this action.';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 1. create_product: Atomically creates PRODUCT and its initial PRICEHIST row (R-01, R-02, R-03, R-04, R-05)
CREATE OR REPLACE FUNCTION create_product(
    p_prod_code TEXT,
    p_description TEXT,
    p_unit TEXT,
    p_initial_price NUMERIC,
    p_eff_date DATE
)
RETURNS TEXT AS $$
DECLARE
    v_clean_code TEXT;
    v_clean_desc TEXT;
    v_clean_unit TEXT;
    v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE;
BEGIN
    PERFORM rpc_assert_admin_role();

    v_clean_code := UPPER(TRIM(p_prod_code));
    v_clean_desc := TRIM(p_description);
    v_clean_unit := LOWER(TRIM(p_unit));

    -- R-02: Pattern check
    IF v_clean_code !~ '^[A-Z]{2,4}-[A-Z0-9-]+$' THEN
        RAISE EXCEPTION 'Product code must follow the pattern FAM-XXXX (2-4 uppercase letters, a hyphen, then letters/numbers/hyphens).';
    END IF;

    -- R-03: Description required
    IF LENGTH(v_clean_desc) = 0 THEN
        RAISE EXCEPTION 'Product description is required.';
    END IF;

    -- R-03: Description unique case-insensitively
    IF EXISTS (
        SELECT 1 FROM "PRODUCT" 
        WHERE LOWER(TRIM(description)) = LOWER(v_clean_desc)
    ) THEN
        RAISE EXCEPTION 'A product with this description already exists.';
    END IF;

    -- R-04: Initial price positive
    IF p_initial_price IS NULL OR p_initial_price <= 0 THEN
        RAISE EXCEPTION 'Unit price must be greater than zero.';
    END IF;

    -- R-05: Effective date cannot be in the future
    IF p_eff_date > v_today THEN
        RAISE EXCEPTION 'Effective date cannot be in the future (R-05).';
    END IF;

    -- Insert PRODUCT
    INSERT INTO "PRODUCT" (prodCode, description, unit)
    VALUES (v_clean_code, v_clean_desc, v_clean_unit);

    -- Insert initial PRICEHIST
    INSERT INTO "PRICEHIST" (effDate, prodCode, unitPrice)
    VALUES (p_eff_date, v_clean_code, ROUND(p_initial_price, 2));

    RETURN v_clean_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION create_product(TEXT, TEXT, TEXT, NUMERIC, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_product(TEXT, TEXT, TEXT, NUMERIC, DATE) TO authenticated;

-- 2. add_price_record: Inserts a new PRICEHIST row with strict integrity checks (R-04, R-05, R-06, R-08)
CREATE OR REPLACE FUNCTION add_price_record(
    p_prod_code TEXT,
    p_unit_price NUMERIC,
    p_eff_date DATE
)
RETURNS VOID AS $$
DECLARE
    v_clean_code TEXT;
    v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE;
    v_latest_eff_date DATE;
    v_latest_unit_price NUMERIC;
    v_latest_sale_date DATE;
BEGIN
    PERFORM rpc_assert_admin_role();

    v_clean_code := UPPER(TRIM(p_prod_code));

    -- Lock the product row
    IF NOT EXISTS (
        SELECT 1 FROM "PRODUCT" WHERE prodCode = v_clean_code FOR UPDATE
    ) THEN
        RAISE EXCEPTION 'Product % does not exist.', v_clean_code;
    END IF;

    -- R-04: Positive unit price
    IF p_unit_price IS NULL OR p_unit_price <= 0 THEN
        RAISE EXCEPTION 'Unit price must be greater than zero.';
    END IF;

    -- R-05: Effective date cannot be in the future
    IF p_eff_date > v_today THEN
        RAISE EXCEPTION 'Effective date cannot be in the future (R-05).';
    END IF;

    -- Retrieve latest price record
    SELECT effDate, unitPrice
    INTO v_latest_eff_date, v_latest_unit_price
    FROM "PRICEHIST"
    WHERE prodCode = v_clean_code
    ORDER BY effDate DESC
    LIMIT 1;

    -- R-05: Must be later than the latest price record
    IF v_latest_eff_date IS NOT NULL AND p_eff_date <= v_latest_eff_date THEN
        RAISE EXCEPTION 'The effective date must be after the latest price record (%).', v_latest_eff_date;
    END IF;

    -- R-08: New price cannot equal current price
    IF v_latest_unit_price IS NOT NULL AND ROUND(p_unit_price, 2) = ROUND(v_latest_unit_price, 2) THEN
        RAISE EXCEPTION 'The new price is the same as the current price (R-08).';
    END IF;

    -- R-06: Must be later than the product's latest sale date
    SELECT MAX(s.salesDate)
    INTO v_latest_sale_date
    FROM "SALESDETAIL" sd
    JOIN "SALES" s ON s.transNo = sd.transNo
    WHERE sd.prodCode = v_clean_code;

    IF v_latest_sale_date IS NOT NULL AND p_eff_date <= v_latest_sale_date THEN
        RAISE EXCEPTION 'This product has sales dated %. The effective date must be after it, so past sales keep their original price (R-06).', v_latest_sale_date;
    END IF;

    -- Insert new price record
    INSERT INTO "PRICEHIST" (effDate, prodCode, unitPrice)
    VALUES (p_eff_date, v_clean_code, ROUND(p_unit_price, 2));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION add_price_record(TEXT, NUMERIC, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION add_price_record(TEXT, NUMERIC, DATE) TO authenticated;

-- 3. correct_price_record: Updates unitPrice of the latest row only if unused by sales (R-04, R-09)
CREATE OR REPLACE FUNCTION correct_price_record(
    p_prod_code TEXT,
    p_new_price NUMERIC
)
RETURNS VOID AS $$
DECLARE
    v_clean_code TEXT;
    v_latest_eff_date DATE;
    v_has_sales BOOLEAN;
BEGIN
    PERFORM rpc_assert_admin_role();

    v_clean_code := UPPER(TRIM(p_prod_code));

    -- R-04: Positive unit price
    IF p_new_price IS NULL OR p_new_price <= 0 THEN
        RAISE EXCEPTION 'Unit price must be greater than zero.';
    END IF;

    -- Find latest effDate
    SELECT MAX(effDate) INTO v_latest_eff_date
    FROM "PRICEHIST"
    WHERE prodCode = v_clean_code;

    IF v_latest_eff_date IS NULL THEN
        RAISE EXCEPTION 'No price records found for product %.', v_clean_code;
    END IF;

    -- R-09: Verify no sales exist on or after v_latest_eff_date
    SELECT EXISTS (
        SELECT 1 
        FROM "SALESDETAIL" sd
        JOIN "SALES" s ON s.transNo = sd.transNo
        WHERE sd.prodCode = v_clean_code
          AND s.salesDate >= v_latest_eff_date
    ) INTO v_has_sales;

    IF v_has_sales THEN
        RAISE EXCEPTION 'This price is already used by a sale and cannot be changed. Add a new price instead (R-09).';
    END IF;

    -- Update latest record
    UPDATE "PRICEHIST"
    SET unitPrice = ROUND(p_new_price, 2)
    WHERE prodCode = v_clean_code
      AND effDate = v_latest_eff_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION correct_price_record(TEXT, NUMERIC) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION correct_price_record(TEXT, NUMERIC) TO authenticated;

-- 4. update_product: Updates description and unit with integrity checks (R-03, R-12)
CREATE OR REPLACE FUNCTION update_product(
    p_prod_code TEXT,
    p_description TEXT,
    p_unit TEXT
)
RETURNS VOID AS $$
DECLARE
    v_clean_code TEXT;
    v_clean_desc TEXT;
    v_clean_unit TEXT;
    v_current_unit TEXT;
    v_has_sales BOOLEAN;
BEGIN
    PERFORM rpc_assert_admin_role();

    v_clean_code := UPPER(TRIM(p_prod_code));
    v_clean_desc := TRIM(p_description);
    v_clean_unit := LOWER(TRIM(p_unit));

    -- R-03: Description required
    IF LENGTH(v_clean_desc) = 0 THEN
        RAISE EXCEPTION 'Product description is required.';
    END IF;

    -- R-03: Description unique case-insensitively (excluding this product)
    IF EXISTS (
        SELECT 1 FROM "PRODUCT"
        WHERE LOWER(TRIM(description)) = LOWER(v_clean_desc)
          AND prodCode <> v_clean_code
    ) THEN
        RAISE EXCEPTION 'A product with this description already exists.';
    END IF;

    -- Fetch current unit
    SELECT unit INTO v_current_unit
    FROM "PRODUCT"
    WHERE prodCode = v_clean_code;

    IF v_current_unit IS NULL THEN
        RAISE EXCEPTION 'Product % does not exist.', v_clean_code;
    END IF;

    -- R-12: Unit cannot change if product has been sold
    IF v_clean_unit <> v_current_unit THEN
        SELECT EXISTS (
            SELECT 1 FROM "SALESDETAIL" WHERE prodCode = v_clean_code LIMIT 1
        ) INTO v_has_sales;

        IF v_has_sales THEN
            RAISE EXCEPTION 'The unit cannot be changed because this product has already been sold (R-12).';
        END IF;
    END IF;

    UPDATE "PRODUCT"
    SET description = v_clean_desc,
        unit = v_clean_unit
    WHERE prodCode = v_clean_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION update_product(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION update_product(TEXT, TEXT, TEXT) TO authenticated;

-- 5. get_unit_price: Read function to resolve point-in-time unit price on a given date (Section 4, 12.2)
CREATE OR REPLACE FUNCTION get_unit_price(
    p_prod_code TEXT,
    p_date DATE
)
RETURNS NUMERIC AS $$
DECLARE
    v_price NUMERIC;
BEGIN
    SELECT unitPrice INTO v_price
    FROM "PRICEHIST"
    WHERE prodCode = p_prod_code
      AND effDate <= p_date
    ORDER BY effDate DESC
    LIMIT 1;

    RETURN v_price;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_unit_price(TEXT, DATE) TO authenticated;
