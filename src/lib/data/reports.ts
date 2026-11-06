import { DatabaseSync } from 'node:sqlite';
import { getHopeDb } from '@/lib/hope-db';

function getDb(): DatabaseSync {
  return getHopeDb();
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const salaryFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

// ========================================================================
// 1. TOP CUSTOMERS BY SALES (Figure 28)
// ========================================================================
export interface TopCustomerRow {
  rank: number;
  custNo: string;
  custName: string;
  totalSales: number;
  totalSalesFormatted: string;
}

export function getTopCustomers(fromDate = '2010-01-01', toDate = '2026-12-31', topN = 10): TopCustomerRow[] {
  const db = getDb();
  const effectiveFrom = fromDate || '2000-01-01';
  const effectiveTo = toDate || '2099-12-31';
  const effectiveTopN = Math.max(1, Number(topN) || 10);

  const query = `
    SELECT 
      c.custNo,
      c.custName,
      SUM(sd.quantity * (
        SELECT ph.unitPrice 
        FROM PRICEHIST ph 
        WHERE ph.prodCode = sd.prodCode 
          AND ph.effDate <= s.salesDate 
          AND ph.is_deleted = 0
        ORDER BY ph.effDate DESC 
        LIMIT 1
      )) AS totalSales
    FROM SALES s
    JOIN CUSTOMER c ON c.custNo = s.custNo
    JOIN SALESDETAIL sd ON sd.transNo = s.transNo
    WHERE s.is_deleted = 0 
      AND sd.is_deleted = 0
      AND s.salesDate BETWEEN ? AND ?
    GROUP BY c.custNo, c.custName
    HAVING totalSales > 0
    ORDER BY totalSales DESC
    LIMIT ?
  `;

  try {
    const rows = db.prepare(query).all(effectiveFrom, effectiveTo, effectiveTopN) as any[];
    return rows.map((r, idx) => ({
      rank: idx + 1,
      custNo: String(r.custNo),
      custName: String(r.custName || ''),
      totalSales: Number(r.totalSales || 0),
      totalSalesFormatted: currencyFormatter.format(Number(r.totalSales || 0)),
    }));
  } catch {
    return [];
  }
}

// ========================================================================
// 2. PRODUCT MASTER LIST (CURRENT PRICE) (Figure 29)
// "Only active products appear."
// ========================================================================
export interface ProductMasterRow {
  prodCode: string;
  description: string;
  unit: string;
  currentPrice: number | null;
  currentPriceFormatted: string;
}

export function getProductMasterList(): ProductMasterRow[] {
  const db = getDb();
  const query = `
    SELECT 
      p.prodCode,
      p.description,
      p.unit,
      (
        SELECT ph.unitPrice 
        FROM PRICEHIST ph 
        WHERE ph.prodCode = p.prodCode 
          AND ph.effDate <= date('now')
          AND ph.is_deleted = 0
        ORDER BY ph.effDate DESC 
        LIMIT 1
      ) as currentPrice
    FROM PRODUCT p
    WHERE p.is_deleted = 0
    ORDER BY p.prodCode ASC
  `;

  try {
    const rows = db.prepare(query).all() as any[];
    return rows.map((r) => {
      const price = r.currentPrice !== null && r.currentPrice !== undefined ? Number(r.currentPrice) : null;
      return {
        prodCode: String(r.prodCode),
        description: String(r.description || ''),
        unit: String(r.unit || 'pcs'),
        currentPrice: price,
        currentPriceFormatted: price !== null ? currencyFormatter.format(price) : '—',
      };
    });
  } catch {
    return [];
  }
}

// ========================================================================
// 3. TOP PRODUCTS BY SALES AMOUNT (Figure 30)
// ========================================================================
export interface TopProductRow {
  rank: number;
  prodCode: string;
  description: string;
  qtySold: number;
  salesAmount: number;
  salesAmountFormatted: string;
}

export function getTopProducts(fromDate = '2010-01-01', toDate = '2026-12-31', topN = 10): TopProductRow[] {
  const db = getDb();
  const effectiveFrom = fromDate || '2000-01-01';
  const effectiveTo = toDate || '2099-12-31';
  const effectiveTopN = Math.max(1, Number(topN) || 10);

  const query = `
    SELECT 
      sd.prodCode,
      p.description,
      SUM(sd.quantity) as qtySold,
      SUM(sd.quantity * (
        SELECT ph.unitPrice 
        FROM PRICEHIST ph 
        WHERE ph.prodCode = sd.prodCode 
          AND ph.effDate <= s.salesDate 
          AND ph.is_deleted = 0
        ORDER BY ph.effDate DESC 
        LIMIT 1
      )) as salesAmount
    FROM SALESDETAIL sd
    JOIN SALES s ON s.transNo = sd.transNo
    JOIN PRODUCT p ON p.prodCode = sd.prodCode
    WHERE s.is_deleted = 0 
      AND sd.is_deleted = 0
      AND s.salesDate BETWEEN ? AND ?
    GROUP BY sd.prodCode, p.description
    HAVING salesAmount > 0
    ORDER BY salesAmount DESC
    LIMIT ?
  `;

  try {
    const rows = db.prepare(query).all(effectiveFrom, effectiveTo, effectiveTopN) as any[];
    return rows.map((r, idx) => ({
      rank: idx + 1,
      prodCode: String(r.prodCode),
      description: String(r.description || ''),
      qtySold: Number(r.qtySold || 0),
      salesAmount: Number(r.salesAmount || 0),
      salesAmountFormatted: currencyFormatter.format(Number(r.salesAmount || 0)),
    }));
  } catch {
    return [];
  }
}

// ========================================================================
// 4. ACTIVE EMPLOYEES (NOT SEPARATED) (Figure 31)
// "Employees with no separation date."
// ========================================================================
export interface ActiveEmployeeRow {
  empNo: string;
  lastName: string;
  firstName: string;
  gender: string;
  birthDate: string;
  hireDate: string;
}

export function getActiveEmployees(): ActiveEmployeeRow[] {
  const db = getDb();
  const query = `
    SELECT empNo, lastName, firstName, gender, birthDate, hireDate
    FROM EMPLOYEE
    WHERE (sepDate IS NULL OR sepDate = '' OR trim(sepDate) = '')
      AND is_deleted = 0
    ORDER BY empNo ASC
  `;

  try {
    const rows = db.prepare(query).all() as any[];
    return rows.map((r) => ({
      empNo: String(r.empNo),
      lastName: String(r.lastName || ''),
      firstName: String(r.firstName || ''),
      gender: String(r.gender || '—'),
      birthDate: String(r.birthDate || '—'),
      hireDate: String(r.hireDate || '—'),
    }));
  } catch {
    return [];
  }
}

// ========================================================================
// 5. ALL EMPLOYEES (INCLUDING SEPARATED) (Figure 32)
// ========================================================================
export interface AllEmployeeRow {
  empNo: string;
  lastName: string;
  firstName: string;
  gender: string;
  birthDate: string;
  hireDate: string;
  sepDate: string | null;
  status: 'Active' | 'Inactive';
}

export function getAllEmployeesReport(): AllEmployeeRow[] {
  const db = getDb();
  const query = `
    SELECT empNo, lastName, firstName, gender, birthDate, hireDate, sepDate, is_deleted
    FROM EMPLOYEE
    ORDER BY empNo ASC
  `;

  try {
    const rows = db.prepare(query).all() as any[];
    return rows.map((r) => {
      const isSep = Boolean(r.sepDate && String(r.sepDate).trim() !== '');
      const isInactive = isSep || Boolean(r.is_deleted);
      return {
        empNo: String(r.empNo),
        lastName: String(r.lastName || ''),
        firstName: String(r.firstName || ''),
        gender: String(r.gender || '—'),
        birthDate: String(r.birthDate || '—'),
        hireDate: String(r.hireDate || '—'),
        sepDate: isSep ? String(r.sepDate) : null,
        status: isInactive ? 'Inactive' : 'Active',
      };
    });
  } catch {
    return [];
  }
}

// ========================================================================
// 6. EMPLOYEE JOB HISTORY (Figure 33)
// ========================================================================
export interface EmployeeJobHistoryRow {
  effDate: string;
  job: string;
  department: string;
  salary: number;
  salaryFormatted: string;
}

export function getEmployeeJobHistoryReport(empNo: string | number): EmployeeJobHistoryRow[] {
  const db = getDb();
  const cleanEmpNo = String(empNo).trim();
  const query = `
    SELECT 
      jh.effDate,
      jh.jobCode || ' — ' || j.jobDesc as job,
      jh.deptCode || ' — ' || d.deptName as department,
      jh.salary
    FROM JOBHISTORY jh
    JOIN JOB j ON j.jobCode = jh.jobCode
    JOIN DEPARTMENT d ON d.deptCode = jh.deptCode
    WHERE jh.empNo = ? AND jh.is_deleted = 0
    ORDER BY jh.effDate DESC
  `;

  try {
    const rows = db.prepare(query).all(cleanEmpNo) as any[];
    return rows.map((r) => ({
      effDate: String(r.effDate || ''),
      job: String(r.job || ''),
      department: String(r.department || ''),
      salary: Number(r.salary || 0),
      salaryFormatted: salaryFormatter.format(Number(r.salary || 0)),
    }));
  } catch {
    return [];
  }
}

// ========================================================================
// 7. TOP SALES (Figure 34)
// ========================================================================
export interface TopSaleRow {
  rank: number;
  transNo: string;
  date: string;
  customer: string;
  employee: string;
  total: number;
  totalFormatted: string;
}

export function getTopSales(fromDate = '2010-01-01', toDate = '2026-12-31', topN = 10): TopSaleRow[] {
  const db = getDb();
  const effectiveFrom = fromDate || '2000-01-01';
  const effectiveTo = toDate || '2099-12-31';
  const effectiveTopN = Math.max(1, Number(topN) || 10);

  const query = `
    SELECT 
      s.transNo,
      s.salesDate as date,
      c.custName as customer,
      e.firstName || ' ' || e.lastName as employee,
      SUM(sd.quantity * (
        SELECT ph.unitPrice 
        FROM PRICEHIST ph 
        WHERE ph.prodCode = sd.prodCode 
          AND ph.effDate <= s.salesDate 
          AND ph.is_deleted = 0
        ORDER BY ph.effDate DESC 
        LIMIT 1
      )) as total
    FROM SALES s
    JOIN CUSTOMER c ON c.custNo = s.custNo
    JOIN EMPLOYEE e ON e.empNo = s.empNo
    JOIN SALESDETAIL sd ON sd.transNo = s.transNo
    WHERE s.is_deleted = 0 
      AND sd.is_deleted = 0
      AND s.salesDate BETWEEN ? AND ?
    GROUP BY s.transNo, s.salesDate, c.custName, e.firstName, e.lastName
    HAVING total > 0
    ORDER BY total DESC
    LIMIT ?
  `;

  try {
    const rows = db.prepare(query).all(effectiveFrom, effectiveTo, effectiveTopN) as any[];
    return rows.map((r, idx) => ({
      rank: idx + 1,
      transNo: String(r.transNo),
      date: String(r.date || ''),
      customer: String(r.customer || ''),
      employee: String(r.employee || ''),
      total: Number(r.total || 0),
      totalFormatted: currencyFormatter.format(Number(r.total || 0)),
    }));
  } catch {
    return [];
  }
}

export function getEmployeesListForDropdown(): Array<{ empNo: string; fullName: string }> {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT empNo, empNo || ' — ' || firstName || ' ' || lastName as fullName 
      FROM EMPLOYEE 
      WHERE is_deleted = 0
      ORDER BY empNo ASC
    `).all() as any[];
    return rows.map((r) => ({
      empNo: String(r.empNo),
      fullName: String(r.fullName),
    }));
  } catch {
    return [];
  }
}
