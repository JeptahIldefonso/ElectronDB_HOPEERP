-- ========================================================================
-- HOPE Group4: EMPLOYEE STORED PROCEDURES & MUTATION FUNCTIONS
-- File: database/11_employee_functions.sql
-- Satisfies Rules: R-01, R-02, R-03, R-04, R-05, R-06, R-08, R-10, R-11
-- Note: Safe to re-run. Do NOT execute automatically; run in Supabase SQL editor.
-- ========================================================================

-- Helper: Verify admin role from JWT app_metadata
CREATE OR REPLACE FUNCTION _check_is_admin()
RETURNS VOID AS $$
DECLARE
    v_role TEXT;
BEGIN
    v_role := COALESCE(
        current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role',
        current_setting('request.jwt.claim.role', true),
        ''
    );
    IF v_role <> 'admin' THEN
        RAISE EXCEPTION 'Access denied. Administrator privileges required.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. create_employee
-- Atomically creates an EMPLOYEE and their first JOBHISTORY row
CREATE OR REPLACE FUNCTION create_employee(
    p_last_name VARCHAR(50),
    p_first_name VARCHAR(50),
    p_gender CHAR(1),
    p_birth_date DATE,
    p_hire_date DATE,
    p_job_code VARCHAR(10),
    p_dept_code VARCHAR(10),
    p_salary NUMERIC(12, 2),
    p_eff_date DATE DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
    v_next_emp_no INT;
    v_eff_date DATE;
    v_manila_today DATE;
BEGIN
    PERFORM _check_is_admin();

    v_manila_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE;
    v_eff_date := COALESCE(p_eff_date, p_hire_date);

    -- Input validation
    IF TRIM(p_last_name) = '' OR TRIM(p_first_name) = '' THEN
        RAISE EXCEPTION 'First name and last name are required.';
    END IF;

    IF UPPER(p_gender) NOT IN ('M', 'F') THEN
        RAISE EXCEPTION 'Gender must be M or F.';
    END IF;

    IF p_hire_date > v_manila_today THEN
        RAISE EXCEPTION 'Hire date cannot be in the future.';
    END IF;

    -- R-03: Birth date must be at least 18 years before hire date
    IF p_birth_date > (p_hire_date - INTERVAL '18 years')::DATE THEN
        RAISE EXCEPTION 'Employee must be at least 18 years old on hire date.';
    END IF;

    -- R-01: First job record effDate cannot be earlier than hireDate
    IF v_eff_date < p_hire_date THEN
        RAISE EXCEPTION 'Initial effective date (%) cannot be earlier than hire date (%).', v_eff_date, p_hire_date;
    END IF;

    IF v_eff_date > v_manila_today THEN
        RAISE EXCEPTION 'Initial effective date cannot be in the future.';
    END IF;

    -- R-08: Salary > 0
    IF p_salary <= 0 THEN
        RAISE EXCEPTION 'Salary must be greater than zero.';
    END IF;

    -- Validate foreign keys
    IF NOT EXISTS (SELECT 1 FROM "JOB" WHERE jobCode = p_job_code) THEN
        RAISE EXCEPTION 'Job code % does not exist.', p_job_code;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "DEPARTMENT" WHERE deptCode = p_dept_code) THEN
        RAISE EXCEPTION 'Department code % does not exist.', p_dept_code;
    END IF;

    -- R-02: Next empNo sequence
    SELECT COALESCE(MAX(empNo), 100) + 1 INTO v_next_emp_no FROM "EMPLOYEE";

    -- Insert EMPLOYEE
    INSERT INTO "EMPLOYEE" (empNo, lastName, firstName, gender, birthDate, hireDate, sepDate)
    VALUES (v_next_emp_no, TRIM(p_last_name), TRIM(p_first_name), UPPER(p_gender), p_birth_date, p_hire_date, NULL);

    -- Insert first JOBHISTORY
    INSERT INTO "JOBHISTORY" (empNo, jobCode, effDate, salary, deptCode)
    VALUES (v_next_emp_no, p_job_code, v_eff_date, p_salary, p_dept_code);

    RETURN v_next_emp_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. add_job_record
-- Adds a promotion, transfer, or salary adjustment
CREATE OR REPLACE FUNCTION add_job_record(
    p_emp_no INT,
    p_job_code VARCHAR(10),
    p_dept_code VARCHAR(10),
    p_eff_date DATE,
    p_salary NUMERIC(12, 2)
)
RETURNS VOID AS $$
DECLARE
    v_sep_date DATE;
    v_hire_date DATE;
    v_latest_eff_date DATE;
    v_latest_sale_date DATE;
    v_manila_today DATE;
BEGIN
    PERFORM _check_is_admin();

    v_manila_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE;

    -- Lock employee row
    SELECT hireDate, sepDate INTO v_hire_date, v_sep_date
    FROM "EMPLOYEE"
    WHERE empNo = p_emp_no
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee % not found.', p_emp_no;
    END IF;

    -- R-11: Separated employees cannot receive new job records
    IF v_sep_date IS NOT NULL THEN
        RAISE EXCEPTION 'Employee % is separated and cannot receive new job records.', p_emp_no;
    END IF;

    -- Future date check
    IF p_eff_date > v_manila_today THEN
        RAISE EXCEPTION 'Effective date cannot be in the future.';
    END IF;

    -- R-08: Salary > 0
    IF p_salary <= 0 THEN
        RAISE EXCEPTION 'Salary must be greater than zero.';
    END IF;

    -- R-05: Effective date must be strictly later than latest existing effDate
    SELECT MAX(effDate) INTO v_latest_eff_date
    FROM "JOBHISTORY"
    WHERE empNo = p_emp_no;

    IF v_latest_eff_date IS NOT NULL AND p_eff_date <= v_latest_eff_date THEN
        RAISE EXCEPTION 'The effective date must be after the latest record (%).', v_latest_eff_date;
    END IF;

    -- R-06: Effective date must be strictly later than latest sale date
    SELECT MAX(salesDate) INTO v_latest_sale_date
    FROM "SALES"
    WHERE empNo = p_emp_no;

    IF v_latest_sale_date IS NOT NULL AND p_eff_date <= v_latest_sale_date THEN
        RAISE EXCEPTION 'This employee has sales dated %. The effective date must be after it, so past sales keep their original department.', v_latest_sale_date;
    END IF;

    -- Check FKs
    IF NOT EXISTS (SELECT 1 FROM "JOB" WHERE jobCode = p_job_code) THEN
        RAISE EXCEPTION 'Job code % does not exist.', p_job_code;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM "DEPARTMENT" WHERE deptCode = p_dept_code) THEN
        RAISE EXCEPTION 'Department code % does not exist.', p_dept_code;
    END IF;

    -- Insert new JOBHISTORY record
    INSERT INTO "JOBHISTORY" (empNo, jobCode, effDate, salary, deptCode)
    VALUES (p_emp_no, p_job_code, p_eff_date, p_salary, p_dept_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. update_employee
-- Updates the 5 personal fields of an employee
CREATE OR REPLACE FUNCTION update_employee(
    p_emp_no INT,
    p_last_name VARCHAR(50),
    p_first_name VARCHAR(50),
    p_gender CHAR(1),
    p_birth_date DATE,
    p_hire_date DATE
)
RETURNS VOID AS $$
DECLARE
    v_earliest_eff_date DATE;
    v_earliest_sale_date DATE;
    v_manila_today DATE;
    v_sep_date DATE;
BEGIN
    PERFORM _check_is_admin();

    v_manila_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE;

    SELECT sepDate INTO v_sep_date
    FROM "EMPLOYEE"
    WHERE empNo = p_emp_no
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee % not found.', p_emp_no;
    END IF;

    IF TRIM(p_last_name) = '' OR TRIM(p_first_name) = '' THEN
        RAISE EXCEPTION 'First name and last name are required.';
    END IF;

    IF UPPER(p_gender) NOT IN ('M', 'F') THEN
        RAISE EXCEPTION 'Gender must be M or F.';
    END IF;

    IF p_hire_date > v_manila_today THEN
        RAISE EXCEPTION 'Hire date cannot be in the future.';
    END IF;

    -- R-03: Age >= 18 on hire date
    IF p_birth_date > (p_hire_date - INTERVAL '18 years')::DATE THEN
        RAISE EXCEPTION 'Employee must be at least 18 years old on hire date.';
    END IF;

    -- R-04: hireDate cannot be moved later than earliest job record or earliest sale
    SELECT MIN(effDate) INTO v_earliest_eff_date
    FROM "JOBHISTORY"
    WHERE empNo = p_emp_no;

    IF v_earliest_eff_date IS NOT NULL AND p_hire_date > v_earliest_eff_date THEN
        RAISE EXCEPTION 'Hire date cannot be later than earliest job history record (%).', v_earliest_eff_date;
    END IF;

    SELECT MIN(salesDate) INTO v_earliest_sale_date
    FROM "SALES"
    WHERE empNo = p_emp_no;

    IF v_earliest_sale_date IS NOT NULL AND p_hire_date > v_earliest_sale_date THEN
        RAISE EXCEPTION 'Hire date cannot be later than earliest recorded sale (%).', v_earliest_sale_date;
    END IF;

    IF v_sep_date IS NOT NULL AND p_hire_date > v_sep_date THEN
        RAISE EXCEPTION 'Hire date cannot be later than separation date (%).', v_sep_date;
    END IF;

    UPDATE "EMPLOYEE"
    SET lastName = TRIM(p_last_name),
        firstName = TRIM(p_first_name),
        gender = UPPER(p_gender),
        birthDate = p_birth_date,
        hireDate = p_hire_date
    WHERE empNo = p_emp_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. separate_employee
-- Sets the separation date for an employee (R-10)
CREATE OR REPLACE FUNCTION separate_employee(
    p_emp_no INT,
    p_sep_date DATE
)
RETURNS VOID AS $$
DECLARE
    v_hire_date DATE;
    v_latest_eff_date DATE;
    v_latest_sale_date DATE;
    v_manila_today DATE;
    v_current_sep_date DATE;
BEGIN
    PERFORM _check_is_admin();

    v_manila_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE;

    SELECT hireDate, sepDate INTO v_hire_date, v_current_sep_date
    FROM "EMPLOYEE"
    WHERE empNo = p_emp_no
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee % not found.', p_emp_no;
    END IF;

    IF v_current_sep_date IS NOT NULL THEN
        RAISE EXCEPTION 'Employee % is already separated on %.', p_emp_no, v_current_sep_date;
    END IF;

    IF p_sep_date > v_manila_today THEN
        RAISE EXCEPTION 'Separation date cannot be in the future.';
    END IF;

    -- R-10: sepDate cannot be before hireDate, latest effDate or latest sale date
    IF p_sep_date < v_hire_date THEN
        RAISE EXCEPTION 'The separation date cannot be earlier than hire date (%).', v_hire_date;
    END IF;

    SELECT MAX(effDate) INTO v_latest_eff_date
    FROM "JOBHISTORY"
    WHERE empNo = p_emp_no;

    IF v_latest_eff_date IS NOT NULL AND p_sep_date < v_latest_eff_date THEN
        RAISE EXCEPTION 'The separation date cannot be earlier than latest job record (%).', v_latest_eff_date;
    END IF;

    SELECT MAX(salesDate) INTO v_latest_sale_date
    FROM "SALES"
    WHERE empNo = p_emp_no;

    IF v_latest_sale_date IS NOT NULL AND p_sep_date < v_latest_sale_date THEN
        RAISE EXCEPTION 'The separation date cannot be earlier than % (employee has sales recorded on this date).', v_latest_sale_date;
    END IF;

    UPDATE "EMPLOYEE"
    SET sepDate = p_sep_date
    WHERE empNo = p_emp_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke permissions from public and anon, grant to authenticated
REVOKE EXECUTE ON FUNCTION _check_is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION create_employee(VARCHAR, VARCHAR, CHAR, DATE, DATE, VARCHAR, VARCHAR, NUMERIC, DATE) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION add_job_record(INT, VARCHAR, VARCHAR, DATE, NUMERIC) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION update_employee(INT, VARCHAR, VARCHAR, CHAR, DATE, DATE) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION separate_employee(INT, DATE) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION create_employee(VARCHAR, VARCHAR, CHAR, DATE, DATE, VARCHAR, VARCHAR, NUMERIC, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION add_job_record(INT, VARCHAR, VARCHAR, DATE, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION update_employee(INT, VARCHAR, VARCHAR, CHAR, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION separate_employee(INT, DATE) TO authenticated;
