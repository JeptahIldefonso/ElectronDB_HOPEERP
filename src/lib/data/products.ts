import { createClient } from '@/lib/supabase/server';
import { getHopeDb, type DatabaseSync } from '@/lib/hope-db';

export interface ProductItem {
  prodCode: string;
  description: string;
  unit: string;
  currentPrice: number | null;
  currentPriceEffDate: string | null;
  priceCount: number;
  isDeleted: boolean;
  status: 'Active' | 'Inactive';
  stamp: string | null;
}

export interface PriceRecordItem {
  effDate: string;
  prodCode: string;
  unitPrice: number;
  isDeleted: boolean;
  status: 'Active' | 'Inactive';
  stamp: string | null;
}

export interface ProductsMetrics {
  totalProducts: number;
  activeCount: number;
  inactiveCount: number;
  totalPriceRecords: number;
  unitCounts: Record<string, number>;
  nextSuggestedProdCode: string;
}

export interface ProductAuditLogItem {
  auditId: number;
  tableName: 'PRODUCT' | 'PRICEHIST' | string;
  action: 'ADD' | 'EDIT' | 'DELETE' | 'RESTORE';
  recordKey: string;
  oldValues: string | null;
  newValues: string | null;
  actionBy: string;
  actionAt: string;
}

// Backwards compatibility interfaces
export type ProductOverviewItem = any;
export type PriceHistoryItem = any;
export type ProductsSummaryMetrics = any;
export type ProductDetailItem = any;

function getSqliteDb(): DatabaseSync {
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
 * Fetch products list with derived current price, price history records, and audit log.
 */
export async function getProductsPageData(): Promise<{
  products: ProductItem[];
  priceHistory: PriceRecordItem[];
  metrics: ProductsMetrics;
  recentAudits: ProductAuditLogItem[];
}> {
  if (isSupabaseLive()) {
    try {
      const supabase = await createClient();
      const [prodsRes, pricesRes] = await Promise.all([
        supabase.from('PRODUCT').select('*').order('prodCode', { ascending: true }),
        supabase.from('PRICEHIST').select('*').order('effDate', { ascending: false }),
      ]);

      if (!prodsRes.error && prodsRes.data) {
        const rawPrices: PriceRecordItem[] = (pricesRes.data || []).map((p: any) => ({
          effDate: String(p.effDate),
          prodCode: String(p.prodCode),
          unitPrice: Number(p.unitPrice),
          isDeleted: Boolean(p.is_deleted === 1 || p.is_deleted === true || p.is_deleted === '1'),
          status: (p.is_deleted === 1 || p.is_deleted === true || p.is_deleted === '1') ? 'Inactive' : 'Active',
          stamp: p.stamp ? String(p.stamp) : null,
        }));

        const todayManila = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

        const products: ProductItem[] = prodsRes.data.map((r: any) => {
          const isDeleted = Boolean(r.is_deleted === 1 || r.is_deleted === true || r.is_deleted === '1');
          const pPrices = rawPrices.filter((ph) => ph.prodCode === r.prodCode && !ph.isDeleted && ph.effDate <= todayManila);
          pPrices.sort((a, b) => b.effDate.localeCompare(a.effDate));
          const currentRec = isDeleted ? null : pPrices[0];

          return {
            prodCode: String(r.prodCode),
            description: String(r.description || ''),
            unit: String(r.unit || 'pc'),
            currentPrice: currentRec ? currentRec.unitPrice : null,
            currentPriceEffDate: currentRec ? currentRec.effDate : null,
            priceCount: rawPrices.filter((ph) => ph.prodCode === r.prodCode).length,
            isDeleted,
            status: isDeleted ? 'Inactive' : 'Active',
            stamp: r.stamp ? String(r.stamp) : null,
          };
        });

        const activeCount = products.filter((p) => !p.isDeleted).length;
        const inactiveCount = products.filter((p) => p.isDeleted).length;

        const unitCounts: Record<string, number> = {};
        for (const p of products) {
          unitCounts[p.unit] = (unitCounts[p.unit] || 0) + 1;
        }

        return {
          products,
          priceHistory: rawPrices,
          metrics: {
            totalProducts: products.length,
            activeCount,
            inactiveCount,
            totalPriceRecords: rawPrices.length,
            unitCounts,
            nextSuggestedProdCode: `P-${String(products.length + 1).padStart(3, '0')}`,
          },
          recentAudits: [],
        };
      }
    } catch {
      // Fallback to SQLite
    }
  }

  // SQLite implementation
  const db = getSqliteDb();

  const prodRows = db.prepare(`
    SELECT 
      p.prodCode, 
      p.description, 
      p.unit, 
      p.is_deleted, 
      p.stamp,
      (
        SELECT ph.unitPrice 
        FROM PRICEHIST ph 
        WHERE ph.prodCode = p.prodCode 
          AND ph.effDate <= date('now', '+8 hours')
          AND ph.is_deleted = 0
        ORDER BY ph.effDate DESC 
        LIMIT 1
      ) AS currentPrice,
      (
        SELECT ph.effDate 
        FROM PRICEHIST ph 
        WHERE ph.prodCode = p.prodCode 
          AND ph.effDate <= date('now', '+8 hours')
          AND ph.is_deleted = 0
        ORDER BY ph.effDate DESC 
        LIMIT 1
      ) AS currentPriceEffDate,
      (
        SELECT count(*) 
        FROM PRICEHIST ph 
        WHERE ph.prodCode = p.prodCode
      ) AS priceCount
    FROM PRODUCT p
    ORDER BY p.prodCode ASC
  `).all() as any[];

  const priceRows = db.prepare(`
    SELECT effDate, prodCode, unitPrice, is_deleted, stamp
    FROM PRICEHIST
    ORDER BY effDate DESC, prodCode ASC
  `).all() as any[];

  const priceHistory: PriceRecordItem[] = priceRows.map((r) => {
    const isDeleted = Boolean(r.is_deleted === 1 || r.is_deleted === true || r.is_deleted === '1');
    return {
      effDate: String(r.effDate),
      prodCode: String(r.prodCode),
      unitPrice: Number(r.unitPrice),
      isDeleted,
      status: isDeleted ? 'Inactive' : 'Active',
      stamp: r.stamp ? String(r.stamp) : null,
    };
  });

  const products: ProductItem[] = prodRows.map((r) => {
    const isDeleted = Boolean(r.is_deleted === 1 || r.is_deleted === true || r.is_deleted === '1');
    return {
      prodCode: String(r.prodCode),
      description: String(r.description || ''),
      unit: String(r.unit || 'pc'),
      // If product is soft-deleted, current price is displayed as null ("—")
      currentPrice: isDeleted ? null : (r.currentPrice != null ? Number(r.currentPrice) : null),
      currentPriceEffDate: isDeleted ? null : (r.currentPriceEffDate ? String(r.currentPriceEffDate) : null),
      priceCount: Number(r.priceCount || 0),
      isDeleted,
      status: isDeleted ? 'Inactive' : 'Active',
      stamp: r.stamp ? String(r.stamp) : null,
    };
  });

  const activeCount = products.filter((p) => !p.isDeleted).length;
  const inactiveCount = products.filter((p) => p.isDeleted).length;

  const unitCounts: Record<string, number> = {};
  for (const p of products) {
    unitCounts[p.unit] = (unitCounts[p.unit] || 0) + 1;
  }

  // Calculate next suggested product code
  // If codes are like P-001, find max. If AD0001, find next.
  let maxPNum = 0;
  for (const p of products) {
    const m = p.prodCode.match(/^P-?(\d+)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxPNum) maxPNum = n;
    }
  }
  const nextSuggestedProdCode = maxPNum > 0 
    ? `P-${String(maxPNum + 1).padStart(3, '0')}`
    : `P-${String(products.length + 1).padStart(3, '0')}`;

  let recentAudits: ProductAuditLogItem[] = [];
  try {
    const auditRows = db.prepare(`
      SELECT audit_id, table_name, action, record_key, old_values, new_values, action_by, action_at
      FROM audit_log
      WHERE table_name IN ('PRODUCT', 'PRICEHIST')
      ORDER BY audit_id DESC
      LIMIT 30
    `).all() as any[];

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
    // Audit table empty or optional
  }

  return {
    products,
    priceHistory,
    metrics: {
      totalProducts: products.length,
      activeCount,
      inactiveCount,
      totalPriceRecords: priceHistory.length,
      unitCounts,
      nextSuggestedProdCode,
    },
    recentAudits,
  };
}
