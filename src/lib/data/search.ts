import { getHopeDb } from '@/lib/hope-db';
import { createClient } from '@/lib/supabase/server';
import { formatPHP, formatDate } from '@/lib/utils';
import { parseProductDescription } from '@/lib/products';

export interface GlobalSearchResult {
  type: 'customer' | 'sale' | 'product' | 'receipt';
  id: string | number;
  title: string;
  subtitle: string;
  url: string;
}

export async function globalSearch(query: string): Promise<GlobalSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 1) return [];

  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('your-anon');

  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient();
      const results: GlobalSearchResult[] = [];

      // 1. Customers
      const { data: customers } = await supabase
        .from('CUSTOMER')
        .select('custNo, custName, payTerms')
        .ilike('custName', `%${trimmed}%`)
        .limit(4);

      if (customers) {
        customers.forEach((c) => {
          results.push({
            type: 'customer',
            id: c.custNo,
            title: c.custName,
            subtitle: `Customer #${c.custNo} • Terms: ${c.payTerms}`,
            url: `/customers?custNo=${c.custNo}`,
          });
        });
      }

      // 2. Receipts by OR number
      const orNum = parseInt(trimmed.replace(/^OR\s*#?/i, ''), 10);
      if (!isNaN(orNum)) {
        const { data: receipts } = await supabase
          .from('PAYMENT')
          .select('ORNo, payDate, amount, SALES(custNo, CUSTOMER(custName))')
          .eq('ORNo', orNum)
          .limit(4);

        if (receipts) {
          receipts.forEach((r: any) => {
            const custNo = r.SALES?.custNo;
            const custName = r.SALES?.CUSTOMER?.custName || `Customer #${custNo}`;
            results.push({
              type: 'receipt',
              id: r.ORNo,
              title: `Official Receipt #${r.ORNo} — ${custName}`,
              subtitle: `${formatDate(r.payDate)} • Amount: ${formatPHP(r.amount)}`,
              url: `/customers?custNo=${custNo}&tab=payments`,
            });
          });
        }
      }

      // 3. Sales by transaction number
      const transNum = parseInt(trimmed.replace(/^#/, ''), 10);
      let salesQuery = supabase.from('v_sales_summary').select('*');
      if (!isNaN(transNum)) {
        salesQuery = salesQuery.eq('transNo', transNum);
      } else {
        salesQuery = salesQuery.ilike('custName', `%${trimmed}%`);
      }
      const { data: sales } = await salesQuery.limit(4);

      if (sales) {
        sales.forEach((s) => {
          results.push({
            type: 'sale',
            id: s.transNo,
            title: `Sale #${s.transNo} — ${s.custName}`,
            subtitle: `${formatDate(s.salesDate)} • Total: ${formatPHP(s.totalAmount)}`,
            url: `/sales/${s.transNo}`,
          });
        });
      }

      // 4. Products by code or description
      const { data: products } = await supabase
        .from('v_product_sales_analytics')
        .select('*')
        .or(`prodCode.ilike.%${trimmed}%,description.ilike.%${trimmed}%`)
        .limit(4);

      if (products) {
        products.forEach((p) => {
          const parsed = parseProductDescription(p.prodCode, p.description, p.unit);
          results.push({
            type: 'product',
            id: p.prodCode,
            title: `${p.prodCode} — ${parsed.title}`,
            subtitle: `${p.unit} • Price: ${formatPHP(p.currentPrice || 0)}`,
            url: `/products/${p.prodCode}`,
          });
        });
      }

      return results;
    } catch {
      // Fallback to SQLite
    }
  }

  // Local SQLite search
  return getLocalSearchResults(trimmed);
}

function getLocalSearchResults(query: string): GlobalSearchResult[] {
  const db = getHopeDb();
  const results: GlobalSearchResult[] = [];
  const likePattern = `%${query}%`;

  // 1. Search Customers by name or number
  const customers = db.prepare(`
    SELECT custNo, custName, payTerms
    FROM CUSTOMER
    WHERE custName LIKE ? OR CAST(custNo AS TEXT) LIKE ?
    LIMIT 4
  `).all(likePattern, likePattern) as any[];

  customers.forEach((c) => {
    results.push({
      type: 'customer',
      id: c.custNo,
      title: c.custName,
      subtitle: `Customer #${c.custNo} • Terms: ${c.payTerms}`,
      url: `/customers?custNo=${c.custNo}`,
    });
  });

  // 2. Search Receipts by OR number (Task D: OR numbers open that customer's Payments tab)
  const orDigits = query.replace(/^OR\s*#?/i, '').trim();
  if (orDigits.length > 0) {
    const receipts = db.prepare(`
      SELECT p.ORNo, p.payDate, p.amount, s.custNo, c.custName
      FROM PAYMENT p
      JOIN SALES s ON p.transNo = s.transNo
      JOIN CUSTOMER c ON s.custNo = c.custNo
      WHERE CAST(p.ORNo AS TEXT) LIKE ?
      LIMIT 4
    `).all(`%${orDigits}%`) as any[];

    receipts.forEach((r) => {
      results.push({
        type: 'receipt',
        id: r.ORNo,
        title: `Official Receipt #${r.ORNo} — ${r.custName}`,
        subtitle: `${formatDate(r.payDate)} • Amount: ${formatPHP(r.amount)}`,
        url: `/customers?custNo=${r.custNo}&tab=payments`,
      });
    });
  }

  // 3. Search Sales Transactions by transNo or customer name
  const sales = db.prepare(`
    SELECT transNo, salesDate, custName, totalAmount
    FROM v_sales_summary
    WHERE CAST(transNo AS TEXT) LIKE ? OR custName LIKE ?
    LIMIT 4
  `).all(likePattern, likePattern) as any[];

  sales.forEach((s) => {
    results.push({
      type: 'sale',
      id: s.transNo,
      title: `Sale #${s.transNo} — ${s.custName}`,
      subtitle: `${formatDate(s.salesDate)} • Total: ${formatPHP(s.totalAmount)}`,
      url: `/sales/${s.transNo}`,
    });
  });

  // 4. Search Products by prodCode or description
  const products = db.prepare(`
    SELECT prodCode, description, unit, currentPrice
    FROM v_product_sales_analytics
    WHERE prodCode LIKE ? OR description LIKE ?
    LIMIT 4
  `).all(likePattern, likePattern) as any[];

  products.forEach((p) => {
    const parsed = parseProductDescription(p.prodCode, p.description, p.unit);
    results.push({
      type: 'product',
      id: p.prodCode,
      title: `${p.prodCode} — ${parsed.title}`,
      subtitle: `${p.unit} • Price: ${formatPHP(p.currentPrice || 0)}`,
      url: `/products/${p.prodCode}`,
    });
  });

  return results;
}
