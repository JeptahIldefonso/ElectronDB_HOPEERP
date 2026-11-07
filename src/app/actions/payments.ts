'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getHopeDb, sanitizeDbError, isDatabaseReadOnly } from '@/lib/hope-db';
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
    return { error: sanitizeDbError(err, 'Failed to load sales for payment.') };
  }
}

export async function recordPaymentAction(input: RecordPaymentInput) {
  try {
    if (isDatabaseReadOnly()) {
      return { error: 'This deployed environment is in read-only mode to protect canonical data. Writes are available in local development or with Turso configured.' };
    }

    // 1. Validate input parameters with Zod
    const validated = recordPaymentSchema.parse(input);

    // 2. Check user role: only authorized staff or administrators can record payments
    const user = await getCurrentUser();
    const role = (user?.role || '').toLowerCase();
    const isAllowed = role === 'admin' || role === 'superadmin' || role === 'cashier' || role === 'sales' || user?.rights?.some((r) => r.includes('sale'));
    if (!user || !isAllowed) {
      return { error: 'Access denied: Only authorized staff or administrators can record payments.' };
    }

    const db = getHopeDb();

    await db.exec('BEGIN TRANSACTION');

    try {
      // 1. Fetch sale (supports TR000001 or numeric ID)
      const rawTrans = String(validated.transNo).trim();
      const transNo = rawTrans.startsWith('TR') ? rawTrans : (/^\d+$/.test(rawTrans) ? `TR${rawTrans.padStart(6, '0')}` : rawTrans);

      const sale = await db.get<any>('SELECT transNo, salesDate FROM SALES WHERE transNo = ? OR transNo = ?', [transNo, rawTrans]);
      if (!sale) {
        await db.exec('ROLLBACK');
        return { error: `Transaction #${validated.transNo} does not exist.` };
      }

      // 2. Date checks
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      if (validated.payDate < sale.salesDate) {
        await db.exec('ROLLBACK');
        return { error: `Payment date cannot be before the sale date (${sale.salesDate}).` };
      }
      if (validated.payDate > todayStr) {
        await db.exec('ROLLBACK');
        return { error: 'Payment date cannot be in the future.' };
      }

      const latestPay = await db.get<any>('SELECT MAX(payDate) AS maxDate FROM PAYMENT WHERE transNo = ?', [sale.transNo]);
      if (latestPay?.maxDate && validated.payDate < latestPay.maxDate) {
        await db.exec('ROLLBACK');
        return { error: `Payment date cannot be before the latest receipt date (${latestPay.maxDate}).` };
      }

      // 3. Compute sale total using point-in-time pricing
      const details = await db.query<any>(`
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
      `, [sale.salesDate, sale.transNo]);

      const saleTotal = details.reduce((sum, d) => sum + (Number(d.quantity) * Number(d.unitPrice)), 0);

      // 4. Compute existing payments on this sale
      const paySumRow = await db.get<any>('SELECT COALESCE(SUM(amount), 0) AS totalPaid FROM PAYMENT WHERE transNo = ?', [sale.transNo]);
      const existingPayments = Number(paySumRow?.totalPaid || 0);

      // 5. Check if total payments would exceed sale total
      if (existingPayments + validated.amount > saleTotal) {
        await db.exec('ROLLBACK');
        const formattedTotal = saleTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return { error: `Payments for this sale would exceed its total of ₱${formattedTotal}.` };
      }

      // 6. Assign next OR number in sequence
      const maxOrRow = await db.get<any>(`
        SELECT COALESCE(
          MAX(CAST(SUBSTR(ORNo, 3) AS INTEGER)),
          MAX(CAST(ORNo AS INTEGER)),
          0
        ) + 1 AS nextNum FROM PAYMENT
      `);
      const nextNum = Number(maxOrRow?.nextNum || 166);
      const orNo = `OR${String(nextNum).padStart(6, '0')}`;

      // 7. Insert payment
      await db.run(`
        INSERT INTO PAYMENT (ORNo, payDate, amount, transNo, stamp)
        VALUES (?, ?, ?, ?, 'ADD cashier ' || strftime('%Y-%m-%d %H:%M', 'now', '+8 hours'))
      `, [orNo, validated.payDate, validated.amount, sale.transNo]);

      await db.exec('COMMIT');

      revalidatePath('/payments');
      revalidatePath('/customers');
      revalidatePath('/sales');
      revalidatePath('/');

      return { success: true, orNo };
    } catch (txErr: any) {
      try {
        await db.exec('ROLLBACK');
      } catch {}
      return { error: sanitizeDbError(txErr, 'Database error executing payment.') };
    }
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to record official payment receipt.') };
  }
}
