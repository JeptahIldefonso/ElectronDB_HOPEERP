-- ========================================================================
-- HOPE Group4: PRODUCT AND PRICEHIST CONSTRAINTS AND INTEGRITY TRIGGERS
-- File: database/14_product_constraints.sql
-- Satisfies Rules: R-02, R-03, R-04, R-09, R-10, R-11, R-12
-- Note: Safe to re-run. Do NOT execute automatically; run in Supabase SQL editor.
-- ========================================================================

-- 1. Check constraint: unitPrice > 0 on PRICEHIST (R-04)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_pricehist_unitprice_positive'
    ) THEN
        ALTER TABLE "PRICEHIST" DROP CONSTRAINT chk_pricehist_unitprice_positive;
    END IF;
    ALTER TABLE "PRICEHIST" ADD CONSTRAINT chk_pricehist_unitprice_positive CHECK (unitPrice > 0);
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 2. Check constraint: prodCode format pattern on PRODUCT (R-02)
-- Pattern: 2 to 4 uppercase letters, hyphen, then uppercase letters, digits, and hyphens
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_product_code_format'
    ) THEN
        ALTER TABLE "PRODUCT" DROP CONSTRAINT chk_product_code_format;
    END IF;
    ALTER TABLE "PRODUCT" ADD CONSTRAINT chk_product_code_format 
        CHECK (prodCode ~ '^[A-Z]{2,4}-[A-Z0-9-]+$');
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 3. Case-insensitive unique constraint on PRODUCT.description (R-03)
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_description_ci 
    ON "PRODUCT" (LOWER(TRIM(description)));

-- 4. Foreign key ON DELETE RESTRICT on PRICEHIST.prodCode and SALESDETAIL.prodCode (R-10)
DO $$
BEGIN
    -- PRICEHIST fk
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_pricehist_product'
    ) THEN
        ALTER TABLE "PRICEHIST" DROP CONSTRAINT fk_pricehist_product;
    END IF;
    ALTER TABLE "PRICEHIST" ADD CONSTRAINT fk_pricehist_product 
        FOREIGN KEY (prodCode) REFERENCES "PRODUCT"(prodCode) ON DELETE RESTRICT;

    -- SALESDETAIL fk
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_salesdetail_product'
    ) THEN
        ALTER TABLE "SALESDETAIL" DROP CONSTRAINT fk_salesdetail_product;
    END IF;
    ALTER TABLE "SALESDETAIL" ADD CONSTRAINT fk_salesdetail_product 
        FOREIGN KEY (prodCode) REFERENCES "PRODUCT"(prodCode) ON DELETE RESTRICT;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 5. Trigger: Protect PRODUCT from DELETE, code mutation, and unit change if sold (R-02, R-10, R-11, R-12)
CREATE OR REPLACE FUNCTION trg_fn_product_integrity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Products cannot be deleted. History must be preserved (R-10).';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- R-02, R-11: prodCode cannot change
        IF NEW.prodCode <> OLD.prodCode THEN
            RAISE EXCEPTION 'Product code is permanent and cannot be changed (R-02, R-11).';
        END IF;

        -- R-12: unit cannot change once product appears in any SALESDETAIL row
        IF NEW.unit <> OLD.unit THEN
            IF EXISTS (SELECT 1 FROM "SALESDETAIL" WHERE prodCode = OLD.prodCode LIMIT 1) THEN
                RAISE EXCEPTION 'The unit cannot be changed because this product has already been sold (R-12).';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_product_integrity ON "PRODUCT";
CREATE TRIGGER trg_product_integrity
BEFORE UPDATE OR DELETE ON "PRODUCT"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_product_integrity();

-- 6. Trigger: Protect PRICEHIST from DELETE, key mutation, and unauthorized update (R-09, R-10, R-11)
CREATE OR REPLACE FUNCTION trg_fn_pricehist_integrity()
RETURNS TRIGGER AS $$
DECLARE
    v_latest_date DATE;
    v_has_sales BOOLEAN;
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Price history records cannot be deleted (R-10).';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- R-11: prodCode and effDate cannot change
        IF NEW.prodCode <> OLD.prodCode OR NEW.effDate <> OLD.effDate THEN
            RAISE EXCEPTION 'Product code and effective date are permanent and cannot be changed (R-11).';
        END IF;

        -- Check R-09: unitPrice can be corrected ONLY if this row is the latest row
        -- AND no sales exist on or after OLD.effDate
        SELECT MAX(effDate) INTO v_latest_date
        FROM "PRICEHIST"
        WHERE prodCode = OLD.prodCode;

        IF OLD.effDate <> v_latest_date THEN
            RAISE EXCEPTION 'Only the latest price record can be corrected. Past price records are read-only (R-09).';
        END IF;

        SELECT EXISTS (
            SELECT 1 
            FROM "SALESDETAIL" sd
            JOIN "SALES" s ON s.transNo = sd.transNo
            WHERE sd.prodCode = OLD.prodCode
              AND s.salesDate >= OLD.effDate
        ) INTO v_has_sales;

        IF v_has_sales THEN
            RAISE EXCEPTION 'This price is already used by a sale and cannot be changed. Add a new price instead (R-09).';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pricehist_integrity ON "PRICEHIST";
CREATE TRIGGER trg_pricehist_integrity
BEFORE UPDATE OR DELETE ON "PRICEHIST"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_pricehist_integrity();
