-- ========================================================================
-- HOPE Group4: OVERVIEW DASHBOARD PERIOD ANALYTICS (09_overview_period_analytics.sql)
-- Reference SQL queries used by the Overview Dashboard widgets.
-- DO NOT RUN AUTOMATICALLY: Reference implementation of analytical queries.
-- Adheres strictly to the 10-table canonical schema without schema alterations.
-- ========================================================================

-- ------------------------------------------------------------------------
-- 1. KPI Queries by Period (Current vs Previous Equivalent Duration)
-- ------------------------------------------------------------------------

-- Example: Period Oct 1 - Oct 27, 2026 (27 days)
-- Previous equivalent period: Sep 1 - Sep 27, 2026 (27 days)

-- KPI 1: Total Sales in Period (Point-in-time pricing)
/*
SELECT 
    COALESCE(SUM(sd.quantity * ph.unitPrice), 0.00) AS total_sales
FROM SALES s
JOIN SALESDETAIL sd ON sd.transNo = s.transNo
CROSS JOIN LATERAL (
    SELECT unitPrice
    FROM PRICEHIST
    WHERE prodCode = sd.prodCode AND effDate <= s.salesDate
    ORDER BY effDate DESC
    LIMIT 1
) ph
WHERE s.salesDate >= :start_date AND s.salesDate <= :end_date;
*/

-- KPI 2: Payments Received in Period
/*
SELECT 
    COALESCE(SUM(amount), 0.00) AS total_payments
FROM PAYMENT
WHERE payDate >= :start_date AND payDate <= :end_date;
*/

-- KPI 3: Number of Sales in Period
/*
SELECT 
    COUNT(transNo) AS sales_count
FROM SALES
WHERE salesDate >= :start_date AND salesDate <= :end_date;
*/

-- KPI 4: Active Customers (distinct customers with >= 1 sale in period)
/*
SELECT 
    COUNT(DISTINCT custNo) AS active_customers_count
FROM SALES
WHERE salesDate >= :start_date AND salesDate <= :end_date;
*/

-- ------------------------------------------------------------------------
-- 2. Grouped 6-Month Monthly Trend (Total Sales & Payments Received)
-- ------------------------------------------------------------------------
/*
WITH months AS (
    SELECT generate_series(
        date_trunc('month', CURRENT_DATE - INTERVAL '5 months'),
        date_trunc('month', CURRENT_DATE),
        '1 month'::interval
    )::date AS m_start
),
monthly_sales AS (
    SELECT 
        date_trunc('month', s.salesDate)::date AS m_start,
        COALESCE(SUM(sd.quantity * ph.unitPrice), 0.00) AS sales_amount
    FROM SALES s
    JOIN SALESDETAIL sd ON sd.transNo = s.transNo
    CROSS JOIN LATERAL (
        SELECT unitPrice FROM PRICEHIST 
        WHERE prodCode = sd.prodCode AND effDate <= s.salesDate 
        ORDER BY effDate DESC LIMIT 1
    ) ph
    WHERE s.salesDate >= (CURRENT_DATE - INTERVAL '6 months')
    GROUP BY date_trunc('month', s.salesDate)
),
monthly_payments AS (
    SELECT 
        date_trunc('month', payDate)::date AS m_start,
        COALESCE(SUM(amount), 0.00) AS payments_amount
    FROM PAYMENT
    WHERE payDate >= (CURRENT_DATE - INTERVAL '6 months')
    GROUP BY date_trunc('month', payDate)
)
SELECT 
    to_char(m.m_start, 'YYYY-MM') AS month_key,
    to_char(m.m_start, 'Mon') AS month_label,
    COALESCE(ms.sales_amount, 0.00) AS total_sales,
    COALESCE(mp.payments_amount, 0.00) AS payments_received
FROM months m
LEFT JOIN monthly_sales ms ON ms.m_start = m.m_start
LEFT JOIN monthly_payments mp ON mp.m_start = m.m_start
ORDER BY m.m_start ASC;
*/

-- ------------------------------------------------------------------------
-- 3. Department Sales Attribution in Period
-- ------------------------------------------------------------------------
/*
SELECT 
    d.deptCode,
    d.deptName,
    COALESCE(SUM(sd.quantity * ph.unitPrice), 0.00) AS sales_amount,
    COUNT(DISTINCT s.transNo) AS sales_count,
    ROUND(
        (COALESCE(SUM(sd.quantity * ph.unitPrice), 0.00) / 
        NULLIF((
            SELECT SUM(sd2.quantity * ph2.unitPrice)
            FROM SALES s2
            JOIN SALESDETAIL sd2 ON sd2.transNo = s2.transNo
            CROSS JOIN LATERAL (
                SELECT unitPrice FROM PRICEHIST 
                WHERE prodCode = sd2.prodCode AND effDate <= s2.salesDate 
                ORDER BY effDate DESC LIMIT 1
            ) ph2
            WHERE s2.salesDate >= :start_date AND s2.salesDate <= :end_date
        ), 0)) * 100, 1
    ) AS share_pct
FROM SALES s
JOIN EMPLOYEE e ON e.empNo = s.empNo
CROSS JOIN LATERAL (
    SELECT deptCode FROM JOBHISTORY
    WHERE empNo = e.empNo AND effDate <= s.salesDate
    ORDER BY effDate DESC LIMIT 1
) jh
JOIN DEPARTMENT d ON d.deptCode = jh.deptCode
JOIN SALESDETAIL sd ON sd.transNo = s.transNo
CROSS JOIN LATERAL (
    SELECT unitPrice FROM PRICEHIST
    WHERE prodCode = sd.prodCode AND effDate <= s.salesDate
    ORDER BY effDate DESC LIMIT 1
) ph
WHERE s.salesDate >= :start_date AND s.salesDate <= :end_date
GROUP BY d.deptCode, d.deptName
ORDER BY sales_amount DESC;
*/
