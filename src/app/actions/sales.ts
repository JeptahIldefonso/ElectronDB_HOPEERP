'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getHopeDb, type DatabaseSync } from '@/lib/hope-db';
import { getCurrentUser, checkUserPermission } from './auth';

function getSqliteDb(): DatabaseSync {
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

function logAudit(
  db: DatabaseSync,
  tableName: string,
  action: string,
  recordKey: string,
  oldValues: any,
  newValues: any,
  actionBy: string
) {
  try {
    db.prepare(`
      INSERT INTO audit_log (table_name, action, record_key, old_values, new_values, action_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      tableName,
      action,
      recordKey,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      actionBy
    );
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
    const userName = await ensurePermission('add_sale');
    const validated = createSaleHeaderSchema.parse(input);

    const db = getSqliteDb();

    // Verify Customer exists
    const cust = db.prepare('SELECT custNo FROM CUSTOMER WHERE custNo = ? AND is_deleted = 0').get(validated.custNo);
    if (!cust) return { error: `Customer "${validated.custNo}" does not exist or is inactive.` };

    // Verify Employee exists
    const emp = db.prepare('SELECT empNo FROM EMPLOYEE WHERE empNo = ? AND is_deleted = 0').get(validated.empNo);
    if (!emp) return { error: `Employee "${validated.empNo}" does not exist or is inactive.` };

    // Auto-number transaction number (Figure 24 rule 1: auto-numbered)
    const nextRow = db.prepare(`
      SELECT COALESCE(
        MAX(CAST(SUBSTR(transNo, 3) AS INTEGER)),
        MAX(CAST(transNo AS INTEGER)),
        0
      ) + 1 AS nextNum FROM SALES
    `).get() as any;
    const nextNum = Number(nextRow?.nextNum || 125);
    const transNo = `TR${String(nextNum).padStart(6, '0')}`;
    const stampStr = getStampString('CREATED', userName);

    db.prepare(`
      INSERT INTO SALES (transNo, salesDate, custNo, empNo, is_deleted, stamp)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(transNo, validated.salesDate, validated.custNo, validated.empNo, stampStr);

    logAudit(db, 'SALES', 'ADD', transNo, null, {
      transNo,
      salesDate: validated.salesDate,
      custNo: validated.custNo,
      empNo: validated.empNo,
    }, userName);

    revalidatePath('/sales');
    return { success: true, transNo };
  } catch (err: any) {
    if (err instanceof z.ZodError) return { error: err.errors[0]?.message };
    return { error: err?.message || 'Failed to create sale.' };
  }
}

// ========================================================================
// 2. UPDATE SALE HEADER ACTION
// ========================================================================
export async function updateSaleHeaderAction(input: z.infer<typeof updateSaleHeaderSchema>) {
  try {
    const userName = await ensurePermission('edit_sale');
    const validated = updateSaleHeaderSchema.parse(input);
    const stampStr = getStampString('EDITED', userName);

    const db = getSqliteDb();
    const existing = db.prepare('SELECT * FROM SALES WHERE transNo = ?').get(validated.transNo) as any;
    if (!existing) return { error: `Sale ${validated.transNo} not found.` };

    db.prepare(`
      UPDATE SALES
      SET salesDate = ?, custNo = ?, empNo = ?, stamp = ?
      WHERE transNo = ?
    `).run(validated.salesDate, validated.custNo, validated.empNo, stampStr, validated.transNo);

    logAudit(db, 'SALES', 'EDIT', validated.transNo, {
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
    if (err instanceof z.ZodError) return { error: err.errors[0]?.message };
    return { error: err?.message || 'Failed to update sale.' };
  }
}

// ========================================================================
// 3. SOFT-DELETE SALE (Figure 23)
// ========================================================================
export async function deleteSaleAction(transNo: string) {
  try {
    const userName = await ensurePermission('delete_sale');
    const cleanTrans = String(transNo).trim();
    const stampStr = getStampString('DELETED', userName);

    const db = getSqliteDb();
    const existing = db.prepare('SELECT is_deleted FROM SALES WHERE transNo = ?').get(cleanTrans) as any;
    if (!existing) return { error: `Sale ${cleanTrans} not found.` };

    db.prepare('UPDATE SALES SET is_deleted = 1, stamp = ? WHERE transNo = ?').run(stampStr, cleanTrans);
    logAudit(db, 'SALES', 'DELETE', cleanTrans, { is_deleted: 0 }, { is_deleted: 1 }, userName);

    revalidatePath('/sales');
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || 'Failed to soft-delete sale.' };
  }
}

// ========================================================================
// 4. RESTORE SALE (Figure 23)
// ========================================================================
export async function restoreSaleAction(transNo: string) {
  try {
    const user = await getCurrentUser();
    const role = (user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') {
      return { error: 'Access denied: Only administrators can restore soft-deleted records.' };
    }
    const userName = user?.fullName || user?.email?.split('@')[0] || 'admin';
    const cleanTrans = String(transNo).trim();
    const stampStr = getStampString('RESTORED', userName);

    const db = getSqliteDb();
    const existing = db.prepare('SELECT is_deleted FROM SALES WHERE transNo = ?').get(cleanTrans) as any;
    if (!existing) return { error: `Sale ${cleanTrans} not found.` };

    db.prepare('UPDATE SALES SET is_deleted = 0, stamp = ? WHERE transNo = ?').run(stampStr, cleanTrans);
    logAudit(db, 'SALES', 'RESTORE', cleanTrans, { is_deleted: 1 }, { is_deleted: 0 }, userName);

    revalidatePath('/sales');
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || 'Failed to restore sale.' };
  }
}

// ========================================================================
// 5. DETAIL LINES ACTIONS (Figures 25 & 26)
// ========================================================================

export async function addLineItemAction(input: z.infer<typeof lineItemSchema>) {
  try {
    const userName = await ensurePermission('add_sale_detail');
    const validated = lineItemSchema.parse(input);
    const cleanTrans = validated.transNo.trim();
    const cleanProd = validated.prodCode.trim().toUpperCase();
    const stampStr = getStampString('CREATED', userName);

    const db = getSqliteDb();
    const sale = db.prepare('SELECT salesDate, is_deleted FROM SALES WHERE transNo = ?').get(cleanTrans) as any;
    if (!sale) return { error: `Sale ${cleanTrans} not found.` };
    if (sale.is_deleted === 1) return { error: `Cannot add items to an inactive sale.` };

    const prod = db.prepare('SELECT prodCode FROM PRODUCT WHERE prodCode = ? AND is_deleted = 0').get(cleanProd);
    if (!prod) return { error: `Product ${cleanProd} not found or inactive.` };

    // Check composite PK (transNo, prodCode)
    const existing = db.prepare('SELECT is_deleted, quantity FROM SALESDETAIL WHERE transNo = ? AND prodCode = ?').get(cleanTrans, cleanProd) as any;
    if (existing) {
      if (existing.is_deleted === 1) {
        db.prepare('UPDATE SALESDETAIL SET quantity = ?, is_deleted = 0, stamp = ? WHERE transNo = ? AND prodCode = ?').run(
          validated.quantity,
          stampStr,
          cleanTrans,
          cleanProd
        );
        logAudit(db, 'SALESDETAIL', 'RESTORE', `${cleanTrans}:${cleanProd}`, { is_deleted: 1 }, { is_deleted: 0, quantity: validated.quantity }, userName);
        revalidatePath('/sales');
        return { success: true };
      }
      return { error: `Product ${cleanProd} is already on this sale. Please edit the existing line item instead.` };
    }

    db.prepare(`
      INSERT INTO SALESDETAIL (transNo, prodCode, quantity, is_deleted, stamp)
      VALUES (?, ?, ?, 0, ?)
    `).run(cleanTrans, cleanProd, validated.quantity, stampStr);

    logAudit(db, 'SALESDETAIL', 'ADD', `${cleanTrans}:${cleanProd}`, null, {
      transNo: cleanTrans,
      prodCode: cleanProd,
      quantity: validated.quantity,
    }, userName);

    revalidatePath('/sales');
    return { success: true };
  } catch (err: any) {
    if (err instanceof z.ZodError) return { error: err.errors[0]?.message };
    return { error: err?.message || 'Failed to add line item.' };
  }
}

export async function updateLineItemAction(input: z.infer<typeof lineItemSchema>) {
  try {
    const userName = await ensurePermission('edit_sale_detail');
    const validated = lineItemSchema.parse(input);
    const cleanTrans = validated.transNo.trim();
    const cleanProd = validated.prodCode.trim().toUpperCase();
    const stampStr = getStampString('EDITED', userName);

    const db = getSqliteDb();
    const existing = db.prepare('SELECT quantity FROM SALESDETAIL WHERE transNo = ? AND prodCode = ?').get(cleanTrans, cleanProd) as any;
    if (!existing) return { error: `Line item not found.` };

    db.prepare(`
      UPDATE SALESDETAIL
      SET quantity = ?, stamp = ?
      WHERE transNo = ? AND prodCode = ?
    `).run(validated.quantity, stampStr, cleanTrans, cleanProd);

    logAudit(db, 'SALESDETAIL', 'EDIT', `${cleanTrans}:${cleanProd}`, { quantity: existing.quantity }, { quantity: validated.quantity }, userName);

    revalidatePath('/sales');
    return { success: true };
  } catch (err: any) {
    if (err instanceof z.ZodError) return { error: err.errors[0]?.message };
    return { error: err?.message || 'Failed to update line item.' };
  }
}

export async function deleteLineItemAction(transNo: string, prodCode: string) {
  try {
    const userName = await ensurePermission('delete_sale_detail');
    const cleanTrans = String(transNo).trim();
    const cleanProd = String(prodCode).trim().toUpperCase();
    const stampStr = getStampString('DELETED', userName);

    const db = getSqliteDb();
    const existing = db.prepare('SELECT is_deleted FROM SALESDETAIL WHERE transNo = ? AND prodCode = ?').get(cleanTrans, cleanProd) as any;
    if (!existing) return { error: `Line item not found.` };

    db.prepare('UPDATE SALESDETAIL SET is_deleted = 1, stamp = ? WHERE transNo = ? AND prodCode = ?').run(stampStr, cleanTrans, cleanProd);
    logAudit(db, 'SALESDETAIL', 'DELETE', `${cleanTrans}:${cleanProd}`, { is_deleted: 0 }, { is_deleted: 1 }, userName);

    revalidatePath('/sales');
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || 'Failed to delete line item.' };
  }
}

export async function restoreLineItemAction(transNo: string, prodCode: string) {
  try {
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
    const existing = db.prepare('SELECT is_deleted FROM SALESDETAIL WHERE transNo = ? AND prodCode = ?').get(cleanTrans, cleanProd) as any;
    if (!existing) return { error: `Line item not found.` };

    db.prepare('UPDATE SALESDETAIL SET is_deleted = 0, stamp = ? WHERE transNo = ? AND prodCode = ?').run(stampStr, cleanTrans, cleanProd);
    logAudit(db, 'SALESDETAIL', 'RESTORE', `${cleanTrans}:${cleanProd}`, { is_deleted: 1 }, { is_deleted: 0 }, userName);

    revalidatePath('/sales');
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || 'Failed to restore line item.' };
  }
}

// ========================================================================
// LEGACY COMPATIBILITY
// ========================================================================
export async function getPriceForProductDateAction(prodCode: string, date: string): Promise<number> {
  try {
    const db = getSqliteDb();
    const row = db.prepare(`
      SELECT unitPrice 
      FROM PRICEHIST 
      WHERE prodCode = ? AND effDate <= ? AND is_deleted = 0
      ORDER BY effDate DESC 
      LIMIT 1
    `).get(prodCode, date) as any;
    return row ? Number(row.unitPrice) : 0;
  } catch {
    return 0;
  }
}

export type CreateSaleInput = {
  custNo: string | number;
  empNo: string | number;
  salesDate: string;
  items: Array<{ prodCode: string; quantity: number }>;
};

export async function createSaleAction(input: CreateSaleInput) {
  const headerRes = await createSaleHeaderAction({
    salesDate: input.salesDate,
    custNo: String(input.custNo),
    empNo: String(input.empNo),
  });

  if (headerRes.error || !headerRes.transNo) return headerRes;

  for (const item of input.items) {
    await addLineItemAction({
      transNo: headerRes.transNo,
      prodCode: item.prodCode,
      quantity: item.quantity,
    });
  }

  return headerRes;
}
