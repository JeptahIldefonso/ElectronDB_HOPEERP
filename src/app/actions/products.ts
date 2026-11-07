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
// SCHEMAS
// ========================================================================

const addProductSchema = z.object({
  prodCode: z.string().trim().min(1, 'Product code is required').max(6, 'Product code cannot exceed 6 characters (VARCHAR(6)).'),
  description: z.string().trim().min(1, 'Product description is required').max(30, 'Description cannot exceed 30 characters (VARCHAR(30)).'),
  unit: z.enum(['pc', 'ea', 'mtr', 'pkg', 'ltr'], {
    errorMap: () => ({ message: 'Unit must be one of: pc, ea, mtr, pkg, ltr (Schema CHECK constraint).' }),
  }),
  initialPrice: z.number().positive('Price must be greater than zero').optional(),
  effDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid effective date (YYYY-MM-DD) is required').optional(),
});

const updateProductSchema = z.object({
  prodCode: z.string().trim().min(1, 'Product code is required').max(6),
  description: z.string().trim().min(1, 'Product description is required').max(30, 'Description cannot exceed 30 characters (VARCHAR(30)).'),
  unit: z.enum(['pc', 'ea', 'mtr', 'pkg', 'ltr'], {
    errorMap: () => ({ message: 'Unit must be one of: pc, ea, mtr, pkg, ltr.' }),
  }),
});

const priceRecordSchema = z.object({
  prodCode: z.string().trim().min(1, 'Product code is required').max(6),
  effDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid effective date (YYYY-MM-DD) is required'),
  unitPrice: z.number().positive('Unit price must be greater than zero'),
});

export type AddProductInput = z.infer<typeof addProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type PriceRecordInput = z.infer<typeof priceRecordSchema>;
export type NewPriceInput = PriceRecordInput;
export type CorrectPriceInput = { prodCode: string; unitPrice: number };

// ========================================================================
// 1. ADD PRODUCT ACTION
// ========================================================================
export async function addProductAction(input: AddProductInput) {
  try {
    if (isDatabaseReadOnly()) {
      return { error: 'This deployed environment is in read-only mode to protect canonical data. Writes are available in local development or with Turso configured.' };
    }

    const auth = await checkUserPermission('add_product');
    if (!auth.authorized) {
      return { error: auth.error || 'Access denied: Missing right add_product.' };
    }
    const user = auth.user;
    const userName = user?.fullName || user?.email?.split('@')[0] || 'staff';
    const validated = addProductSchema.parse(input);
    const code = validated.prodCode.toUpperCase();
    const stampStr = getStampString('CREATED', userName);

    const db = getSqliteDb();

    // Check duplicate prodCode
    const existingCode = await db.get('SELECT prodCode FROM PRODUCT WHERE prodCode = ?', [code]);
    if (existingCode) {
      return { error: `Product code "${code}" already exists.` };
    }

    // Atomic insert of product and initial price
    await db.exec('BEGIN TRANSACTION');
    try {
      await db.run(`
        INSERT INTO PRODUCT (prodCode, description, unit, is_deleted, stamp)
        VALUES (?, ?, ?, 0, ?)
      `, [code, validated.description, validated.unit, stampStr]);

      if (validated.initialPrice && validated.effDate) {
        await db.run(`
          INSERT INTO PRICEHIST (effDate, prodCode, unitPrice, is_deleted, stamp)
          VALUES (?, ?, ?, 0, ?)
        `, [validated.effDate, code, validated.initialPrice, stampStr]);
      }

      await db.exec('COMMIT');
    } catch (txErr) {
      try { await db.exec('ROLLBACK'); } catch {}
      throw txErr;
    }

    // Audit log
    try {
      await db.run(`
        INSERT INTO audit_log (table_name, action, record_key, new_values, action_by)
        VALUES ('PRODUCT', 'ADD', ?, ?, ?)
      `, [code, JSON.stringify({ description: validated.description, unit: validated.unit }), userName]);
    } catch {
      // Non-blocking
    }

    revalidatePath('/products');
    return { success: true, prodCode: code };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to add product.') };
  }
}

// ========================================================================
// 2. UPDATE PRODUCT ACTION
// ========================================================================
export async function updateProductAction(input: UpdateProductInput) {
  try {
    if (isDatabaseReadOnly()) {
      return { error: 'This deployed environment is in read-only mode to protect canonical data. Writes are available in local development or with Turso configured.' };
    }

    const auth = await checkUserPermission('edit_product');
    if (!auth.authorized) {
      return { error: auth.error || 'Access denied: Missing right edit_product.' };
    }
    const user = auth.user;
    const userName = user?.fullName || user?.email?.split('@')[0] || 'staff';
    const validated = updateProductSchema.parse(input);
    const code = validated.prodCode.toUpperCase();
    const stampStr = getStampString('EDITED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT * FROM PRODUCT WHERE prodCode = ?', [code]);
    if (!existing) {
      return { error: 'Product not found.' };
    }

    await db.run(`
      UPDATE PRODUCT
      SET description = ?, unit = ?, stamp = ?
      WHERE prodCode = ?
    `, [validated.description, validated.unit, stampStr, code]);

    // Audit log
    try {
      await db.run(`
        INSERT INTO audit_log (table_name, action, record_key, old_values, new_values, action_by)
        VALUES ('PRODUCT', 'EDIT', ?, ?, ?, ?)
      `, [
        code,
        JSON.stringify({ description: existing.description, unit: existing.unit }),
        JSON.stringify({ description: validated.description, unit: validated.unit }),
        userName
      ]);
    } catch {
      // Non-blocking
    }

    revalidatePath('/products');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to update product.') };
  }
}

// ========================================================================
// 3. SOFT-DELETE & RESTORE PRODUCT ACTIONS
// ========================================================================
export async function deleteProductAction(prodCode: string) {
  try {
    if (isDatabaseReadOnly()) {
      return { error: 'This deployed environment is in read-only mode to protect canonical data. Writes are available in local development or with Turso configured.' };
    }

    const auth = await checkUserPermission('delete_product');
    if (!auth.authorized) {
      return { error: auth.error || 'Access denied: Missing right delete_product.' };
    }
    const user = auth.user;
    const userName = user?.fullName || user?.email?.split('@')[0] || 'staff';
    const cleanCode = String(prodCode).trim().toUpperCase();
    const stampStr = getStampString('DELETED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT is_deleted FROM PRODUCT WHERE prodCode = ?', [cleanCode]);
    if (!existing) {
      return { error: `Product #${cleanCode} was not found.` };
    }

    if (existing.is_deleted === 1 || existing.is_deleted === true) {
      return { error: `Product #${cleanCode} is already inactive.` };
    }

    await db.run(`
      UPDATE PRODUCT 
      SET is_deleted = 1, stamp = ?
      WHERE prodCode = ?
    `, [stampStr, cleanCode]);

    try {
      await db.run(`
        INSERT INTO audit_log (table_name, action, record_key, action_by)
        VALUES ('PRODUCT', 'DELETE', ?, ?)
      `, [cleanCode, userName]);
    } catch {
      // Non-blocking
    }

    revalidatePath('/products');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to soft-delete product.') };
  }
}

export async function restoreProductAction(prodCode: string) {
  try {
    if (isDatabaseReadOnly()) {
      return { error: 'This deployed environment is in read-only mode to protect canonical data. Writes are available in local development or with Turso configured.' };
    }

    const user = await getCurrentUser();
    const role = (user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') {
      return { error: 'Access denied: Only administrative staff can restore products.' };
    }

    const userName = user?.fullName || user?.email?.split('@')[0] || role;
    const cleanCode = String(prodCode).trim().toUpperCase();
    const stampStr = getStampString('RESTORED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT is_deleted FROM PRODUCT WHERE prodCode = ?', [cleanCode]);
    if (!existing) {
      return { error: `Product #${cleanCode} was not found.` };
    }

    if (!existing.is_deleted) {
      return { error: `Product #${cleanCode} is already active.` };
    }

    await db.run(`
      UPDATE PRODUCT 
      SET is_deleted = 0, stamp = ?
      WHERE prodCode = ?
    `, [stampStr, cleanCode]);

    try {
      await db.run(`
        INSERT INTO audit_log (table_name, action, record_key, action_by)
        VALUES ('PRODUCT', 'RESTORE', ?, ?)
      `, [cleanCode, userName]);
    } catch {
      // Non-blocking
    }

    revalidatePath('/products');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to restore product.') };
  }
}

// ========================================================================
// 4. PRICE HISTORY ACTIONS (FIGURE 12 & 13)
// ========================================================================
export async function addPriceAction(input: PriceRecordInput) {
  try {
    if (isDatabaseReadOnly()) {
      return { error: 'This deployed environment is in read-only mode to protect canonical data. Writes are available in local development or with Turso configured.' };
    }

    const auth = await checkUserPermission('add_price');
    if (!auth.authorized) {
      return { error: auth.error || 'Access denied: Missing right add_price.' };
    }
    const user = auth.user;
    const userName = user?.fullName || user?.email?.split('@')[0] || 'staff';
    const validated = priceRecordSchema.parse(input);
    const code = validated.prodCode.toUpperCase();
    const stampStr = getStampString('CREATED', userName);

    const db = getSqliteDb();

    // Check if price record with same effDate already exists
    const existing = await db.get('SELECT 1 FROM PRICEHIST WHERE prodCode = ? AND effDate = ?', [code, validated.effDate]);
    if (existing) {
      return { error: `A price record already exists for ${code} on ${validated.effDate}. Edit that record instead.` };
    }

    await db.run(`
      INSERT INTO PRICEHIST (effDate, prodCode, unitPrice, is_deleted, stamp)
      VALUES (?, ?, ?, 0, ?)
    `, [validated.effDate, code, validated.unitPrice, stampStr]);

    try {
      await db.run(`
        INSERT INTO audit_log (table_name, action, record_key, new_values, action_by)
        VALUES ('PRICEHIST', 'ADD', ?, ?, ?)
      `, [
        `${code}:${validated.effDate}`,
        JSON.stringify({ unitPrice: validated.unitPrice }),
        userName
      ]);
    } catch {
      // Non-blocking
    }

    revalidatePath('/products');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to add price record.') };
  }
}

export async function updatePriceAction(input: PriceRecordInput) {
  try {
    if (isDatabaseReadOnly()) {
      return { error: 'This deployed environment is in read-only mode to protect canonical data. Writes are available in local development or with Turso configured.' };
    }

    const auth = await checkUserPermission('edit_price');
    if (!auth.authorized) {
      return { error: auth.error || 'Access denied: Missing right edit_price.' };
    }
    const user = auth.user;
    const userName = user?.fullName || user?.email?.split('@')[0] || 'staff';
    const validated = priceRecordSchema.parse(input);
    const code = validated.prodCode.toUpperCase();
    const stampStr = getStampString('EDITED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT * FROM PRICEHIST WHERE prodCode = ? AND effDate = ?', [code, validated.effDate]);
    if (!existing) {
      return { error: 'Price record not found.' };
    }

    await db.run(`
      UPDATE PRICEHIST
      SET unitPrice = ?, stamp = ?
      WHERE prodCode = ? AND effDate = ?
    `, [validated.unitPrice, stampStr, code, validated.effDate]);

    try {
      await db.run(`
        INSERT INTO audit_log (table_name, action, record_key, old_values, new_values, action_by)
        VALUES ('PRICEHIST', 'EDIT', ?, ?, ?, ?)
      `, [
        `${code}:${validated.effDate}`,
        JSON.stringify({ unitPrice: existing.unitPrice }),
        JSON.stringify({ unitPrice: validated.unitPrice }),
        userName
      ]);
    } catch {
      // Non-blocking
    }

    revalidatePath('/products');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to update price record.') };
  }
}

export async function deletePriceAction(prodCode: string, effDate: string) {
  try {
    if (isDatabaseReadOnly()) {
      return { error: 'This deployed environment is in read-only mode to protect canonical data. Writes are available in local development or with Turso configured.' };
    }

    const auth = await checkUserPermission('delete_price');
    if (!auth.authorized) {
      return { error: auth.error || 'Access denied: Missing right delete_price.' };
    }
    const user = auth.user;
    const userName = user?.fullName || user?.email?.split('@')[0] || 'staff';
    const cleanCode = String(prodCode).trim().toUpperCase();
    const cleanDate = String(effDate).trim();
    const stampStr = getStampString('DELETED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT is_deleted FROM PRICEHIST WHERE prodCode = ? AND effDate = ?', [cleanCode, cleanDate]);
    if (!existing) {
      return { error: 'Price record not found.' };
    }

    await db.run(`
      UPDATE PRICEHIST
      SET is_deleted = 1, stamp = ?
      WHERE prodCode = ? AND effDate = ?
    `, [stampStr, cleanCode, cleanDate]);

    try {
      await db.run(`
        INSERT INTO audit_log (table_name, action, record_key, action_by)
        VALUES ('PRICEHIST', 'DELETE', ?, ?)
      `, [`${cleanCode}:${cleanDate}`, userName]);
    } catch {
      // Non-blocking
    }

    revalidatePath('/products');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to soft-delete price record.') };
  }
}

export async function restorePriceAction(prodCode: string, effDate: string) {
  try {
    if (isDatabaseReadOnly()) {
      return { error: 'This deployed environment is in read-only mode to protect canonical data. Writes are available in local development or with Turso configured.' };
    }

    const user = await getCurrentUser();
    const role = (user?.role || 'admin').toLowerCase();
    if (!['admin', 'superadmin', 'sales'].includes(role)) {
      return { error: 'Access denied: Only administrators can restore price records.' };
    }

    const userName = user?.fullName || user?.email?.split('@')[0] || role;
    const cleanCode = String(prodCode).trim().toUpperCase();
    const cleanDate = String(effDate).trim();
    const stampStr = getStampString('RESTORED', userName);

    const db = getSqliteDb();
    const existing = await db.get<any>('SELECT is_deleted FROM PRICEHIST WHERE prodCode = ? AND effDate = ?', [cleanCode, cleanDate]);
    if (!existing) {
      return { error: 'Price record not found.' };
    }

    await db.run(`
      UPDATE PRICEHIST
      SET is_deleted = 0, stamp = ?
      WHERE prodCode = ? AND effDate = ?
    `, [stampStr, cleanCode, cleanDate]);

    try {
      await db.run(`
        INSERT INTO audit_log (table_name, action, record_key, action_by)
        VALUES ('PRICEHIST', 'RESTORE', ?, ?)
      `, [`${cleanCode}:${cleanDate}`, userName]);
    } catch {
      // Non-blocking
    }

    revalidatePath('/products');
    return { success: true };
  } catch (err: any) {
    return { error: sanitizeDbError(err, 'Failed to restore price record.') };
  }
}

// Backward compatibility exports
export const addNewPriceAction = addPriceAction;
export async function correctPriceAction(input: { prodCode: string; unitPrice: number; effDate?: string }) {
  const db = getSqliteDb();
  let effDate = input.effDate;
  if (!effDate) {
    const latest = await db.get<{ effDate: string }>('SELECT effDate FROM PRICEHIST WHERE prodCode = ? ORDER BY effDate DESC LIMIT 1', [input.prodCode.toUpperCase()]);
    effDate = latest?.effDate;
  }
  if (!effDate) {
    return { error: 'No price record found for this product.' };
  }
  return updatePriceAction({
    prodCode: input.prodCode,
    effDate,
    unitPrice: input.unitPrice,
  });
}
