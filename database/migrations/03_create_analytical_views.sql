-- ========================================================================
-- HOPE Group4: SQL ANALYTICAL VIEWS
-- All views defined WITH (security_invoker = true) for RLS compliance.
-- Handles point-in-time pricing, historical department resolution,
-- overdue days parsed from payTerms, and product sales analytics.
-- ========================================================================

-- View 1: Point-in-time unit price resolution per line item
CREATE OR REPLACE VIEW v_sales_details_priced 
WITH (security_invoker = true) AS
SELECT 
    sd.transNo,
    s.salesDate,
    sd.prodCode,
    p.description AS productDescription,
    p.unit,
    sd.quantity,
    ph.effDate AS priceEffDate,
    ph.unitPrice,
    (sd.quantity * ph.unitPrice) AS lineTotal
FROM SALESDETAIL sd
JOIN SALES s ON s.transNo = sd.transNo
JOIN PRODUCT p ON p.prodCode = sd.prodCode
CROSS JOIN LATERAL (
    SELECT effDate, unitPrice
    FROM PRICEHIST
    WHERE prodCode = sd.prodCode
      AND effDate <= s.salesDate
    ORDER BY effDate DESC
    LIMIT 1
) ph;

-- View 2: Point-in-time employee department assignment
CREATE OR REPLACE VIEW v_sales_with_dept 
WITH (security_invoker = true) AS
SELECT 
    s.transNo,
    s.salesDate,
    s.custNo,
    s.empNo,
    e.firstName || ' ' || e.lastName AS empName,
    jh.effDate AS jobEffDate,
    jh.deptCode,
    d.deptName,
    jh.jobCode,
    j.jobDesc
FROM SALES s
JOIN EMPLOYEE e ON e.empNo = s.empNo
CROSS JOIN LATERAL (
    SELECT effDate, deptCode, jobCode
    FROM JOBHISTORY
    WHERE empNo = s.empNo
      AND effDate <= s.salesDate
    ORDER BY effDate DESC
    LIMIT 1
) jh
JOIN DEPARTMENT d ON d.deptCode = jh.deptCode
JOIN JOB j ON j.jobCode = jh.jobCode;

-- View 3: Master Sales Summary Ledger with Overdue Engine
CREATE OR REPLACE VIEW v_sales_summary 
WITH (security_invoker = true) AS
SELECT 
    s.transNo,
    s.salesDate,
    c.custNo,
    c.custName,
    c.address AS custAddress,
    c.payTerms,
    CASE 
        WHEN c.payTerms = 'NET 15' THEN 15
        WHEN c.payTerms = 'NET 30' THEN 30
        WHEN c.payTerms = 'NET 60' THEN 60
        ELSE 0 -- COD
    END AS termDays,
    (s.salesDate + (CASE 
        WHEN c.payTerms = 'NET 15' THEN 15
        WHEN c.payTerms = 'NET 30' THEN 30
        WHEN c.payTerms = 'NET 60' THEN 60
        ELSE 0 
    END)) AS dueDate,
    vd.empNo,
    vd.empName,
    vd.deptCode,
    vd.deptName,
    vd.jobDesc,
    COALESCE(SUM(vsd.lineTotal), 0.00) AS totalAmount,
    COALESCE(pay.totalPaid, 0.00) AS totalPaid,
    (COALESCE(SUM(vsd.lineTotal), 0.00) - COALESCE(pay.totalPaid, 0.00)) AS balance,
    CASE 
        WHEN COALESCE(SUM(vsd.lineTotal), 0.00) = 0 THEN 'NO_ITEMS'
        WHEN COALESCE(pay.totalPaid, 0.00) >= COALESCE(SUM(vsd.lineTotal), 0.00) THEN 'PAID'
        WHEN (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE > (s.salesDate + (CASE 
            WHEN c.payTerms = 'NET 15' THEN 15
            WHEN c.payTerms = 'NET 30' THEN 30
            WHEN c.payTerms = 'NET 60' THEN 60
            ELSE 0 
        END)) THEN 'OVERDUE'
        WHEN COALESCE(pay.totalPaid, 0.00) > 0 THEN 'PARTIAL'
        ELSE 'UNPAID'
    END AS paymentStatus,
    CASE 
        WHEN (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE > (s.salesDate + (CASE 
            WHEN c.payTerms = 'NET 15' THEN 15
            WHEN c.payTerms = 'NET 30' THEN 30
            WHEN c.payTerms = 'NET 60' THEN 60
            ELSE 0 
        END)) AND (COALESCE(SUM(vsd.lineTotal), 0.00) - COALESCE(pay.totalPaid, 0.00)) > 0
        THEN ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE - (s.salesDate + (CASE 
            WHEN c.payTerms = 'NET 15' THEN 15
            WHEN c.payTerms = 'NET 30' THEN 30
            WHEN c.payTerms = 'NET 60' THEN 60
            ELSE 0 
        END)))
        ELSE 0
    END AS daysOverdue
FROM SALES s
JOIN CUSTOMER c ON c.custNo = s.custNo
JOIN v_sales_with_dept vd ON vd.transNo = s.transNo
LEFT JOIN v_sales_details_priced vsd ON vsd.transNo = s.transNo
LEFT JOIN (
    SELECT transNo, SUM(amount) AS totalPaid
    FROM PAYMENT
    GROUP BY transNo
) pay ON pay.transNo = s.transNo
GROUP BY 
    s.transNo, s.salesDate, c.custNo, c.custName, c.address, c.payTerms,
    vd.empNo, vd.empName, vd.deptCode, vd.deptName, vd.jobDesc, pay.totalPaid;

-- View 4: Customer Accounts Receivable
CREATE OR REPLACE VIEW v_customer_receivables 
WITH (security_invoker = true) AS
SELECT 
    c.custNo,
    c.custName,
    c.address,
    c.payTerms,
    COUNT(DISTINCT s.transNo) AS totalTransactions,
    COALESCE(SUM(ss.totalAmount), 0.00) AS totalBilled,
    COALESCE(SUM(ss.totalPaid), 0.00) AS totalCollected,
    COALESCE(SUM(ss.balance), 0.00) AS outstandingBalance,
    COUNT(CASE WHEN ss.paymentStatus = 'OVERDUE' THEN 1 END) AS overdueCount
FROM CUSTOMER c
LEFT JOIN v_sales_summary ss ON ss.custNo = c.custNo
LEFT JOIN SALES s ON s.transNo = ss.transNo
GROUP BY c.custNo, c.custName, c.address, c.payTerms;

-- View 5: Department Sales Contribution
CREATE OR REPLACE VIEW v_department_sales_performance 
WITH (security_invoker = true) AS
SELECT 
    d.deptCode,
    d.deptName,
    COUNT(DISTINCT ss.transNo) AS transactionCount,
    COALESCE(SUM(ss.totalAmount), 0.00) AS totalRevenueGenerated,
    COALESCE(SUM(ss.totalPaid), 0.00) AS totalCollected
FROM DEPARTMENT d
LEFT JOIN v_sales_summary ss ON ss.deptCode = d.deptCode
GROUP BY d.deptCode, d.deptName;

-- View 6: Employee Status with corrected Tenure & Active Salary
CREATE OR REPLACE VIEW v_employee_current_status 
WITH (security_invoker = true) AS
SELECT 
    e.empNo,
    e.firstName || ' ' || e.lastName AS fullName,
    e.gender,
    e.hireDate,
    e.sepDate,
    CASE 
        WHEN e.sepDate IS NOT NULL AND e.sepDate <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE THEN 'Separated'
        ELSE 'Active'
    END AS employmentStatus,
    CASE 
        WHEN e.sepDate IS NOT NULL THEN (e.sepDate - e.hireDate)
        ELSE ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE - e.hireDate)
    END AS tenureDays,
    jh.jobCode,
    j.jobDesc,
    jh.deptCode,
    d.deptName,
    jh.salary,
    jh.effDate AS currentJobEffDate
FROM EMPLOYEE e
LEFT JOIN LATERAL (
    SELECT jobCode, deptCode, salary, effDate
    FROM JOBHISTORY
    WHERE empNo = e.empNo 
      AND effDate <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE
    ORDER BY effDate DESC
    LIMIT 1
) jh ON true
LEFT JOIN JOB j ON j.jobCode = jh.jobCode
LEFT JOIN DEPARTMENT d ON d.deptCode = jh.deptCode;

-- View 7: Product Catalog Analytics (Units Sold, Revenue, Price Trends)
CREATE OR REPLACE VIEW v_product_sales_analytics
WITH (security_invoker = true) AS
SELECT 
    p.prodCode,
    p.description,
    p.unit,
    curr_ph.unitPrice AS currentPrice,
    curr_ph.effDate AS currentPriceEffDate,
    prev_ph.unitPrice AS previousPrice,
    CASE 
        WHEN prev_ph.unitPrice IS NULL THEN 'STABLE'
        WHEN curr_ph.unitPrice > prev_ph.unitPrice THEN 'UP'
        WHEN curr_ph.unitPrice < prev_ph.unitPrice THEN 'DOWN'
        ELSE 'STABLE'
    END AS priceTrend,
    COALESCE(sales_agg.totalUnitsSold, 0) AS totalUnitsSold,
    COALESCE(sales_agg.totalRevenue, 0.00) AS totalRevenue
FROM PRODUCT p
CROSS JOIN LATERAL (
    SELECT unitPrice, effDate
    FROM PRICEHIST 
    WHERE prodCode = p.prodCode 
      AND effDate <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE
    ORDER BY effDate DESC 
    LIMIT 1
) curr_ph
LEFT JOIN LATERAL (
    SELECT unitPrice
    FROM PRICEHIST 
    WHERE prodCode = p.prodCode 
      AND effDate < curr_ph.effDate
    ORDER BY effDate DESC 
    LIMIT 1
) prev_ph ON true
LEFT JOIN (
    SELECT 
        vsd.prodCode,
        SUM(vsd.quantity) AS totalUnitsSold,
        SUM(vsd.lineTotal) AS totalRevenue
    FROM v_sales_details_priced vsd
    GROUP BY vsd.prodCode
) sales_agg ON sales_agg.prodCode = p.prodCode;
