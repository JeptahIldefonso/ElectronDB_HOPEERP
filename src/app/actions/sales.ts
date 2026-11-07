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

async function ensureStaff() {
  const user = await getCurrentUser();
  const role = (user?.role || '').toLowerCase();
  if (!user || (!['admin', 'superadmin', 'sales'].includes(role))) {
    throw new Error('Access denied. Staff privileges required.');
  }
  return user?.fullName || user?.email?.split('@')[0] || role;
}

async function ensurePermission(rightCode: string) {
  const auth = await checkUserPermission(rightCode);
  if (!auth.authorized) {
    throw new Error(auth.error || `Access denied. Missing right '${rightCode}'.`);
  }
  return auth.user?.fullName || auth.user?.email?.split('@')[0] || 'staff';
}

async function logAudit(
  db: HopeDatabase,
  tableName: string,
  action: string,
  recordKey: string,
  oldValues: any,
  newValues: any,
  actionBy: string
) {
  try {
    await db.run(`
      INSERT INTO audit_log (table_name, action, record_key, old_values, new_values, action_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      tableName,
      action,
      recordKey,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      actionBy
    ]);
  } catch {
    // Non-blocking
  }
}

// ========================================================================
// SCHEMAS
// ========================================================================

const createSaleHeaderSchema = z.object({
  salesDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid sales date (YYYY-MM-DD) is required'),
  custNo: z.string().trim().min(1, 'Customer is required'),
  empNo: z.string().trim().min(1, 'Salesperson is required'),
});

const updateSaleHeaderSchema = z.object({
  transNo: z.string().trim().min(1, 'Transaction number is required'),
  salesDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid sales date is required'),
  custNo: z.string().trim().min(1, 'Customer is required'),
  empNo: z.string().trim().min(1, 'Salesperson is required'),
});

const lineItemSchema = z.object({
  transNo: z.string().trim().min(1, 'Transaction number is required'),
  prodCode: z.string().trim().min(1, 'Product is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(99999),
});

// ========================================================================
// 1. CREATE SALE HEADER ACTION (Figure 24)
// ========================================================================
export async function createSaleHeaderAction(input: z.infer<typeof createSaleHeaderSchema>) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only mode to protect canonical data. Writes are available in local development." };
    const userName = await ensurePermission('add_sale');
    const validated = createSaleHeaderSchema.parse(input);

    const db = getSqliteDb();

    // Verify Customer exists
    const cust = await db.get('SELECT custNo FROM CUSTOMER WHERE custNo = ? AND is_deleted = 0', [validated.custNo]);
    if (!cust) return { error: `Customer "${validated.custNo}" does not exist or is inactive.` };

    // Verify Employee exists
    const emp = await db.get('SELECT empNo FROM EMPLOYEE WHERE empNo = ? AND is_deleted = 0', [validated.empNo]);
    if (!emp) return { error: `Employee "${validated.empNo}" does not exist or is inactive.` };

    // Auto-number transaction number (Figure 24 rule 1: auto-numbered)
    const nextRow = await db.get<any>(`
      SELECT COALESCE(
        MAX(CAST(SUBSTR(transNo, 3) AS INTEGER)),
        MAX(CAST(transNo AS INTEGER)),
        0
      ) + 1 AS nextNum FROM SALES
    `);
    const nextNum = Number(nextRow?.nextNum || 125);
    const transNo = `TR${String(nextNum).padStart(6, '0')}`;
    const stampStr = getStampString('CREATED', userName);

    await db.run(`
      INSERT INTO SALES (transNo, salesDate, custNo, empNo, is_deleted, stamp)
      VALUES (?, ?, ?, ?, 0, ?)
    `, [transNo, validated.salesDate, validated.custNo, validated.empNo, stampStr]);

    await logAudit(db, 'SALES', 'ADD', transNo, null, {
      transNo,
      salesDate: validated.salesDate,
      custNo: validated.custNo,
      empNo: validated.empNo,
    }, userName);

    revalidatePath('/sales');
    return { success: true, transNo };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to create sale header.') };
  }
}

// ========================================================================
// 2. UPDATE SALE HEADER ACTION
// ========================================================================
export async function updateSaleHeaderAction(input: z.infer<typeof updateSaleHeaderSchema>) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only mode to protect canonical data. Writes are available in local development." };
    const userName = await ensurePermission('edit_sale');
    const validated = updateSaleHeaderSchema.parse(input);
    const stampStr = getStampString('EDITED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT * FROM SALES WHERE transNo = ?', [validated.transNo]);
    if (!existing) return { error: `Sale ${validated.transNo} not found.` };

    // Verify Customer exists
    const cust = await db.get('SELECT custNo FROM CUSTOMER WHERE custNo = ? AND is_deleted = 0', [validated.custNo]);
    if (!cust) return { error: `Customer "${validated.custNo}" does not exist or is inactive.` };

    // Verify Employee exists
    const emp = await db.get('SELECT empNo FROM EMPLOYEE WHERE empNo = ? AND is_deleted = 0', [validated.empNo]);
    if (!emp) return { error: `Employee "${validated.empNo}" does not exist or is inactive.` };

    await db.run(`
      UPDATE SALES
      SET salesDate = ?, custNo = ?, empNo = ?, stamp = ?
      WHERE transNo = ?
    `, [validated.salesDate, validated.custNo, validated.empNo, stampStr, validated.transNo]);

    await logAudit(db, 'SALES', 'EDIT', validated.transNo, {
      salesDate: existing.salesDate,
      custNo: existing.custNo,
      empNo: existing.empNo,
    }, {
      salesDate: validated.salesDate,
      custNo: validated.custNo,
      empNo: validated.empNo,
    }, userName);

    revalidatePath('/sales');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to update sale header.') };
  }
}

// ========================================================================
// 3. SOFT-DELETE SALE (Figure 23)
// ========================================================================
export async function deleteSaleAction(transNo: string) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only mode to protect canonical data. Writes are available in local development." };
    const userName = await ensurePermission('delete_sale');
    const cleanTrans = String(transNo).trim();
    const stampStr = getStampString('DELETED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT is_deleted FROM SALES WHERE transNo = ?', [cleanTrans]);
    if (!existing) return { error: `Sale ${cleanTrans} not found.` };

    await db.run('UPDATE SALES SET is_deleted = 1, stamp = ? WHERE transNo = ?', [stampStr, cleanTrans]);
    await logAudit(db, 'SALES', 'DELETE', cleanTrans, { is_deleted: 0 }, { is_deleted: 1 }, userName);

    revalidatePath('/sales');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to soft-delete sale.') };
  }
}

// ========================================================================
// 4. RESTORE SALE (Figure 23)
// ========================================================================
export async function restoreSaleAction(transNo: string) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only mode to protect canonical data. Writes are available in local development." };
    const user = await getCurrentUser();
    const role = (user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') {
      return { error: 'Access denied: Only administrators can restore soft-deleted records.' };
    }
    const userName = user?.fullName || user?.email?.split('@')[0] || 'admin';
    const cleanTrans = String(transNo).trim();
    const stampStr = getStampString('RESTORED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT is_deleted FROM SALES WHERE transNo = ?', [cleanTrans]);
    if (!existing) return { error: `Sale ${cleanTrans} not found.` };

    await db.run('UPDATE SALES SET is_deleted = 0, stamp = ? WHERE transNo = ?', [stampStr, cleanTrans]);
    await logAudit(db, 'SALES', 'RESTORE', cleanTrans, { is_deleted: 1 }, { is_deleted: 0 }, userName);

    revalidatePath('/sales');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to restore sale.') };
  }
}

// ========================================================================
// 5. DETAIL LINES ACTIONS (Figures 25 & 26)
// ========================================================================

export async function addLineItemAction(input: z.infer<typeof lineItemSchema>) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only mode to protect canonical data. Writes are available in local development." };
    const userName = await ensurePermission('add_sale_detail');
    const validated = lineItemSchema.parse(input);
    const cleanTrans = validated.transNo.trim();
    const cleanProd = validated.prodCode.trim().toUpperCase();
    const stampStr = getStampString('CREATED', userName);

    const db = getSqliteDb();
    const sale = await db.get<any>('SELECT salesDate, is_deleted FROM SALES WHERE transNo = ?', [cleanTrans]);
    if (!sale) return { error: `Sale ${cleanTrans} not found.` };
    if (sale.is_deleted === 1) return { error: `Cannot add items to an inactive sale.` };

    const prod = await db.get('SELECT prodCode FROM PRODUCT WHERE prodCode = ? AND is_deleted = 0', [cleanProd]);
    if (!prod) return { error: `Product ${cleanProd} not found or inactive.` };

    // Check composite PK (transNo, prodCode)
    const existing = await db.get<any>('SELECT is_deleted, quantity FROM SALESDETAIL WHERE transNo = ? AND prodCode = ?', [cleanTrans, cleanProd]);
    if (existing) {
      if (existing.is_deleted === 1) {
        await db.run('UPDATE SALESDETAIL SET quantity = ?, is_deleted = 0, stamp = ? WHERE transNo = ? AND prodCode = ?', [
          validated.quantity,
          stampStr,
          cleanTrans,
          cleanProd
        ]);
        await logAudit(db, 'SALESDETAIL', 'RESTORE', `${cleanTrans}:${cleanProd}`, { is_deleted: 1 }, { is_deleted: 0, quantity: validated.quantity }, userName);
        revalidatePath('/sales');
        return { success: true };
      }
      return { error: `Product ${cleanProd} is already on this sale. Please edit the existing line item instead.` };
    }

    await db.run(`
      INSERT INTO SALESDETAIL (transNo, prodCode, quantity, is_deleted, stamp)
      VALUES (?, ?, ?, 0, ?)
    `, [cleanTrans, cleanProd, validated.quantity, stampStr]);

    await logAudit(db, 'SALESDETAIL', 'ADD', `${cleanTrans}:${cleanProd}`, null, {
      transNo: cleanTrans,
      prodCode: cleanProd,
      quantity: validated.quantity,
    }, userName);

    revalidatePath('/sales');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to add line item.') };
  }
}

export async function updateLineItemAction(input: z.infer<typeof lineItemSchema>) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only mode to protect canonical data. Writes are available in local development." };
    const userName = await ensurePermission('edit_sale_detail');
    const validated = lineItemSchema.parse(input);
    const cleanTrans = validated.transNo.trim();
    const cleanProd = validated.prodCode.trim().toUpperCase();
    const stampStr = getStampString('EDITED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT quantity FROM SALESDETAIL WHERE transNo = ? AND prodCode = ?', [cleanTrans, cleanProd]);
    if (!existing) return { error: `Line item not found.` };

    await db.run(`
      UPDATE SALESDETAIL
      SET quantity = ?, stamp = ?
      WHERE transNo = ? AND prodCode = ?
    `, [validated.quantity, stampStr, cleanTrans, cleanProd]);

    await logAudit(db, 'SALESDETAIL', 'EDIT', `${cleanTrans}:${cleanProd}`, { quantity: existing.quantity }, { quantity: validated.quantity }, userName);

    revalidatePath('/sales');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to update line item.') };
  }
}

export async function deleteLineItemAction(transNo: string, prodCode: string) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only mode to protect canonical data. Writes are available in local development." };
    const userName = await ensurePermission('delete_sale_detail');
    const cleanTrans = String(transNo).trim();
    const cleanProd = String(prodCode).trim().toUpperCase();
    const stampStr = getStampString('DELETED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT is_deleted FROM SALESDETAIL WHERE transNo = ? AND prodCode = ?', [cleanTrans, cleanProd]);
    if (!existing) return { error: `Line item not found.` };

    await db.run('UPDATE SALESDETAIL SET is_deleted = 1, stamp = ? WHERE transNo = ? AND prodCode = ?', [stampStr, cleanTrans, cleanProd]);
    await logAudit(db, 'SALESDETAIL', 'DELETE', `${cleanTrans}:${cleanProd}`, { is_deleted: 0 }, { is_deleted: 1 }, userName);

    revalidatePath('/sales');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to delete line item.') };
  }
}

export async function restoreLineItemAction(transNo: string, prodCode: string) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only mode to protect canonical data. Writes are available in local development." };
    const user = await getCurrentUser();
    const role = (user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') {
      return { error: 'Access denied: Only administrators can restore soft-deleted records.' };
    }
    const userName = user?.fullName || user?.email?.split('@')[0] || 'admin';
    const cleanTrans = String(transNo).trim();
    const cleanProd = String(prodCode).trim().toUpperCase();
    const stampStr = getStampString('RESTORED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT is_deleted FROM SALESDETAIL WHERE transNo = ? AND prodCode = ?', [cleanTrans, cleanProd]);
    if (!existing) return { error: `Line item not found.` };

    await db.run('UPDATE SALESDETAIL SET is_deleted = 0, stamp = ? WHERE transNo = ? AND prodCode = ?', [stampStr, cleanTrans, cleanProd]);
    await logAudit(db, 'SALESDETAIL', 'RESTORE', `${cleanTrans}:${cleanProd}`, { is_deleted: 1 }, { is_deleted: 0 }, userName);

    revalidatePath('/sales');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to restore line item.') };
  }
}

// ========================================================================
// LEGACY COMPATIBILITY & MULTI-STEP ATOMIC SALE TRANSACTION
// ========================================================================
export async function getPriceForProductDateAction(prodCode: string, date: string): Promise<number> {
  try {
    const db = getSqliteDb();
    const row = await db.get<any>(`
      SELECT unitPrice 
      FROM PRICEHIST 
      WHERE prodCode = ? AND effDate <= ? AND is_deleted = 0
      ORDER BY effDate DESC 
      LIMIT 1
    `, [prodCode, date]);
    return row ? Number(row.unitPrice) : 0;
  } catch {
    return 0;
  }
}

export type CreateSaleInput = {
  custNo: string | number;
  empNo: string | number;
  salesDate: string;
  items?: Array<{ prodCode: string; quantity: number }>;
};

/**
 * Atomic multi-step save: Validates foreign keys and items, then executes header
 * and all line items inside a single database transaction. Rollbacks completely if any step fails.
 */
export async function createSaleAction(input: CreateSaleInput) {
  try {
    if (isDatabaseReadOnly()) return { error: "This deployed environment is in read-only mode to protect canonical data. Writes are available in local development." };
    const userName = await ensurePermission('add_sale');
    const db = getSqliteDb();

    // 1. Validate header fields
    const validatedHeader = createSaleHeaderSchema.parse({
      salesDate: input.salesDate,
      custNo: String(input.custNo).trim(),
      empNo: String(input.empNo).trim(),
    });

    // 2. Validate foreign keys
    const cust = await db.get('SELECT custNo FROM CUSTOMER WHERE custNo = ? AND is_deleted = 0', [validatedHeader.custNo]);
    if (!cust) return { error: `Customer "${validatedHeader.custNo}" does not exist or is inactive.` };

    const emp = await db.get('SELECT empNo FROM EMPLOYEE WHERE empNo = ? AND is_deleted = 0', [validatedHeader.empNo]);
    if (!emp) return { error: `Salesperson "${validatedHeader.empNo}" does not exist or is inactive.` };

    const items = input.items || [];
    // Validate all items if provided
    for (const item of items) {
      const cleanProd = String(item.prodCode).trim().toUpperCase();
      const qty = Number(item.quantity);
      if (!cleanProd) return { error: 'Product code is required for all line items.' };
      if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
        return { error: `Quantity for product "${cleanProd}" must be a positive integer.` };
      }
      const prod = await db.get('SELECT prodCode FROM PRODUCT WHERE prodCode = ? AND is_deleted = 0', [cleanProd]);
      if (!prod) return { error: `Product "${cleanProd}" does not exist or is inactive.` };
    }

    // 3. Auto-number next transaction
    const nextRow = await db.get<any>(`
      SELECT COALESCE(
        MAX(CAST(SUBSTR(transNo, 3) AS INTEGER)),
        MAX(CAST(transNo AS INTEGER)),
        0
      ) + 1 AS nextNum FROM SALES
    `);
    const nextNum = Number(nextRow?.nextNum || 125);
    const transNo = `TR${String(nextNum).padStart(6, '0')}`;
    const stampStr = getStampString('CREATED', userName);

    // 4. Wrap header + lines in an atomic transaction
    await db.exec('BEGIN TRANSACTION');
    try {
      await db.run(`
        INSERT INTO SALES (transNo, salesDate, custNo, empNo, is_deleted, stamp)
        VALUES (?, ?, ?, ?, 0, ?)
      `, [transNo, validatedHeader.salesDate, validatedHeader.custNo, validatedHeader.empNo, stampStr]);

      if (items.length > 0) {
        for (const item of items) {
          const cleanProd = String(item.prodCode).trim().toUpperCase();
          await db.run(`
            INSERT INTO SALESDETAIL (transNo, prodCode, quantity, is_deleted, stamp)
            VALUES (?, ?, ?, 0, ?)
          `, [transNo, cleanProd, Number(item.quantity), stampStr]);
        }
      }

      await db.exec('COMMIT');
    } catch (txErr) {
      try {
        await db.exec('ROLLBACK');
      } catch {}
      throw txErr;
    }

    await logAudit(db, 'SALES', 'ADD', transNo, null, {
      transNo,
      salesDate: validatedHeader.salesDate,
      custNo: validatedHeader.custNo,
      empNo: validatedHeader.empNo,
      itemsCount: items.length,
    }, userName);

    revalidatePath('/sales');
    return { success: true, transNo };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to create sale.') };
  }
}
