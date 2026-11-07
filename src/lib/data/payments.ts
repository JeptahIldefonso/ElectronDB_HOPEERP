import { getHopeDb } from '@/lib/hope-db';

export interface PaymentLedgerItem {
  orNo: string;
  payDate: string;
  amount: number;
  transNo: string;
  salesDate: string;
  custNo: string;
  custName: string;
  saleTotal: number;
  totalPaid: number;
  balance: number;
  status: 'Active' | 'Inactive';
  stamp: string;
  isDeleted: boolean;
}

export interface PaymentAuditItem {
  id: string;
  orNo: string;
  action: 'CREATED' | 'EDITED' | 'DELETED' | 'RESTORED';
  by: string;
  timestamp: string;
  details: string;
}

export interface SaleForPaymentOption {
  transNo: string;
  salesDate: string;
  custNo: string;
  custName: string;
  totalAmount: number;
  alreadyPaid: number;
  balance: number;
}

export interface OfficialReceiptData {
  orNo: string | number;
  payDate: string;
  amount: number;
  transNo: string | number;
  salesDate: string;
  totalAmount: number;
  customer: {
    custNo: string | number;
    custName: string;
    address: string;
    payTerms: string;
  };
  salesRep: {
    empNo: string | number;
    empName: string;
    deptName: string;
  };
}

export interface PaymentsLedgerData {
  items: PaymentLedgerItem[];
  metrics: {
    totalPaymentsAmount: number;
    totalReceiptsCount: number;
    activeCount: number;
    inactiveCount: number;
    totalOutstandingBalance: number;
  };
  recentAudits: PaymentAuditItem[];
}

/**
 * Fetch payments ledger with outstanding balance calculations (§3.9 & §4.2)
 * Formula: Balance = Sale Total - Sum(Payments)
 */
export async function getPaymentsLedger(filter?: {
  period?: string;
  query?: string;
}): Promise<PaymentsLedgerData> {
  const db = getHopeDb();

  const rawPayments = await db.query(`
    SELECT 
      p.ORNo AS orNo,
      p.payDate,
      p.amount,
      p.transNo,
      p.stamp,
      COALESCE(p.is_deleted, 0) AS isDeleted,
      s.salesDate,
      c.custNo,
      c.custName,
      COALESCE((
        SELECT SUM(sd.quantity * ph.unitPrice)
        FROM SALESDETAIL sd
        JOIN PRICEHIST ph ON ph.prodCode = sd.prodCode AND ph.effDate = (
          SELECT MAX(effDate) FROM PRICEHIST WHERE prodCode = sd.prodCode AND effDate <= s.salesDate
        )
        WHERE sd.transNo = s.transNo AND (sd.is_deleted = 0 OR sd.is_deleted IS NULL)
      ), 0.0) AS saleTotal,
      COALESCE((
        SELECT SUM(p2.amount)
        FROM PAYMENT p2
        WHERE p2.transNo = s.transNo AND (p2.is_deleted = 0 OR p2.is_deleted IS NULL)
      ), 0.0) AS totalPaid
    FROM PAYMENT p
    JOIN SALES s ON s.transNo = p.transNo
    JOIN CUSTOMER c ON c.custNo = s.custNo
    ORDER BY p.payDate DESC, p.ORNo DESC
  `);

  let items: PaymentLedgerItem[] = rawPayments.map((r) => {
    const sTotal = Number(r.saleTotal || 0);
    const tPaid = Number(r.totalPaid || 0);
    const bal = Math.max(0, Number((sTotal - tPaid).toFixed(2)));
    const isDel = Boolean(r.isDeleted);

    return {
      orNo: String(r.orNo),
      payDate: String(r.payDate),
      amount: Number(r.amount),
      transNo: String(r.transNo),
      salesDate: String(r.salesDate),
      custNo: String(r.custNo),
      custName: String(r.custName),
      saleTotal: sTotal,
      totalPaid: tPaid,
      balance: bal,
      status: isDel ? 'Inactive' : 'Active',
      stamp: r.stamp ? String(r.stamp) : '',
      isDeleted: isDel,
    };
  });

  const totalPaymentsAmount = items
    .filter((i) => !i.isDeleted)
    .reduce((sum, item) => sum + item.amount, 0);
  const totalReceiptsCount = items.length;
  const activeCount = items.filter((i) => !i.isDeleted).length;
  const inactiveCount = items.filter((i) => i.isDeleted).length;

  // Compute distinct outstanding balance across all transactions with payments
  const transMap = new Map<string, number>();
  items.forEach((i) => {
    if (!i.isDeleted && !transMap.has(i.transNo)) {
      transMap.set(i.transNo, i.balance);
    }
  });
  const totalOutstandingBalance = Array.from(transMap.values()).reduce((sum, b) => sum + b, 0);

  // Parse audits from stamps
  const recentAudits: PaymentAuditItem[] = items.slice(0, 15).map((item, idx) => {
    const parts = (item.stamp || '').split(' ');
    const act = (parts[0] || 'CREATED').toUpperCase() as any;
    const by = parts[1] || 'system';
    const time = parts.slice(2).join(' ') || item.payDate;

    return {
      id: `audit-${idx}-${item.orNo}`,
      orNo: item.orNo,
      action: act === 'ADD' ? 'CREATED' : act,
      by,
      timestamp: time,
      details: `Payment receipt ₱${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} on #${item.transNo}`,
    };
  });

  // Period filtering matching Sales page
  if (filter?.period && filter.period !== 'ALL') {
    if (/^\d{4}$/.test(filter.period)) {
      items = items.filter((i) => i.payDate.startsWith(filter.period!));
    } else {
      const latestPayDate = items[0]?.payDate || new Date().toISOString().slice(0, 10);
      if (filter.period === 'TODAY') {
        items = items.filter((i) => i.payDate === latestPayDate);
      } else if (filter.period === 'THIS_MONTH') {
        items = items.filter((i) => i.payDate.slice(0, 7) === latestPayDate.slice(0, 7));
      } else if (filter.period === 'THIS_YEAR') {
        items = items.filter((i) => i.payDate.slice(0, 4) === latestPayDate.slice(0, 4));
      }
    }
  }

  // Text query filtering
  if (filter?.query && filter.query.trim()) {
    const q = filter.query.toLowerCase().trim();
    items = items.filter(
      (item) =>
        item.orNo.toString().includes(q) ||
        item.transNo.toString().includes(q) ||
        item.custName.toLowerCase().includes(q)
    );
  }

  return {
    items,
    metrics: {
      totalPaymentsAmount,
      totalReceiptsCount,
      activeCount,
      inactiveCount,
      totalOutstandingBalance,
    },
    recentAudits,
  };
}

/**
 * Fetch sales list for the Record Payment modal dropdown
 */
export async function getSalesForPayment(preselectedTransNo?: number): Promise<SaleForPaymentOption[]> {
  const db = getHopeDb();

  const rawRows = await db.query(`
    SELECT 
      s.transNo,
      s.salesDate,
      c.custNo,
      c.custName,
      COALESCE((
        SELECT SUM(sd.quantity * ph.unitPrice)
        FROM SALESDETAIL sd
        JOIN PRICEHIST ph ON ph.prodCode = sd.prodCode AND ph.effDate = (
          SELECT MAX(effDate) FROM PRICEHIST WHERE prodCode = sd.prodCode AND effDate <= s.salesDate
        )
        WHERE sd.transNo = s.transNo AND (sd.is_deleted = 0 OR sd.is_deleted IS NULL)
      ), 0.0) AS totalAmount,
      COALESCE((
        SELECT SUM(p.amount)
        FROM PAYMENT p
        WHERE p.transNo = s.transNo AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
      ), 0.0) AS alreadyPaid
    FROM SALES s
    JOIN CUSTOMER c ON c.custNo = s.custNo
    WHERE s.is_deleted = 0 OR s.is_deleted IS NULL
    ORDER BY s.salesDate DESC, s.transNo DESC
  `);

  return rawRows.map((r) => {
    const tot = Number(r.totalAmount || 0);
    const paid = Number(r.alreadyPaid || 0);
    return {
      transNo: String(r.transNo),
      salesDate: String(r.salesDate),
      custNo: String(r.custNo),
      custName: String(r.custName),
      totalAmount: tot,
      alreadyPaid: paid,
      balance: Math.max(0, Number((tot - paid).toFixed(2))),
    };
  });
}

/**
 * Get next OR number preview
 */
export async function getNextORNumberPreview(): Promise<number> {
  const db = getHopeDb();
  const row = await db.get<any>('SELECT COALESCE(MAX(ORNo), 9000) + 1 AS nextOR FROM PAYMENT');
  return Number(row?.nextOR || 9001);
}

/**
 * Retrieve single official receipt document
 */
export async function getOfficialReceipt(orNo: string | number): Promise<OfficialReceiptData | null> {
  const db = getHopeDb();

  const rawStr = String(orNo).trim();
  const formattedOrNo = rawStr.startsWith('OR')
    ? rawStr
    : `OR${rawStr.padStart(6, '0')}`;

  const payment = await db.get<any>('SELECT ORNo AS orNo, payDate, amount, transNo FROM PAYMENT WHERE ORNo = ? OR ORNo = ?', [formattedOrNo, rawStr]);
  if (!payment) return null;

  const sale = await db.get<any>(`
    SELECT 
      s.transNo,
      s.salesDate,
      c.custNo,
      c.custName,
      c.address,
      c.payTerms,
      e.empNo,
      (e.firstName || ' ' || e.lastName) AS empName,
      d.deptName
    FROM SALES s
    JOIN CUSTOMER c ON c.custNo = s.custNo
    JOIN EMPLOYEE e ON e.empNo = s.empNo
    JOIN JOBHISTORY jh ON jh.empNo = e.empNo AND jh.effDate = (
      SELECT MAX(effDate) FROM JOBHISTORY WHERE empNo = e.empNo AND effDate <= s.salesDate
    )
    JOIN DEPARTMENT d ON d.deptCode = jh.deptCode
    WHERE s.transNo = ?
  `, [payment.transNo]);

  if (!sale) return null;

  const details = await db.query<any>(`
    SELECT 
      sd.quantity,
      ph.unitPrice
    FROM SALESDETAIL sd
    JOIN PRICEHIST ph ON ph.prodCode = sd.prodCode AND ph.effDate = (
      SELECT MAX(effDate) FROM PRICEHIST WHERE prodCode = sd.prodCode AND effDate <= ?
    )
    WHERE sd.transNo = ?
  `, [sale.salesDate, payment.transNo]);

  const totalAmount = details.reduce((sum, d) => sum + (Number(d.quantity) * Number(d.unitPrice)), 0);

  return {
    orNo: String(payment.orNo),
    payDate: String(payment.payDate),
    amount: Number(payment.amount),
    transNo: String(payment.transNo),
    salesDate: String(sale.salesDate),
    totalAmount,
    customer: {
      custNo: String(sale.custNo),
      custName: String(sale.custName),
      address: String(sale.address),
      payTerms: String(sale.payTerms),
    },
    salesRep: {
      empNo: String(sale.empNo),
      empName: String(sale.empName),
      deptName: String(sale.deptName),
    },
  };
}
