-- ========================================================================
-- HOPE Group4: EMPLOYEE RLS POLICIES AND SAFE VIEWS
-- File: database/12_employee_policies_and_views.sql
-- Satisfies Sections: 5, 11.3, 11.4
-- Note: Safe to re-run. Do NOT execute automatically; run in Supabase SQL editor.
-- ========================================================================

-- 1. Enable Row-Level Security
ALTER TABLE "EMPLOYEE" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JOBHISTORY" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JOB" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DEPARTMENT" ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to remain idempotent
DROP POLICY IF EXISTS p_employee_admin_all ON "EMPLOYEE";
DROP POLICY IF EXISTS p_jobhistory_admin_all ON "JOBHISTORY";
DROP POLICY IF EXISTS p_job_select_auth ON "JOB";
DROP POLICY IF EXISTS p_job_admin_write ON "JOB";
DROP POLICY IF EXISTS p_department_select_auth ON "DEPARTMENT";
DROP POLICY IF EXISTS p_department_admin_write ON "DEPARTMENT";

-- Helper policy expression: only admin can read/write EMPLOYEE and JOBHISTORY
CREATE POLICY p_employee_admin_all ON "EMPLOYEE"
    FOR ALL
    TO authenticated
    USING (
        COALESCE(
            current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role',
            current_setting('request.jwt.claim.role', true),
            ''
        ) = 'admin'
    )
    WITH CHECK (
        COALESCE(
            current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role',
            current_setting('request.jwt.claim.role', true),
            ''
        ) = 'admin'
    );

CREATE POLICY p_jobhistory_admin_all ON "JOBHISTORY"
    FOR ALL
    TO authenticated
    USING (
        COALESCE(
            current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role',
            current_setting('request.jwt.claim.role', true),
            ''
        ) = 'admin'
    )
    WITH CHECK (
        COALESCE(
            current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role',
            current_setting('request.jwt.claim.role', true),
            ''
        ) = 'admin'
    );

-- JOB & DEPARTMENT: authenticated users can read; only admin can insert/update
CREATE POLICY p_job_select_auth ON "JOB"
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY p_job_admin_write ON "JOB"
    FOR ALL
    TO authenticated
    USING (
        COALESCE(
            current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role',
            current_setting('request.jwt.claim.role', true),
            ''
        ) = 'admin'
    )
    WITH CHECK (
        COALESCE(
            current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role',
            current_setting('request.jwt.claim.role', true),
            ''
        ) = 'admin'
    );

CREATE POLICY p_department_select_auth ON "DEPARTMENT"
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY p_department_admin_write ON "DEPARTMENT"
    FOR ALL
    TO authenticated
    USING (
        COALESCE(
            current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role',
            current_setting('request.jwt.claim.role', true),
            ''
        ) = 'admin'
    )
    WITH CHECK (
        COALESCE(
            current_setting('request.jwt.claims', true)::json->'app_metadata'->>'role',
            current_setting('request.jwt.claim.role', true),
            ''
        ) = 'admin'
    );

-- 3. Revoke all privileges from anon role on these tables
REVOKE ALL ON "EMPLOYEE" FROM anon;
REVOKE ALL ON "JOBHISTORY" FROM anon;
REVOKE ALL ON "JOB" FROM anon;
REVOKE ALL ON "DEPARTMENT" FROM anon;

-- 4. Safe views for other modules (Section 11.4)
-- These views intentionally run with definition owner permissions so Sales & Payments
-- can access sales rep names and department assignments without exposing salary, birthDate, or gender.
DROP VIEW IF EXISTS v_employee_directory CASCADE;
CREATE VIEW v_employee_directory AS
SELECT 
    empNo,
    lastName,
    firstName,
    hireDate,
    sepDate
FROM "EMPLOYEE";

DROP VIEW IF EXISTS v_employee_assignments CASCADE;
CREATE VIEW v_employee_assignments AS
SELECT 
    empNo,
    jobCode,
    effDate,
    deptCode
FROM "JOBHISTORY";

-- Revoke safe views from anon, grant to authenticated
REVOKE ALL ON v_employee_directory FROM anon, PUBLIC;
REVOKE ALL ON v_employee_assignments FROM anon, PUBLIC;
GRANT SELECT ON v_employee_directory TO authenticated;
GRANT SELECT ON v_employee_assignments TO authenticated;

-- 5. Complete Employee Current Status View (used by admin directory)
DROP VIEW IF EXISTS v_employee_current_status CASCADE;
CREATE VIEW v_employee_current_status WITH (security_invoker = true) AS
SELECT 
    e.empNo,
    e.lastName,
    e.firstName,
    e.firstName || ' ' || e.lastName AS fullName,
    e.gender,
    e.birthDate,
    e.hireDate,
    e.sepDate,
    CASE 
        WHEN e.sepDate IS NOT NULL AND e.sepDate <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE THEN 'Separated'
        ELSE 'Active'
    END AS employmentStatus,
    CASE 
        WHEN e.sepDate IS NOT NULL THEN (e.sepDate - e.hireDate)::INT
        ELSE ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE - e.hireDate)::INT
    END AS tenureDays,
    cur.jobCode,
    j.jobDesc,
    cur.deptCode,
    d.deptName,
    cur.salary,
    cur.effDate AS currentJobEffDate
FROM "EMPLOYEE" e
LEFT JOIN LATERAL (
    SELECT jh.jobCode, jh.deptCode, jh.salary, jh.effDate
    FROM "JOBHISTORY" jh
    WHERE jh.empNo = e.empNo
      AND jh.effDate <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE
    ORDER BY jh.effDate DESC
    LIMIT 1
) cur ON true
LEFT JOIN "JOB" j ON j.jobCode = cur.jobCode
LEFT JOIN "DEPARTMENT" d ON d.deptCode = cur.deptCode;

REVOKE ALL ON v_employee_current_status FROM anon, PUBLIC;
GRANT SELECT ON v_employee_current_status TO authenticated;
