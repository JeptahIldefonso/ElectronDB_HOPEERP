'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getHopeDb, sanitizeDbError, isDatabaseReadOnly, type HopeDatabase } from '@/lib/hope-db';
import { getCurrentUser, checkUserPermission } from './auth';

function getSqliteDb(): HopeDatabase {
  return getHopeDb();
}

function getStampString(action: 'CREATED' | 'EDITED' | 'DELETED' | 'RESTORED', byUser = 'system'): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' });
  return `${action} ${byUser} ${dateStr} ${timeStr}`;
}

// ========================================================================
// SCHEMAS (Section 8, Section 9)
// ========================================================================

const addCustomerSchema = z.object({
  custNo: z.string().trim().min(1, 'Customer number is required.').max(5, 'Customer number cannot exceed 5 characters.'),
  custName: z.string().trim().min(1, 'Customer name is required (R-03).').max(20, 'Customer name cannot exceed 20 characters (Schema limit).'),
  address: z.string().trim().min(1, 'Customer address is required (R-03).').max(50, 'Address cannot exceed 50 characters (Schema limit).'),
  payTerms: z.enum(['COD', '30D', '45D'], {
    errorMap: () => ({ message: 'Choose an existing payment term: COD, 30D (Net 30) or 45D (Net 45) (R-04).' }),
  }),
});

const updateCustomerSchema = z.object({
  custNo: z.string().trim().min(1, 'Customer number is required.').max(5),
  custName: z.string().trim().min(1, 'Customer name is required (R-03).').max(20, 'Customer name cannot exceed 20 characters (Schema limit).'),
  address: z.string().trim().min(1, 'Customer address is required (R-03).').max(50, 'Address cannot exceed 50 characters (Schema limit).'),
  payTerms: z.enum(['COD', '30D', '45D'], {
    errorMap: () => ({ message: 'Choose an existing payment term: COD, 30D (Net 30) or 45D (Net 45) (R-04).' }),
  }),
});

const recordPaymentSchema = z.object({
  orNo: z.union([
    z.string().min(1, 'OR number is required (R-08).'),
    z.number().int().positive('OR number must be a positive integer (R-08).'),
  ]),
  payDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid payment date in YYYY-MM-DD format is required.'),
  amount: z
    .number()
    .positive('Payment amount must be greater than zero (R-07).')
    .refine((val) => Number(val.toFixed(2)) === val, {
      message: 'Payment amount cannot have more than 2 decimal places (R-07).',
    }),
  transNo: z.union([
    z.string().min(1, 'Sales transaction number is required (R-05).'),
    z.number().int().positive('Sales transaction number is required (R-05).'),
  ]),
  custNo: z.union([
    z.string().min(1, 'Customer number is required.'),
    z.number().int().positive('Customer number is required.'),
  ]),
});

export type AddCustomerInput = {
  custNo: string | number;
  custName: string;
  address: string;
  payTerms: 'COD' | '30D' | '45D';
};
export type UpdateCustomerInput = {
  custNo: string | number;
  custName: string;
  address: string;
  payTerms: 'COD' | '30D' | '45D';
};
export type RecordPaymentInput = {
  orNo: string | number;
  payDate: string;
  amount: number;
  transNo: string | number;
  custNo: string | number;
};

// ========================================================================
// ACTIONS
// ========================================================================

/**
 * Add a new customer (Admin & Sales only)
 */
export async function addCustomerAction(input: AddCustomerInput) {
  try {
    if (isDatabaseReadOnly()) {
      return { error: 'This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development or with Turso configured.' };
    }

    const auth = await checkUserPermission('add_customer');
    if (!auth.authorized) {
      return { error: auth.error || 'Access denied: Missing right add_customer.' };
    }
    const user = auth.user;
    const userName = user?.fullName || user?.email?.split('@')[0] || 'staff';

    // Normalize custNo string (e.g. 83 -> C0083, c0083 -> C0083)
    let rawCustNo = String(input.custNo).trim().toUpperCase();
    if (/^\d+$/.test(rawCustNo)) {
      rawCustNo = `C${rawCustNo.padStart(4, '0')}`;
    }

    const validated = addCustomerSchema.parse({
      ...input,
      custNo: rawCustNo,
    });

    const db = getSqliteDb();

    // R-02: Check unique custNo
    const existing = await db.get('SELECT 1 FROM CUSTOMER WHERE custNo = ?', [validated.custNo]);
    if (existing) {
      return { error: `Customer number ${validated.custNo} is already in use (R-02).` };
    }

    const stampStr = getStampString('CREATED', userName);

    await db.run(`
      INSERT INTO CUSTOMER (custNo, custName, address, payterm, is_deleted, stamp)
      VALUES (?, ?, ?, ?, 0, ?)
    `, [validated.custNo, validated.custName, validated.address, validated.payTerms, stampStr]);

    // Audit log
    try {
      await db.run(`
        INSERT INTO audit_log (table_name, action, record_key, new_values, action_by)
        VALUES ('CUSTOMER', 'ADD', ?, ?, ?)
      `, [
        validated.custNo,
        JSON.stringify({ custName: validated.custName, address: validated.address, payterm: validated.payTerms }),
        userName
      ]);
    } catch {
      // Non-blocking if audit_log table does not exist
    }

    revalidatePath('/customers');
    return { success: true, custNo: validated.custNo };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to add customer.') };
  }
}

/**
 * Edit an existing customer (Admin & Sales only, custNo is immutable)
 */
export async function updateCustomerAction(input: UpdateCustomerInput) {
  try {
    if (isDatabaseReadOnly()) {
      return { error: 'This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development or with Turso configured.' };
    }

    const auth = await checkUserPermission('edit_customer');
    if (!auth.authorized) {
      return { error: auth.error || 'Access denied: Missing right edit_customer.' };
    }
    const user = auth.user;
    const userName = user?.fullName || user?.email?.split('@')[0] || 'staff';

    let rawCustNo = String(input.custNo).trim().toUpperCase();
    if (/^\d+$/.test(rawCustNo)) {
      rawCustNo = `C${rawCustNo.padStart(4, '0')}`;
    }

    const validated = updateCustomerSchema.parse({
      ...input,
      custNo: rawCustNo,
    });

    const db = getSqliteDb();

    const existing = await db.get<any>('SELECT custName, address, payterm FROM CUSTOMER WHERE custNo = ?', [validated.custNo]);
    if (!existing) {
      return { error: `Customer #${validated.custNo} was not found.` };
    }

    const stampStr = getStampString('EDITED', userName);

    await db.run(`
      UPDATE CUSTOMER 
      SET custName = ?, address = ?, payterm = ?, stamp = ?
      WHERE custNo = ?
    `, [validated.custName, validated.address, validated.payTerms, stampStr, validated.custNo]);

    // Audit log
    try {
      await db.run(`
        INSERT INTO audit_log (table_name, action, record_key, old_values, new_values, action_by)
        VALUES ('CUSTOMER', 'EDIT', ?, ?, ?, ?)
      `, [
        validated.custNo,
        JSON.stringify(existing),
        JSON.stringify({ custName: validated.custName, address: validated.address, payterm: validated.payTerms }),
        userName
      ]);
    } catch {
      // Non-blocking
    }

    revalidatePath('/customers');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to update customer.') };
  }
}

/**
 * Soft delete a customer (Admin & Sales only).
 * Sets is_deleted = 1 and records audit stamp.
 */
export async function deleteCustomerAction(custNo: string) {
  try {
    if (isDatabaseReadOnly()) {
      return { error: 'This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development or with Turso configured.' };
    }

    const auth = await checkUserPermission('delete_customer');
    if (!auth.authorized) {
      return { error: auth.error || 'Access denied: Missing right delete_customer.' };
    }
    const user = auth.user;
    const userName = user?.fullName || user?.email?.split('@')[0] || 'staff';
    const cleanCustNo = String(custNo).trim();

    const db = getSqliteDb();

    const existing = await db.get<any>('SELECT is_deleted FROM CUSTOMER WHERE custNo = ?', [cleanCustNo]);
    if (!existing) {
      return { error: `Customer #${cleanCustNo} was not found.` };
    }

    if (existing.is_deleted === 1 || existing.is_deleted === true) {
      return { error: `Customer #${cleanCustNo} is already marked inactive.` };
    }

    const stampStr = getStampString('DELETED', userName);

    await db.run(`
      UPDATE CUSTOMER 
      SET is_deleted = 1, stamp = ?
      WHERE custNo = ?
    `, [stampStr, cleanCustNo]);

    // Audit log
    try {
      await db.run(`
        INSERT INTO audit_log (table_name, action, record_key, action_by)
        VALUES ('CUSTOMER', 'DELETE', ?, ?)
      `, [cleanCustNo, userName]);
    } catch {
      // Non-blocking
    }

    revalidatePath('/customers');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to soft-delete customer.') };
  }
}

/**
 * Restore an inactive customer (Admin & Sales only).
 * Sets is_deleted = 0 and records audit stamp.
 */
export async function restoreCustomerAction(custNo: string) {
  try {
    if (isDatabaseReadOnly()) {
      return { error: 'This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development or with Turso configured.' };
    }

    const user = await getCurrentUser();
    const role = (user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') {
      return { error: 'Access denied: Only administrators can restore soft-deleted records.' };
    }

    const userName = user?.fullName || user?.email?.split('@')[0] || role;
    const cleanCustNo = String(custNo).trim();

    const db = getSqliteDb();

    const existing = await db.get<any>('SELECT is_deleted FROM CUSTOMER WHERE custNo = ?', [cleanCustNo]);
    if (!existing) {
      return { error: `Customer #${cleanCustNo} was not found.` };
    }

    if (!existing.is_deleted) {
      return { error: `Customer #${cleanCustNo} is already active.` };
    }

    const stampStr = getStampString('RESTORED', userName);

    await db.run(`
      UPDATE CUSTOMER 
      SET is_deleted = 0, stamp = ?
      WHERE custNo = ?
    `, [stampStr, cleanCustNo]);

    // Audit log
    try {
      await db.run(`
        INSERT INTO audit_log (table_name, action, record_key, action_by)
        VALUES ('CUSTOMER', 'RESTORE', ?, ?)
      `, [cleanCustNo, userName]);
    } catch {
      // Non-blocking
    }

    revalidatePath('/customers');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to restore customer.') };
  }
}

/**
 * Record payment (kept for API compatibility if invoked)
 */
export async function recordCustomerPaymentAction(input: RecordPaymentInput) {
  try {
    if (isDatabaseReadOnly()) {
      return { error: 'This deployed environment is in read-only demo mode to protect canonical data. Writes are available in local development or with Turso configured.' };
    }

    const user = await getCurrentUser();
    const role = (user?.role || 'admin').toLowerCase();
    if (!['admin', 'superadmin', 'cashier'].includes(role)) {
      return { error: 'Unauthorized: Only Admin and Cashier roles can record payments.' };
    }

    const validated = recordPaymentSchema.parse(input);
    const db = getSqliteDb();
    const rawOr = String(validated.orNo).trim();
    const formattedOrNo = rawOr.startsWith('OR') ? rawOr : `OR${rawOr.padStart(6, '0')}`;

    const rawTrans = String(validated.transNo).trim();
    const formattedTransNo = rawTrans.startsWith('TR') ? rawTrans : `TR${rawTrans.padStart(6, '0')}`;

    const existingOr = await db.get('SELECT 1 FROM PAYMENT WHERE ORNo = ? OR ORNo = ?', [formattedOrNo, rawOr]);
    if (existingOr) {
      return { error: `That OR number (${formattedOrNo}) is already recorded (R-08).` };
    }

    const sale = await db.get<any>('SELECT salesDate, custNo FROM SALES WHERE transNo = ? OR transNo = ?', [formattedTransNo, rawTrans]);
    if (!sale) {
      return { error: `Transaction #${formattedTransNo} does not exist in Sales records (R-05).` };
    }

    await db.run(`
      INSERT INTO PAYMENT (ORNo, payDate, amount, transNo, stamp)
      VALUES (?, ?, ?, ?, 'ADD cashier ' || strftime('%Y-%m-%d %H:%M', 'now', '+8 hours'))
    `, [formattedOrNo, validated.payDate, validated.amount, sale.transNo || formattedTransNo]);

    revalidatePath('/customers');
    return { success: true, orNo: formattedOrNo };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to record payment.') };
  }
}
