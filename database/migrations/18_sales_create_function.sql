-- =============================================================================
-- HOPE Group4 - SALES CREATION RPC FUNCTION (MIGRATION 23)
-- Atomic multi-line creation enforcing Rules R-01 to R-09
-- Safe to re-run
-- =============================================================================

CREATE OR REPLACE FUNCTION create_sale(
    p_custno INT,
    p_empno INT,
    p_salesdate DATE,
    p_items JSONB
)
RETURNS INT AS $$
DECLARE
    v_role TEXT;
    v_user_id UUID;
    v_max_date DATE;
    v_hire_date DATE;
    v_sep_date DATE;
    v_has_job BOOLEAN;
    v_new_transno INT;
    v_item JSONB;
    v_prodcode TEXT;
    v_qty INT;
    v_item_count INT;
    v_has_price BOOLEAN;
    v_seen_prods TEXT[] := '{}';
BEGIN
    -- 1. Authorization: Only Admin and Sales can create sales (Section 5)
    v_user_id := auth.uid();
    v_role := COALESCE(
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role',
        (SELECT role FROM "USER_ROLES" WHERE user_id = v_user_id LIMIT 1),
        'none'
    );

    IF LOWER(v_role) NOT IN ('admin', 'sales') THEN
        RAISE EXCEPTION 'Access denied: Only sales representatives or administrators can create sales.';
    END IF;

    -- Advisory lock to prevent race conditions during numbering (R-08, R-09)
    PERFORM pg_advisory_xact_lock(54321004);

    -- 2. Validate line item count (R-02)
    v_item_count := jsonb_array_length(p_items);
    IF v_item_count IS NULL OR v_item_count < 1 THEN
        RAISE EXCEPTION 'Rule R-02 violation: Add at least one product to this sale.';
    END IF;

    IF v_item_count > 50 THEN
        RAISE EXCEPTION 'A single sale cannot exceed 50 line items.';
    END IF;

    -- 3. Validate Date limits (R-07)
    IF p_salesdate > CURRENT_DATE THEN
        RAISE EXCEPTION 'Rule R-07 violation: The sale date cannot be in the future.';
    END IF;

    SELECT MAX("salesDate") INTO v_max_date FROM "SALES";
    IF v_max_date IS NOT NULL AND p_salesdate < v_max_date THEN
        RAISE EXCEPTION 'Rule R-07 violation: The sale date cannot be earlier than the latest sale (%) or in the future.', v_max_date;
    END IF;

    -- 4. Validate Customer exists (R-01)
    IF NOT EXISTS (SELECT 1 FROM "CUSTOMER" WHERE "custNo" = p_custno) THEN
        RAISE EXCEPTION 'Rule R-01 violation: Customer % does not exist.', p_custno;
    END IF;

    -- 5. Validate Sales Rep exists, was active, and has department (R-06)
    SELECT "hireDate", "sepDate" INTO v_hire_date, v_sep_date
    FROM "EMPLOYEE"
    WHERE "empNo" = p_empno;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rule R-01 violation: Employee % does not exist.', p_empno;
    END IF;

    IF v_hire_date > p_salesdate THEN
        RAISE EXCEPTION 'Rule R-06 violation: Sales rep was not yet hired on %.', p_salesdate;
    END IF;

    IF v_sep_date IS NOT NULL AND v_sep_date < p_salesdate THEN
        RAISE EXCEPTION 'Rule R-06 violation: Sales rep was already separated on %.', p_salesdate;
    END IF;

    -- Check rep has a JOBHISTORY record on or before sale date
    SELECT EXISTS (
        SELECT 1 FROM "JOBHISTORY"
        WHERE "empNo" = p_empno AND "effDate" <= p_salesdate
    ) INTO v_has_job;

    IF NOT v_has_job THEN
        RAISE EXCEPTION 'Rule R-06 violation: Sales rep has no assigned department on %.', p_salesdate;
    END IF;

    -- 6. Validate each line item (R-03, R-04, R-05)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_prodcode := v_item ->> 'prodCode';
        v_qty := (v_item ->> 'qty')::INT;

        IF v_prodcode IS NULL OR TRIM(v_prodcode) = '' THEN
            RAISE EXCEPTION 'Product code is required for each line.';
        END IF;

        -- R-03: No duplicate products per sale
        IF v_prodcode = ANY(v_seen_prods) THEN
            RAISE EXCEPTION 'Rule R-03 violation: Product % is already on this sale.', v_prodcode;
        END IF;
        v_seen_prods := array_append(v_seen_prods, v_prodcode);

        -- R-04: Quantity range 1..9999
        IF v_qty IS NULL OR v_qty < 1 OR v_qty > 9999 THEN
            RAISE EXCEPTION 'Rule R-04 violation: Quantity must be a whole number between 1 and 9,999.';
        END IF;

        -- Validate product exists
        IF NOT EXISTS (SELECT 1 FROM "PRODUCT" WHERE "prodCode" = v_prodcode) THEN
            RAISE EXCEPTION 'Product % does not exist in catalog.', v_prodcode;
        END IF;

        -- R-05: Product has effective price on or before sale date
        SELECT EXISTS (
            SELECT 1 FROM "PRICEHIST"
            WHERE "prodCode" = v_prodcode AND "effDate" <= p_salesdate
        ) INTO v_has_price;

        IF NOT v_has_price THEN
            RAISE EXCEPTION 'Rule R-05 violation: Product % has no price on %.', v_prodcode, p_salesdate;
        END IF;
    END LOOP;

    -- 7. Assign next transNo from sequence / max (R-08)
    SELECT COALESCE(MAX("transNo"), 5000) + 1 INTO v_new_transno FROM "SALES";

    -- 8. Atomic insertion (R-09)
    -- Insert master sale
    INSERT INTO "SALES" ("transNo", "salesDate", "custNo", "empNo")
    VALUES (v_new_transno, p_salesdate, p_custno, p_empno);

    -- Insert line items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_prodcode := v_item ->> 'prodCode';
        v_qty := (v_item ->> 'qty')::INT;

        INSERT INTO "SALESDETAIL" ("transNo", "prodCode", "quantity")
        VALUES (v_new_transno, v_prodcode, v_qty);
    END LOOP;

    RETURN v_new_transno;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke from public & anon
REVOKE EXECUTE ON FUNCTION create_sale(INT, INT, DATE, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_sale(INT, INT, DATE, JSONB) TO authenticated;
