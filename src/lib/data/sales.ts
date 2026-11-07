import { getHopeDb, type HopeDatabase } from '@/lib/hope-db';

// ========================================================================
// TYPES & CONTRACTS (Section 3.6 Sales: Master-Detail)
// ========================================================================

export interface SaleItem {
  transNo: string;
  salesDate: string;
  custNo: string;
  custName: string;
  empNo: string;
  empName: string;
  totalAmount: number;
  lineCount: number;
  isDeleted: boolean;
  status: 'Active' | 'Inactive';
  stamp: string | null;
}

export interface SaleDetailLineItem {
  transNo: string;
  prodCode: string;
  prodDesc: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isDeleted: boolean;
  status: 'Active' | 'Inactive';
  stamp: string | null;
}

export interface SalesMetrics {
  totalSales: number;
  activeSales: number;
  inactiveSales: number;
  totalRevenue: number;
  totalLines: number;
  activeLines: number;
  nextSuggestedTransNo: string;
}

export interface SaleLookupItem {
  custNo: string;
  custName: string;
}

export interface EmployeeLookupItem {
  empNo: string;
  fullName: string;
}

export interface ProductLookupItem {
  prodCode: string;
  description: string;
  unit: string;
  currentPrice: number;
}

export interface SalesLookupData {
  customers: SaleLookupItem[];
  employees: EmployeeLookupItem[];
  products: ProductLookupItem[];
}

export interface SalesAuditItem {
  auditId: number;
  tableName: 'SALES' | 'SALESDETAIL' | string;
  action: 'ADD' | 'EDIT' | 'DELETE' | 'RESTORE' | string;
  recordKey: string;
  oldValues: string | null;
  newValues: string | null;
  actionBy: string;
  actionAt: string;
}

export interface SalesPageData {
  sales: SaleItem[];
  lines: SaleDetailLineItem[];
  metrics: SalesMetrics;
  lookups: SalesLookupData;
  recentAudits: SalesAuditItem[];
}

// Backwards compatibility types
export interface SalesSummaryItem extends SaleItem {
  custAddress?: string;
  payTerms?: string;
  repName?: string;
  deptCode?: string;
  deptName?: string;
  itemCount?: number;
}

export interface SaleLineItem {
  transNo: string | number;
  salesDate: string;
  custNo: string | number;
  custName: string;
  prodCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  priceEffDate: string;
  lineAmount: number;
}

export interface SaleReceiptItem {
  orNo: string | number;
  payDate: string;
  amount: number;
  transNo: string | number;
}

export interface SaleDetailData {
  sale: SalesSummaryItem;
  items: SaleLineItem[];
  payments: SaleReceiptItem[];
}

export interface SalesSummaryMetrics extends SalesMetrics {
  totalItemsSold: number;
  totalDistinctProducts: number;
  totalCustomersCount: number;
  activeRepsCount: number;
  sellingDepartmentsCount: number;
}

export interface SaleLookupData {
  customers: Array<{
    custNo: string | number;
    custName: string;
    address?: string;
    payTerms?: string;
  }>;
  employees: Array<{
    empNo: string | number;
    fullName: string;
    deptCode?: string;
    deptName?: string;
    hireDate?: string;
    sepDate?: string | null;
  }>;
  departments?: Array<{
    deptCode: string;
    deptName: string;
  }>;
  products: Array<{
    prodCode: string;
    description: string;
    unit: string;
    currentPrice: number;
  }>;
}

function getSqliteDb(): HopeDatabase {
  return getHopeDb();
}

/**
 * Main Data Fetcher for Sales Module (Section 3.6: Sales Header & Detail Lines)
 */
export async function getSalesPageData(): Promise<SalesPageData> {
  const db = getSqliteDb();

  // 1. Fetch Sales Headers with dynamically derived Total from active line items
  const salesRows = await db.query(`
    SELECT 
      s.transNo,
      s.salesDate,
      s.custNo,
      COALESCE(c.custName, s.custNo) AS custName,
      s.empNo,
      COALESCE(e.firstName || ' ' || e.lastName, s.empNo) AS empName,
      s.is_deleted,
      s.stamp,
      (
        SELECT COALESCE(SUM(
          sd.quantity * COALESCE((
            SELECT ph.unitPrice 
            FROM PRICEHIST ph 
            WHERE ph.prodCode = sd.prodCode 
              AND ph.effDate <= s.salesDate 
              AND ph.is_deleted = 0
            ORDER BY ph.effDate DESC 
            LIMIT 1
          ), 0)
        ), 0)
        FROM SALESDETAIL sd
        WHERE sd.transNo = s.transNo AND sd.is_deleted = 0
      ) AS computedTotal,
      (
        SELECT COUNT(1) 
        FROM SALESDETAIL sd 
        WHERE sd.transNo = s.transNo AND sd.is_deleted = 0
      ) AS lineCount
    FROM SALES s
    LEFT JOIN CUSTOMER c ON c.custNo = s.custNo
    LEFT JOIN EMPLOYEE e ON e.empNo = s.empNo
    ORDER BY s.transNo DESC
  `);

  const sales: SaleItem[] = salesRows.map((r) => {
    const isDeleted = Boolean(r.is_deleted === 1 || r.is_deleted === true || r.is_deleted === '1');
    // Rule: Deleted sale shows $0.00
    const totalAmount = isDeleted ? 0 : Number(r.computedTotal || 0);

    return {
      transNo: String(r.transNo),
      salesDate: String(r.salesDate || ''),
      custNo: String(r.custNo || ''),
      custName: String(r.custName || ''),
      empNo: String(r.empNo || ''),
      empName: String(r.empName || ''),
      totalAmount,
      lineCount: Number(r.lineCount || 0),
      isDeleted,
      status: isDeleted ? 'Inactive' : 'Active',
      stamp: r.stamp ? String(r.stamp) : null,
    };
  });

  // 2. Fetch Detail Lines
  const lineRows = await db.query(`
    SELECT 
      sd.transNo,
      sd.prodCode,
      COALESCE(p.description, sd.prodCode) AS prodDesc,
      sd.quantity,
      COALESCE((
        SELECT ph.unitPrice 
        FROM PRICEHIST ph 
        WHERE ph.prodCode = sd.prodCode 
          AND ph.effDate <= s.salesDate 
          AND ph.is_deleted = 0
        ORDER BY ph.effDate DESC 
        LIMIT 1
      ), 0) AS unitPrice,
      sd.is_deleted,
      sd.stamp
    FROM SALESDETAIL sd
    JOIN SALES s ON s.transNo = sd.transNo
    LEFT JOIN PRODUCT p ON p.prodCode = sd.prodCode
    ORDER BY sd.transNo DESC, sd.prodCode ASC
  `);

  const lines: SaleDetailLineItem[] = lineRows.map((r) => {
    const isDeleted = Boolean(r.is_deleted === 1 || r.is_deleted === true || r.is_deleted === '1');
    const quantity = Number(r.quantity || 0);
    const unitPrice = Number(r.unitPrice || 0);
    const lineTotal = quantity * unitPrice;

    return {
      transNo: String(r.transNo),
      prodCode: String(r.prodCode),
      prodDesc: String(r.prodDesc || ''),
      quantity,
      unitPrice,
      lineTotal,
      isDeleted,
      status: isDeleted ? 'Inactive' : 'Active',
      stamp: r.stamp ? String(r.stamp) : null,
    };
  });

  // 3. Compute Metrics
  const activeSales = sales.filter((s) => !s.isDeleted).length;
  const inactiveSales = sales.filter((s) => s.isDeleted).length;
  const activeLines = lines.filter((l) => !l.isDeleted).length;
  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);

  // Compute next suggested transaction number (e.g. TR000125)
  let maxNum = 0;
  for (const s of sales) {
    const m = s.transNo.match(/^(?:TR|T-?)0*(\d+)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  const nextTransNum = maxNum + 1;
  const nextSuggestedTransNo = `TR${String(nextTransNum).padStart(6, '0')}`;

  // 4. Fetch Lookups for Customer, Employee, Product
  const custLookups = await db.query(`
    SELECT custNo, custName
    FROM CUSTOMER
    WHERE is_deleted = 0
    ORDER BY custName ASC
  `);

  const empLookups = await db.query(`
    SELECT empNo, (firstName || ' ' || lastName) AS fullName
    FROM EMPLOYEE
    WHERE is_deleted = 0 AND sepDate IS NULL
    ORDER BY firstName ASC, lastName ASC
  `);

  const prodLookups = await db.query(`
    SELECT 
      p.prodCode,
      p.description,
      p.unit,
      COALESCE((
        SELECT ph.unitPrice 
        FROM PRICEHIST ph 
        WHERE ph.prodCode = p.prodCode 
          AND ph.effDate <= date('now', '+8 hours') 
          AND ph.is_deleted = 0
        ORDER BY ph.effDate DESC 
        LIMIT 1
      ), 0) AS currentPrice
    FROM PRODUCT p
    WHERE p.is_deleted = 0
    ORDER BY p.prodCode ASC
  `);

  const lookups: SalesLookupData = {
    customers: custLookups.map((c) => ({
      custNo: String(c.custNo),
      custName: String(c.custName || ''),
    })),
    employees: empLookups.map((e) => ({
      empNo: String(e.empNo),
      fullName: String(e.fullName || ''),
    })),
    products: prodLookups.map((p) => ({
      prodCode: String(p.prodCode),
      description: String(p.description || ''),
      unit: String(p.unit || 'pc'),
      currentPrice: Number(p.currentPrice || 0),
    })),
  };

  // 5. Query Recent Audits
  let recentAudits: SalesAuditItem[] = [];
  try {
    const auditRows = await db.query(`
      SELECT audit_id, table_name, action, record_key, old_values, new_values, action_by, action_at
      FROM audit_log
      WHERE table_name IN ('SALES', 'SALESDETAIL')
      ORDER BY audit_id DESC
      LIMIT 30
    `);

    recentAudits = auditRows.map((a) => ({
      auditId: Number(a.audit_id),
      tableName: String(a.table_name),
      action: a.action,
      recordKey: String(a.record_key || ''),
      oldValues: a.old_values ? String(a.old_values) : null,
      newValues: a.new_values ? String(a.new_values) : null,
      actionBy: String(a.action_by || 'system'),
      actionAt: String(a.action_at || ''),
    }));
  } catch {
    // Non-blocking
  }

  return {
    sales,
    lines,
    metrics: {
      totalSales: sales.length,
      activeSales,
      inactiveSales,
      totalRevenue,
      totalLines: lines.length,
      activeLines,
      nextSuggestedTransNo,
    },
    lookups,
    recentAudits,
  };
}

// ========================================================================
// LEGACY COMPATIBILITY HELPERS
// ========================================================================

export async function getSaleCreationLookups(): Promise<SaleLookupData> {
  const data = await getSalesPageData();
  return {
    customers: data.lookups.customers.map((c) => ({ custNo: c.custNo, custName: c.custName })),
    employees: data.lookups.employees.map((e) => ({ empNo: e.empNo, fullName: e.fullName })),
    departments: [],
    products: data.lookups.products.map((p) => ({
      prodCode: p.prodCode,
      description: p.description,
      unit: p.unit,
      currentPrice: p.currentPrice,
    })),
  };
}

export async function getSaleDetailData(transNo: string | number): Promise<SaleDetailData | null> {
  const db = getSqliteDb();
  const cleanTrans = String(transNo).trim();

  const saleRow = await db.get<any>(`
    SELECT 
      s.transNo,
      s.salesDate,
      s.custNo,
      c.custName,
      c.address AS custAddress,
      c.payTerms,
      s.empNo,
      (e.firstName || ' ' || e.lastName) AS repName,
      jh.deptCode,
      d.deptName,
      s.is_deleted,
      s.stamp
    FROM SALES s
    LEFT JOIN CUSTOMER c ON c.custNo = s.custNo
    LEFT JOIN EMPLOYEE e ON e.empNo = s.empNo
    LEFT JOIN JOBHISTORY jh ON jh.empNo = s.empNo AND jh.effDate = (
      SELECT MAX(jh2.effDate) FROM JOBHISTORY jh2 
      WHERE jh2.empNo = s.empNo AND jh2.effDate <= s.salesDate AND jh2.is_deleted = 0
    )
    LEFT JOIN DEPARTMENT d ON d.deptCode = jh.deptCode
    WHERE s.transNo = ?
  `, [cleanTrans]);

  if (!saleRow) return null;

  const lineRows = await db.query(`
    SELECT 
      sd.transNo,
      s.salesDate,
      s.custNo,
      c.custName,
      sd.prodCode,
      p.description,
      p.unit,
      sd.quantity,
      COALESCE((
        SELECT ph.unitPrice 
        FROM PRICEHIST ph 
        WHERE ph.prodCode = sd.prodCode 
          AND ph.effDate <= s.salesDate 
          AND ph.is_deleted = 0
        ORDER BY ph.effDate DESC 
        LIMIT 1
      ), 0) AS unitPrice,
      (
        SELECT ph.effDate 
        FROM PRICEHIST ph 
        WHERE ph.prodCode = sd.prodCode 
          AND ph.effDate <= s.salesDate 
          AND ph.is_deleted = 0
        ORDER BY ph.effDate DESC 
        LIMIT 1
      ) AS priceEffDate
    FROM SALESDETAIL sd
    JOIN SALES s ON s.transNo = sd.transNo
    LEFT JOIN CUSTOMER c ON c.custNo = s.custNo
    LEFT JOIN PRODUCT p ON p.prodCode = sd.prodCode
    WHERE sd.transNo = ? AND sd.is_deleted = 0
    ORDER BY sd.prodCode ASC
  `, [cleanTrans]);

  const items: SaleLineItem[] = lineRows.map((r) => {
    const qty = Number(r.quantity || 0);
    const unitPrice = Number(r.unitPrice || 0);
    return {
      transNo: String(r.transNo),
      salesDate: String(r.salesDate || ''),
      custNo: String(r.custNo || ''),
      custName: String(r.custName || ''),
      prodCode: String(r.prodCode || ''),
      description: String(r.description || ''),
      unit: String(r.unit || 'pc'),
      quantity: qty,
      unitPrice,
      priceEffDate: String(r.priceEffDate || ''),
      lineAmount: qty * unitPrice,
    };
  });

  const totalAmount = items.reduce((sum, item) => sum + item.lineAmount, 0);

  const sale: SalesSummaryItem = {
    transNo: String(saleRow.transNo),
    salesDate: String(saleRow.salesDate || ''),
    custNo: String(saleRow.custNo || ''),
    custName: String(saleRow.custName || ''),
    custAddress: String(saleRow.custAddress || ''),
    payTerms: String(saleRow.payTerms || ''),
    empNo: String(saleRow.empNo || ''),
    repName: String(saleRow.repName || ''),
    empName: String(saleRow.repName || ''),
    deptCode: String(saleRow.deptCode || ''),
    deptName: String(saleRow.deptName || ''),
    itemCount: items.length,
    lineCount: items.length,
    totalAmount: saleRow.is_deleted ? 0 : totalAmount,
    isDeleted: Boolean(saleRow.is_deleted),
    status: saleRow.is_deleted ? 'Inactive' : 'Active',
    stamp: saleRow.stamp ? String(saleRow.stamp) : null,
  };

  return {
    sale,
    items,
    payments: [],
  };
}
