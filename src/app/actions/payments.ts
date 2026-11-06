'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getHopeDb } from '@/lib/hope-db';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from './auth';
import { getSalesForPayment, getNextORNumberPreview } from '@/lib/data/payments';

const recordPaymentSchema = z.object({
  transNo: z.union([
    z.string().min(1, 'Transaction number is required'),
    z.number().int().positive('Transaction number is required'),
  ]),
  amount: z.number().positive('Payment amount must be greater than zero'),
  payDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid payment date (YYYY-MM-DD) is required'),
});

export type RecordPaymentInput = {
  transNo: string | number;
  amount: number;
  payDate: string;
};

export async function getPaymentFormDataAction(filter?: { transNo?: string | number; custNo?: string | number }) {
  try {
    const nextOrPreview = await getNextORNumberPreview();
    const rawSales = await getSalesForPayment();
    let sales = rawSales;
    if (filter?.custNo) {
      sales = sales.filter((s) => String(s.custNo) === String(filter.custNo));
    }
    if (filter?.transNo) {
      sales = sales.filter((s) => String(s.transNo) === String(filter.transNo));
    }
    return { sales, nextOrPreview };
  } catch (err: any) {
    return { error: err?.message || 'Failed to load sales for payment' };
  }
}

export async function recordPaymentAction(input: RecordPaymentInput) {
  try {
    // 1. Validate input parameters with Zod
    const validated = recordPaymentSchema.parse(input);

    // 2. Check user role: only authorized staff or administrators can record payments
    const user = await getCurrentUser();
    const role = (user?.role || '').toLowerCase();
    const isAllowed = role === 'admin' || role === 'superadmin' || role === 'cashier' || role === 'sales' || user?.rights?.some((r) => r.includes('sale'));
    if (!user || !isAllowed) {
      return { error: 'Access denied: Only authorized staff or administrators can record payments.' };
    }

    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('your-anon');

    if (isSupabaseConfigured) {
      try {
        const supabase = await createClient();

        // Call Postgres RPC function which handles row locking, advisory locking, date checks, total checks, and sequenced OR insertion
        const { data, error } = await supabase.rpc('record_payment_receipt', {
          p_trans_no: validated.transNo,
          p_amount: validated.amount,
          p_pay_date: validated.payDate,
        });

        if (error) {
          return { error: error.message };
        }

        revalidatePath('/payments');
        revalidatePath('/customers');
        revalidatePath('/sales');
        revalidatePath('/');
        return { success: true, orNo: (data as any)?.orNo };
      } catch (err: any) {
        return { error: err?.message || 'Database error recording payment' };
      }
    }

    // SQLite fallback with matching transactional constraints
    const db = getHopeDb();

    db.exec('BEGIN IMMEDIATE');

    try {
      // 1. Fetch sale (supports TR000001 or numeric ID)
      const rawTrans = String(validated.transNo).trim();
      const transNo = rawTrans.startsWith('TR') ? rawTrans : (/^\d+$/.test(rawTrans) ? `TR${rawTrans.padStart(6, '0')}` : rawTrans);

      const sale = db.prepare('SELECT transNo, salesDate FROM SALES WHERE transNo = ? OR transNo = ?').get(transNo, rawTrans) as any;
      if (!sale) {
        db.exec('ROLLBACK');
        return { error: `Transaction #${validated.transNo} does not exist.` };
      }

      // 2. Date checks
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      if (validated.payDate < sale.salesDate) {
        db.exec('ROLLBACK');
        return { error: `Payment date cannot be before the sale date (${sale.salesDate}).` };
      }
      if (validated.payDate > todayStr) {
        db.exec('ROLLBACK');
        return { error: 'Payment date cannot be in the future.' };
      }

      const latestPay = db.prepare('SELECT MAX(payDate) AS maxDate FROM PAYMENT WHERE transNo = ?').get(sale.transNo) as any;
      if (latestPay?.maxDate && validated.payDate < latestPay.maxDate) {
        db.exec('ROLLBACK');
        return { error: `Payment date cannot be before the latest receipt date (${latestPay.maxDate}).` };
      }

      // 3. Compute sale total using point-in-time pricing
      const details = db.prepare(`
        SELECT 
          sd.quantity,
          ph.unitPrice
        FROM SALESDETAIL sd
        JOIN PRICEHIST ph ON ph.prodCode = sd.prodCode AND ph.effDate = (
          SELECT MAX(ph2.effDate)
          FROM PRICEHIST ph2
          WHERE ph2.prodCode = sd.prodCode AND ph2.effDate <= ?
        )
        WHERE sd.transNo = ?
      `).all(sale.salesDate, sale.transNo) as any[];

      const saleTotal = details.reduce((sum, d) => sum + (Number(d.quantity) * Number(d.unitPrice)), 0);

      // 4. Compute existing payments on this sale
      const paySumRow = db.prepare('SELECT COALESCE(SUM(amount), 0) AS totalPaid FROM PAYMENT WHERE transNo = ?').get(sale.transNo) as any;
      const existingPayments = Number(paySumRow.totalPaid);

      // 5. Check if total payments would exceed sale total
      if (existingPayments + validated.amount > saleTotal) {
        db.exec('ROLLBACK');
        const formattedTotal = saleTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return { error: `Payments for this sale would exceed its total of ₱${formattedTotal}.` };
      }

      // 6. Assign next OR number in sequence
      const maxOrRow = db.prepare(`
        SELECT COALESCE(
          MAX(CAST(SUBSTR(ORNo, 3) AS INTEGER)),
          MAX(CAST(ORNo AS INTEGER)),
          0
        ) + 1 AS nextNum FROM PAYMENT
      `).get() as any;
      const nextNum = Number(maxOrRow?.nextNum || 166);
      const orNo = `OR${String(nextNum).padStart(6, '0')}`;

      // 7. Insert payment
      db.prepare(`
        INSERT INTO PAYMENT (ORNo, payDate, amount, transNo, stamp)
        VALUES (?, ?, ?, ?, 'ADD cashier ' || strftime('%Y-%m-%d %H:%M', 'now', '+8 hours'))
      `).run(orNo, validated.payDate, validated.amount, sale.transNo);

      db.exec('COMMIT');

      revalidatePath('/payments');
      revalidatePath('/customers');
      revalidatePath('/sales');
      revalidatePath('/');

      return { success: true, orNo };
    } catch (txErr: any) {
      db.exec('ROLLBACK');
      return { error: txErr?.message || 'Database error executing payment' };
    }
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return { error: err.errors[0]?.message || 'Invalid payment parameters' };
    }
    return { error: err?.message || 'Failed to record official payment receipt' };
  }
}
