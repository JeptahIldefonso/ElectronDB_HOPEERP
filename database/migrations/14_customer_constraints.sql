-- ========================================================================
-- HOPE Group4: CUSTOMER AND PAYMENT CONSTRAINTS AND INTEGRITY TRIGGERS
-- File: database/18_customer_constraints.sql
-- Satisfies Rules: R-01, R-02, R-03, R-04, R-07, R-08, R-09, R-10, R-11
-- Note: Safe to re-run. Do NOT execute automatically; run in Supabase SQL editor.
-- ========================================================================

-- 1. Check constraint: amount > 0 on PAYMENT (R-07)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_amount_positive'
    ) THEN
        ALTER TABLE "PAYMENT" DROP CONSTRAINT chk_payment_amount_positive;
    END IF;
    ALTER TABLE "PAYMENT" ADD CONSTRAINT chk_payment_amount_positive CHECK (amount > 0);
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 2. Check constraint: payTerms in ('COD', '30D', '45D') on CUSTOMER (R-04)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_customer_payterms_valid'
    ) THEN
        ALTER TABLE "CUSTOMER" DROP CONSTRAINT chk_customer_payterms_valid;
    END IF;
    ALTER TABLE "CUSTOMER" ADD CONSTRAINT chk_customer_payterms_valid 
        CHECK (payTerms IN ('COD', '30D', '45D'));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 3. Foreign key constraints with ON DELETE RESTRICT (R-10)
DO $$
BEGIN
    -- SALES -> CUSTOMER fk
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_sales_customer'
    ) THEN
        ALTER TABLE "SALES" DROP CONSTRAINT fk_sales_customer;
    END IF;
    ALTER TABLE "SALES" ADD CONSTRAINT fk_sales_customer 
        FOREIGN KEY (custNo) REFERENCES "CUSTOMER"(custNo) ON DELETE RESTRICT;

    -- PAYMENT -> SALES fk
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_sales'
    ) THEN
        ALTER TABLE "PAYMENT" DROP CONSTRAINT fk_payment_sales;
    END IF;
    ALTER TABLE "PAYMENT" ADD CONSTRAINT fk_payment_sales 
        FOREIGN KEY (transNo) REFERENCES "SALES"(transNo) ON DELETE RESTRICT;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 4. Trigger: Block updating custNo on CUSTOMER (R-11)
CREATE OR REPLACE FUNCTION fn_prevent_customer_pk_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.custNo <> NEW.custNo THEN
        RAISE EXCEPTION 'Customer number (custNo) cannot be changed once created (R-11).';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_customer_pk_update ON "CUSTOMER";
CREATE TRIGGER trg_prevent_customer_pk_update
    BEFORE UPDATE ON "CUSTOMER"
    FOR EACH ROW
    EXECUTE FUNCTION fn_prevent_customer_pk_update();

-- 5. Trigger: Block DELETE on CUSTOMER (R-10)
CREATE OR REPLACE FUNCTION fn_prevent_customer_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Customers cannot be deleted from the system (R-10).';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_customer_delete ON "CUSTOMER";
CREATE TRIGGER trg_prevent_customer_delete
    BEFORE DELETE ON "CUSTOMER"
    FOR EACH ROW
    EXECUTE FUNCTION fn_prevent_customer_delete();

-- 6. Trigger: Block updating ORNo or transNo on PAYMENT (R-11)
CREATE OR REPLACE FUNCTION fn_prevent_payment_keys_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.ORNo <> NEW.ORNo THEN
        RAISE EXCEPTION 'Official Receipt number (ORNo) cannot be changed once recorded (R-11).';
    END IF;
    IF OLD.transNo <> NEW.transNo THEN
        RAISE EXCEPTION 'Transaction number (transNo) on a payment cannot be changed once recorded (R-11).';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_payment_keys_update ON "PAYMENT";
CREATE TRIGGER trg_prevent_payment_keys_update
    BEFORE UPDATE ON "PAYMENT"
    FOR EACH ROW
    EXECUTE FUNCTION fn_prevent_payment_keys_update();

-- 7. Trigger: Block UPDATE or DELETE on PAYMENT to protect financial history (R-09)
CREATE OR REPLACE FUNCTION fn_protect_payment_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Official Receipt payment records cannot be deleted through the system (R-09).';
    END IF;
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Official Receipt payment records cannot be edited through the system (R-09).';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_payment_immutability ON "PAYMENT";
CREATE TRIGGER trg_protect_payment_immutability
    BEFORE UPDATE OR DELETE ON "PAYMENT"
    FOR EACH ROW
    EXECUTE FUNCTION fn_protect_payment_immutability();
