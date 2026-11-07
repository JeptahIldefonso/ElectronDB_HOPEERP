import { createClient } from '@/lib/supabase/server';
import { getHopeDb } from '@/lib/hope-db';

export interface CustomerItem {
  custNo: string;
  custName: string;
  address: string;
  payterm: 'COD' | '30D' | '45D' | string;
  payTerms: string;
  isDeleted: boolean;
  status: 'Active' | 'Inactive';
  stamp: string | null;
}

export interface CustomerMetrics {
  totalCustomers: number;
  activeCount: number;
  inactiveCount: number;
  termCounts: Record<string, number>;
  nextSuggestedCustNo: string;
}

export interface CustomerAuditLogItem {
  auditId: number;
  action: 'ADD' | 'EDIT' | 'DELETE' | 'RESTORE';
  recordKey: string;
  oldValues: string | null;
  newValues: string | null;
  actionBy: string;
  actionAt: string;
}

// Backwards compatibility interfaces if referenced
export type CustomerOverviewItem = CustomerItem;

export interface CustomerDetailData {
  customer: {
    custNo: string | number;
    custName: string;
    address: string;
    payTerms: string;
  };
  summary: {
    ordersPlaced: number;
    totalPaid: number;
    paymentCount: number;
    unpaidOrders: number;
    lastPaymentDate: string | null;
    lastPaymentOrNo: string | number | null;
    customerSince: string | null;
  };
  paymentHistory: {
    orNo: string | number;
    payDate: string;
    amount: number;
    transNo: string | number;
  }[];
  eligibleTransactions: {
    transNo: string | number;
    salesDate: string;
  }[];
}

export interface PaymentLedgerItem {

  orNo: string | number;
  payDate: string;
  amount: number;
  transNo: string | number;
  custNo: string | number | null;
  custName: string | null;
  salesDate: string | null;
  isUnlinked: boolean;
}
export interface CustomerSummaryMetrics {
  totalCustomers: number;
  totalTermsCount: number;
  totalPayments: number;
  totalCollected: number;
  unpaidOrdersCount: number;
  termCounts: Record<string, number>;
}
export interface CustomerSalesSummaryItem {
  transNo: string | number;
  custNo: string | number;
  salesDate: string;
}

function getSqliteDb() {
  return getHopeDb();
}

function isSupabaseLive(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('your-anon')
  );
}

/**
 * Fetch Customer management list, metrics, and audit log.
 * Purely bound to CUSTOMER table (No PAYMENT table joins).
 */
export async function getCustomersPageData(): Promise<{
  customers: CustomerItem[];
  metrics: CustomerMetrics;
  recentAudits: CustomerAuditLogItem[];
}> {
  if (isSupabaseLive()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('CUSTOMER')
        .select('custNo, custName, address, payterm, is_deleted, stamp')
        .order('custNo', { ascending: true });

      if (!error && data) {
        const customers: CustomerItem[] = data.map((r: any) => {
          const isDeleted = Boolean(r.is_deleted === 1 || r.is_deleted === true || r.is_deleted === '1');
          return {
            custNo: String(r.custNo),
            custName: String(r.custName || ''),
            address: String(r.address || ''),
            payterm: String(r.payterm || 'COD'),
            payTerms: String(r.payterm || 'COD'),
            isDeleted,
            status: isDeleted ? 'Inactive' : 'Active',
            stamp: r.stamp ? String(r.stamp) : null,
          };
        });

        let maxNum = 0;
        for (const c of customers) {
          const match = c.custNo.match(/^C(\d+)$/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        }
        const nextSuggestedCustNo = `C${String(maxNum > 0 ? maxNum + 1 : customers.length + 1).padStart(4, '0')}`;

        const activeCount = customers.filter((c) => !c.isDeleted).length;
        const inactiveCount = customers.filter((c) => c.isDeleted).length;

        const termCounts: Record<string, number> = { ALL: customers.length, COD: 0, '30D': 0, '45D': 0 };
        for (const c of customers) {
          const t = c.payterm;
          termCounts[t] = (termCounts[t] || 0) + 1;
        }

        return {
          customers,
          metrics: {
            totalCustomers: customers.length,
            activeCount,
            inactiveCount,
            termCounts,
            nextSuggestedCustNo,
          },
          recentAudits: [],
        };
      }
    } catch {
      // Fallback to SQLite
    }
  }

  // SQLite implementation directly querying canonical CUSTOMER table
  const db = getHopeDb();

  const rows = await db.query(`
    SELECT custNo, custName, address, payterm, is_deleted, stamp 
    FROM CUSTOMER 
    ORDER BY custNo ASC
  `);

  const customers: CustomerItem[] = rows.map((r) => {
    const isDeleted = Boolean(r.is_deleted === 1 || r.is_deleted === true || r.is_deleted === '1');
    return {
      custNo: String(r.custNo),
      custName: String(r.custName || ''),
      address: String(r.address || ''),
      payterm: String(r.payterm || 'COD'),
      payTerms: String(r.payterm || 'COD'),
      isDeleted,
      status: isDeleted ? 'Inactive' : 'Active',
      stamp: r.stamp ? String(r.stamp) : null,
    };
  });

  let maxNum = 0;
  for (const c of customers) {
    const match = c.custNo.match(/^C(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  const nextSuggestedCustNo = `C${String(maxNum > 0 ? maxNum + 1 : customers.length + 1).padStart(4, '0')}`;

  const activeCount = customers.filter((c) => !c.isDeleted).length;
  const inactiveCount = customers.filter((c) => c.isDeleted).length;

  const termCounts: Record<string, number> = { ALL: customers.length, COD: 0, '30D': 0, '45D': 0 };
  for (const c of customers) {
    const t = c.payterm || 'COD';
    termCounts[t] = (termCounts[t] || 0) + 1;
  }

  let recentAudits: CustomerAuditLogItem[] = [];
  try {
    const auditRows = await db.query(`
      SELECT audit_id, action, record_key, old_values, new_values, action_by, action_at
      FROM audit_log
      WHERE table_name = 'CUSTOMER'
      ORDER BY audit_id DESC
      LIMIT 20
    `);

    recentAudits = auditRows.map((a) => ({
      auditId: Number(a.audit_id),
      action: a.action,
      recordKey: String(a.record_key || ''),
      oldValues: a.old_values ? String(a.old_values) : null,
      newValues: a.new_values ? String(a.new_values) : null,
      actionBy: String(a.action_by || 'system'),
      actionAt: String(a.action_at || ''),
    }));
  } catch {
    // Non-critical if audit table is empty
  }

  return {
    customers,
    metrics: {
      totalCustomers: customers.length,
      activeCount,
      inactiveCount,
      termCounts,
      nextSuggestedCustNo,
    },
    recentAudits,
  };
}
