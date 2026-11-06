-- ========================================================================
-- HOPE Group4: DATA INTEGRITY TRIGGERS & ATOMIC RPC
-- Enforces: Backdated price prevention, backdated transfer prevention,
--           overpayment prevention with row-locking, and atomic sales.
-- ========================================================================

-- 1. Trigger: Prevent Backdated Prices that would rewrite past sales
CREATE OR REPLACE FUNCTION fn_prevent_backdated_price()
RETURNS TRIGGER AS $$
DECLARE
    v_latest_sale DATE;
BEGIN
    SELECT MAX(s.salesDate) INTO v_latest_sale
    FROM SALES s
    JOIN SALESDETAIL sd ON s.transNo = sd.transNo
    WHERE sd.prodCode = NEW.prodCode;

    IF v_latest_sale IS NOT NULL AND NEW.effDate <= v_latest_sale THEN
        RAISE EXCEPTION 'Cannot insert or alter price on %: sales already exist on % for product %',
            NEW.effDate, v_latest_sale, NEW.prodCode;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_pricehist_backdate ON PRICEHIST;
CREATE TRIGGER trg_check_pricehist_backdate
BEFORE INSERT OR UPDATE ON PRICEHIST
FOR EACH ROW EXECUTE FUNCTION fn_prevent_backdated_price();

-- 2. Trigger: Prevent Backdated Job History that would alter past sales attribution
CREATE OR REPLACE FUNCTION fn_prevent_backdated_jobhistory()
RETURNS TRIGGER AS $$
DECLARE
    v_latest_sale DATE;
BEGIN
    SELECT MAX(salesDate) INTO v_latest_sale
    FROM SALES
    WHERE empNo = NEW.empNo;

    IF v_latest_sale IS NOT NULL AND NEW.effDate <= v_latest_sale THEN
        RAISE EXCEPTION 'Cannot insert or alter job assignment on %: employee has recorded sales through %',
            NEW.effDate, v_latest_sale;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_jobhistory_backdate ON JOBHISTORY;
CREATE TRIGGER trg_check_jobhistory_backdate
BEFORE INSERT OR UPDATE ON JOBHISTORY
FOR EACH ROW EXECUTE FUNCTION fn_prevent_backdated_jobhistory();

-- 3. Trigger: Prevent Overpayment and Race Conditions on PAYMENT
CREATE OR REPLACE FUNCTION fn_check_payment_amount()
RETURNS TRIGGER AS $$
DECLARE
    v_total_due NUMERIC(12, 2);
    v_total_paid NUMERIC(12, 2);
    v_balance NUMERIC(12, 2);
BEGIN
    -- Lock parent sale row to prevent concurrent race conditions
    PERFORM transNo FROM SALES WHERE transNo = NEW.transNo FOR UPDATE;

    -- Compute total invoiced amount for this sale
    SELECT COALESCE(SUM(sd.quantity * ph.unitPrice), 0.00) INTO v_total_due
    FROM SALESDETAIL sd
    JOIN SALES s ON s.transNo = sd.transNo
    CROSS JOIN LATERAL (
        SELECT unitPrice FROM PRICEHIST
        WHERE prodCode = sd.prodCode AND effDate <= s.salesDate
        ORDER BY effDate DESC LIMIT 1
    ) ph
    WHERE sd.transNo = NEW.transNo;

    -- Compute existing payments
    SELECT COALESCE(SUM(amount), 0.00) INTO v_total_paid
    FROM PAYMENT
    WHERE transNo = NEW.transNo;

    v_balance := v_total_due - v_total_paid;

    IF NEW.amount > v_balance THEN
        RAISE EXCEPTION 'Payment of % exceeds remaining balance of % on transaction %', 
            NEW.amount, v_balance, NEW.transNo;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_payment ON PAYMENT;
CREATE TRIGGER trg_validate_payment
BEFORE INSERT ON PAYMENT
FOR EACH ROW EXECUTE FUNCTION fn_check_payment_amount();

-- 4. Atomic Transaction Stored Procedure: create_sale
CREATE OR REPLACE FUNCTION create_sale(
    p_trans_no INT,
    p_sales_date DATE,
    p_cust_no INT,
    p_emp_no INT,
    p_items JSONB -- e.g. '[{"prodCode": "CPU-R5-5600", "quantity": 2}]'
) RETURNS JSONB AS $$
DECLARE
    v_item RECORD;
    v_emp_hire DATE;
    v_emp_sep DATE;
    v_price_exists BOOLEAN;
BEGIN
    -- Verify employee eligibility on sale date
    SELECT hireDate, sepDate INTO v_emp_hire, v_emp_sep
    FROM EMPLOYEE WHERE empNo = p_emp_no;

    IF v_emp_hire IS NULL THEN
        RAISE EXCEPTION 'Employee % does not exist', p_emp_no;
    END IF;

    IF v_emp_hire > p_sales_date OR (v_emp_sep IS NOT NULL AND v_emp_sep < p_sales_date) THEN
        RAISE EXCEPTION 'Employee % was not active on transaction date %', p_emp_no, p_sales_date;
    END IF;

    -- Validate items array is not empty
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'A sale must contain at least one line item';
    END IF;

    -- Insert parent sale
    INSERT INTO SALES (transNo, salesDate, custNo, empNo)
    VALUES (p_trans_no, p_sales_date, p_cust_no, p_emp_no);

    -- Insert all line items atomically
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(prodCode VARCHAR(20), quantity INT)
    LOOP
        -- Verify that a valid price existed on or before salesDate
        SELECT EXISTS (
            SELECT 1 FROM PRICEHIST 
            WHERE prodCode = v_item.prodCode AND effDate <= p_sales_date
        ) INTO v_price_exists;

        IF NOT v_price_exists THEN
            RAISE EXCEPTION 'No effective price found for product % on date %', v_item.prodCode, p_sales_date;
        END IF;

        INSERT INTO SALESDETAIL (transNo, prodCode, quantity)
        VALUES (p_trans_no, v_item.prodCode, v_item.quantity);
    END LOOP;

    RETURN jsonb_build_object('success', true, 'transNo', p_trans_no);
END;
$$ LANGUAGE plpgsql;
