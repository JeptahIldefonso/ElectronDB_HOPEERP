-- =============================================================================
-- HOPE Group4 - SALES CONSTRAINTS & INDEXES (MIGRATION 22)
-- Strictly preserves 10-table ERD (SALES, SALESDETAIL)
-- Enforces Rules R-03, R-04, R-08, R-10
-- Safe to re-run
-- =============================================================================

-- 1. Quantity Check Constraint on SALESDETAIL (R-04: whole number 1 to 9,999)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_salesdetail_quantity'
    ) THEN
        ALTER TABLE "SALESDETAIL"
            ADD CONSTRAINT chk_salesdetail_quantity
            CHECK ("quantity" > 0 AND "quantity" <= 9999);
    END IF;
END $$;

-- 2. Foreign Key ON DELETE RESTRICT on SALES (R-01)
DO $$
BEGIN
    -- SALES -> CUSTOMER
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_customer_restrict'
    ) THEN
        ALTER TABLE "SALES"
            DROP CONSTRAINT IF EXISTS "SALES_custNo_fkey",
            ADD CONSTRAINT fk_sales_customer_restrict
            FOREIGN KEY ("custNo") REFERENCES "CUSTOMER"("custNo")
            ON DELETE RESTRICT ON UPDATE RESTRICT;
    END IF;

    -- SALES -> EMPLOYEE
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_employee_restrict'
    ) THEN
        ALTER TABLE "SALES"
            DROP CONSTRAINT IF EXISTS "SALES_empNo_fkey",
            ADD CONSTRAINT fk_sales_employee_restrict
            FOREIGN KEY ("empNo") REFERENCES "EMPLOYEE"("empNo")
            ON DELETE RESTRICT ON UPDATE RESTRICT;
    END IF;
END $$;

-- 3. Foreign Key ON DELETE RESTRICT on SALESDETAIL (R-01, R-03)
DO $$
BEGIN
    -- SALESDETAIL -> SALES
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_salesdetail_sales_restrict'
    ) THEN
        ALTER TABLE "SALESDETAIL"
            DROP CONSTRAINT IF EXISTS "SALESDETAIL_transNo_fkey",
            ADD CONSTRAINT fk_salesdetail_sales_restrict
            FOREIGN KEY ("transNo") REFERENCES "SALES"("transNo")
            ON DELETE RESTRICT ON UPDATE RESTRICT;
    END IF;

    -- SALESDETAIL -> PRODUCT
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_salesdetail_product_restrict'
    ) THEN
        ALTER TABLE "SALESDETAIL"
            DROP CONSTRAINT IF EXISTS "SALESDETAIL_prodCode_fkey",
            ADD CONSTRAINT fk_salesdetail_product_restrict
            FOREIGN KEY ("prodCode") REFERENCES "PRODUCT"("prodCode")
            ON DELETE RESTRICT ON UPDATE RESTRICT;
    END IF;
END $$;

-- 4. Triggers to enforce immutability of SALES and SALESDETAIL (R-10)
CREATE OR REPLACE FUNCTION fn_prevent_sales_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Rule R-10 violation: Saved sales and line items are permanent history and cannot be edited or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_sales_update_delete ON "SALES";
CREATE TRIGGER trg_prevent_sales_update_delete
    BEFORE UPDATE OR DELETE ON "SALES"
    FOR EACH ROW
    EXECUTE FUNCTION fn_prevent_sales_mutation();

DROP TRIGGER IF EXISTS trg_prevent_salesdetail_update_delete ON "SALESDETAIL";
CREATE TRIGGER trg_prevent_salesdetail_update_delete
    BEFORE UPDATE OR DELETE ON "SALESDETAIL"
    FOR EACH ROW
    EXECUTE FUNCTION fn_prevent_sales_mutation();

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sales_salesdate ON "SALES"("salesDate" DESC, "transNo" DESC);
CREATE INDEX IF NOT EXISTS idx_sales_custno ON "SALES"("custNo");
CREATE INDEX IF NOT EXISTS idx_sales_empno ON "SALES"("empNo");
CREATE INDEX IF NOT EXISTS idx_salesdetail_prodcode ON "SALESDETAIL"("prodCode");
CREATE INDEX IF NOT EXISTS idx_salesdetail_transno ON "SALESDETAIL"("transNo");
CREATE INDEX IF NOT EXISTS idx_pricehist_prod_effdate ON "PRICEHIST"("prodCode", "effDate" DESC);
CREATE INDEX IF NOT EXISTS idx_jobhistory_emp_effdate ON "JOBHISTORY"("empNo", "effDate" DESC);
