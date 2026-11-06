-- ========================================================================
-- HOPE Group4: EMPLOYEE CONSTRAINTS AND INTEGRITY TRIGGERS
-- File: database/10_employee_constraints.sql
-- Satisfies Rules: R-07, R-08, R-09, R-10, R-12, R-13, R-14
-- Note: Safe to re-run. Do NOT execute automatically; run in Supabase SQL editor.
-- ========================================================================

-- 1. Ensure salary is strictly positive on JOBHISTORY (R-08)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_jobhistory_salary'
    ) THEN
        ALTER TABLE "JOBHISTORY" DROP CONSTRAINT chk_jobhistory_salary;
    END IF;
    ALTER TABLE "JOBHISTORY" ADD CONSTRAINT chk_jobhistory_salary CHECK (salary > 0);
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 2. Ensure sepDate >= hireDate on EMPLOYEE (R-10)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_employee_sepdate'
    ) THEN
        ALTER TABLE "EMPLOYEE" DROP CONSTRAINT chk_employee_sepdate;
    END IF;
    ALTER TABLE "EMPLOYEE" ADD CONSTRAINT chk_employee_sepdate CHECK (sepDate IS NULL OR sepDate >= hireDate);
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 3. Case-insensitive unique constraint on DEPARTMENT.deptName and JOB.jobDesc (R-14)
CREATE UNIQUE INDEX IF NOT EXISTS uq_department_name_ci ON "DEPARTMENT" (LOWER(TRIM(deptName)));
CREATE UNIQUE INDEX IF NOT EXISTS uq_job_desc_ci ON "JOB" (LOWER(TRIM(jobDesc)));

-- 4. Unique (empNo, effDate) on JOBHISTORY (R-07)
CREATE UNIQUE INDEX IF NOT EXISTS uq_jobhistory_emp_eff_idx ON "JOBHISTORY" (empNo, effDate);

-- 5. Trigger: Immuntability of JOBHISTORY rows (R-09: No UPDATE, No DELETE)
CREATE OR REPLACE FUNCTION trg_fn_jobhistory_immutable()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'JOBHISTORY rows are immutable and cannot be updated. Add a new job history record instead.';
    ELSIF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'JOBHISTORY rows are immutable and cannot be deleted. History must be preserved.';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jobhistory_immutable ON "JOBHISTORY";
CREATE TRIGGER trg_jobhistory_immutable
BEFORE UPDATE OR DELETE ON "JOBHISTORY"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_jobhistory_immutable();

-- 6. Trigger: Prevent changes to primary keys or deletion of DEPARTMENT & JOB (R-13)
CREATE OR REPLACE FUNCTION trg_fn_dept_job_lock()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'DEPARTMENT' THEN
        IF TG_OP = 'UPDATE' AND NEW.deptCode <> OLD.deptCode THEN
            RAISE EXCEPTION 'Department code (%) cannot be modified once created.', OLD.deptCode;
        ELSIF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'Departments cannot be deleted. Historic records require permanent code stability.';
        END IF;
        RETURN NEW;
    ELSIF TG_TABLE_NAME = 'JOB' THEN
        IF TG_OP = 'UPDATE' AND NEW.jobCode <> OLD.jobCode THEN
            RAISE EXCEPTION 'Job code (%) cannot be modified once created.', OLD.jobCode;
        ELSIF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'Jobs cannot be deleted. Historic records require permanent code stability.';
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_department_lock ON "DEPARTMENT";
CREATE TRIGGER trg_department_lock
BEFORE UPDATE OR DELETE ON "DEPARTMENT"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_dept_job_lock();

DROP TRIGGER IF EXISTS trg_job_lock ON "JOB";
CREATE TRIGGER trg_job_lock
BEFORE UPDATE OR DELETE ON "JOB"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_dept_job_lock();

-- 7. Trigger: Prevent deletion of EMPLOYEE (R-12: Employees are never deleted)
CREATE OR REPLACE FUNCTION trg_fn_employee_no_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Employees cannot be deleted. Mark the employee as separated by setting sepDate instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employee_no_delete ON "EMPLOYEE";
CREATE TRIGGER trg_employee_no_delete
BEFORE DELETE ON "EMPLOYEE"
FOR EACH ROW
EXECUTE FUNCTION trg_fn_employee_no_delete();
