'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getHopeDb, type DatabaseSync } from '@/lib/hope-db';
import { createClient } from '@/lib/supabase/server';
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

function getManilaToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

function isSupabaseLive(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project') &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('your-anon')
  );
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
    const auth = await checkUserPermission('add_product');
    if (!auth.authorized) {
      return { error: auth.error || 'Access denied: Missing right add_product.' };
    }
    const user = auth.user;
    const userName = user?.fullName || user?.email?.split('@')[0] || 'staff';
    const validated = addProductSchema.parse(input);
    const code = validated.prodCode.toUpperCase();
    const stampStr = getStampString('CREATED', userName);

    if (isSupabaseLive()) {
      try {
        const supabase = await createClient();
        const { error } = await supabase.from('PRODUCT').insert({
          prodCode: code,
          description: validated.description,
          unit: validated.unit,
          is_deleted: 0,
          stamp: stampStr,
        });

        if (error) return { error: error.message };

        if (validated.initialPrice && validated.effDate) {
          await supabase.from('PRICEHIST').insert({
            effDate: validated.effDate,
            prodCode: code,
            unitPrice: validated.initialPrice,
            is_deleted: 0,
            stamp: stampStr,
          });
        }

        revalidatePath('/products');
        return { success: true, prodCode: code };
      } catch (err: any) {
        return { error: err?.message || 'Database error adding product.' };
      }
    }

    // SQLite implementation
    const db = getSqliteDb();

    // Check duplicate prodCode
    const existingCode = db.prepare('SELECT prodCode FROM PRODUCT WHERE prodCode = ?').get(code);
    if (existingCode) {
      return { error: `Product code "${code}" already exists.` };
    }

    db.prepare(`
      INSERT INTO PRODUCT (prodCode, description, unit, is_deleted, stamp)
      VALUES (?, ?, ?, 0, ?)
    `).run(code, validated.description, validated.unit, stampStr);

    if (validated.initialPrice && validated.effDate) {
      db.prepare(`
        INSERT INTO PRICEHIST (effDate, prodCode, unitPrice, is_deleted, stamp)
        VALUES (?, ?, ?, 0, ?)
      `).run(validated.effDate, code, validated.initialPrice, stampStr);
    }

    // Audit log
    try {
      db.prepare(`
        INSERT INTO audit_log (table_name, action, record_key, new_values, action_by)
        VALUES ('PRODUCT', 'ADD', ?, ?, ?)
      `).run(code, JSON.stringify({ description: validated.description, unit: validated.unit }), userName);
    } catch {
      // Non-blocking
    }

    revalidatePath('/products');
    return { success: true, prodCode: code };
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return { error: err.errors[0]?.message || 'Invalid product parameters' };
    }
    return { error: err?.message || 'Failed to add product' };
  }
}

// ========================================================================
// 2. UPDATE PRODUCT ACTION
// ========================================================================
export async function updateProductAction(input: UpdateProductInput) {
  try {
    const auth = await checkUserPermission('edit_product');
    if (!auth.authorized) {
      return { error: auth.error || 'Access denied: Missing right edit_product.' };
    }
    const user = auth.user;
    const userName = user?.fullName || user?.email?.split('@')[0] || 'staff';
    const validated = updateProductSchema.parse(input);
    const code = validated.prodCode.toUpperCase();
    const stampStr = getStampString('EDITED', userName);

    if (isSupabaseLive()) {
      try {
        const supabase = await createClient();
        const { error } = await supabase
          .from('PRODUCT')
          .update({
            description: validated.description,
            unit: validated.unit,
            stamp: stampStr,
          })
          .eq('prodCode', code);

        if (error) return { error: error.message };
        revalidatePath('/products');
        return { success: true };
      } catch (err: any) {
        return { error: err?.message || 'Database error updating product' };
      }
    }

    // SQLite implementation
    const db = getSqliteDb();
    const existing = db.prepare('SELECT * FROM PRODUCT WHERE prodCode = ?').get(code) as any;
    if (!existing) {
      return { error: 'Product not found.' };
    }

    db.prepare(`
      UPDATE PRODUCT
      SET description = ?, unit = ?, stamp = ?
      WHERE prodCode = ?
    `).run(validated.description, validated.unit, stampStr, code);

    // Audit log
    try {
      db.prepare(`
        INSERT INTO audit_log (table_name, action, record_key, old_values, new_values, action_by)
        VALUES ('PRODUCT', 'EDIT', ?, ?, ?, ?)
      `).run(
        code,
        JSON.stringify({ description: existing.description, unit: existing.unit }),
        JSON.stringify({ description: validated.description, unit: validated.unit }),
        userName
      );
    } catch {
      // Non-blocking
    }

    revalidatePath('/products');
    return { success: true };
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return { error: err.errors[0]?.message || 'Invalid parameters' };
    }
    return { error: err?.message || 'Failed to update product' };
  }
}

// ========================================================================
// 3. SOFT-DELETE & RESTORE PRODUCT ACTIONS
// ========================================================================
export async function deleteProductAction(prodCode: string) {
  try {
    const auth = await checkUserPermission('delete_product');
    if (!auth.authorized) {
      return { error: auth.error || 'Access denied: Missing right delete_product.' };
    }
    const user = auth.user;
    const userName = user?.fullName || user?.email?.split('@')[0] || 'staff';
    const cleanCode = String(prodCode).trim().toUpperCase();
    const stampStr = getStampString('DELETED', userName);

    const db = getSqliteDb();
    const existing = db.prepare('SELECT is_deleted FROM PRODUCT WHERE prodCode = ?').get(cleanCode) as any;
    if (!existing) {
      return { error: `Product #${cleanCode} was not found.` };
    }

    if (existing.is_deleted === 1 || existing.is_deleted === true) {
      return { error: `Product #${cleanCode} is already inactive.` };
    }

    db.prepare(`
      UPDATE PRODUCT 
      SET is_deleted = 1, stamp = ?
      WHERE prodCode = ?
    `).run(stampStr, cleanCode);

    try {
      db.prepare(`
        INSERT INTO audit_log (table_name, action, record_key, action_by)
        VALUES ('PRODUCT', 'DELETE', ?, ?)
      `).run(cleanCode, userName);
    } catch {
      // Non-blocking
    }

    revalidatePath('/products');
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || 'Failed to soft-delete product.' };
  }
}

export async function restoreProductAction(prodCode: string) {
  try {
    const user = await getCurrentUser();
    const role = (user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') {
      return { error: 'Access denied: Only administrative staff can restore products.' };
    }

    const userName = user?.fullName || user?.email?.split('@')[0] || role;
    const cleanCode = String(prodCode).trim().toUpperCase();
    const stampStr = getStampString('RESTORED', userName);

    const db = getSqliteDb();
    const existing = db.prepare('SELECT is_deleted FROM PRODUCT WHERE prodCode = ?').get(cleanCode) as any;
    if (!existing) {
      return { error: `Product #${cleanCode} was not found.` };
    }

    if (!existing.is_deleted) {
      return { error: `Product #${cleanCode} is already active.` };
    }

    db.prepare(`
      UPDATE PRODUCT 
      SET is_deleted = 0, stamp = ?
      WHERE prodCode = ?
    `).run(stampStr, cleanCode);

    try {
      db.prepare(`
        INSERT INTO audit_log (table_name, action, record_key, action_by)
        VALUES ('PRODUCT', 'RESTORE', ?, ?)
      `).run(cleanCode, userName);
    } catch {
      // Non-blocking
    }

    revalidatePath('/products');
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || 'Failed to restore product.' };
  }
}

// ========================================================================
// 4. PRICE HISTORY ACTIONS (FIGURE 12 & 13)
// ========================================================================
export async function addPriceAction(input: PriceRecordInput) {
  try {
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
    const existing = db.prepare('SELECT 1 FROM PRICEHIST WHERE prodCode = ? AND effDate = ?').get(code, validated.effDate);
    if (existing) {
      return { error: `A price record already exists for ${code} on ${validated.effDate}. Edit that record instead.` };
    }

    db.prepare(`
      INSERT INTO PRICEHIST (effDate, prodCode, unitPrice, is_deleted, stamp)
      VALUES (?, ?, ?, 0, ?)
    `).run(validated.effDate, code, validated.unitPrice, stampStr);

    try {
      db.prepare(`
        INSERT INTO audit_log (table_name, action, record_key, new_values, action_by)
        VALUES ('PRICEHIST', 'ADD', ?, ?, ?)
      `).run(
        `${code}:${validated.effDate}`,
        JSON.stringify({ unitPrice: validated.unitPrice }),
        userName
      );
    } catch {
      // Non-blocking
    }

    revalidatePath('/products');
    return { success: true };
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return { error: err.errors[0]?.message || 'Invalid price input' };
    }
    return { error: err?.message || 'Failed to add price record' };
  }
}

export async function updatePriceAction(input: PriceRecordInput) {
  try {
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
    const existing = db.prepare('SELECT * FROM PRICEHIST WHERE prodCode = ? AND effDate = ?').get(code, validated.effDate) as any;
    if (!existing) {
      return { error: 'Price record not found.' };
    }

    db.prepare(`
      UPDATE PRICEHIST
      SET unitPrice = ?, stamp = ?
      WHERE prodCode = ? AND effDate = ?
    `).run(validated.unitPrice, stampStr, code, validated.effDate);

    try {
      db.prepare(`
        INSERT INTO audit_log (table_name, action, record_key, old_values, new_values, action_by)
        VALUES ('PRICEHIST', 'EDIT', ?, ?, ?, ?)
      `).run(
        `${code}:${validated.effDate}`,
        JSON.stringify({ unitPrice: existing.unitPrice }),
        JSON.stringify({ unitPrice: validated.unitPrice }),
        userName
      );
    } catch {
      // Non-blocking
    }

    revalidatePath('/products');
    return { success: true };
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return { error: err.errors[0]?.message || 'Invalid price input' };
    }
    return { error: err?.message || 'Failed to update price' };
  }
}

export async function deletePriceAction(prodCode: string, effDate: string) {
  try {
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
    const existing = db.prepare('SELECT is_deleted FROM PRICEHIST WHERE prodCode = ? AND effDate = ?').get(cleanCode, cleanDate) as any;
    if (!existing) {
      return { error: 'Price record not found.' };
    }

    db.prepare(`
      UPDATE PRICEHIST
      SET is_deleted = 1, stamp = ?
      WHERE prodCode = ? AND effDate = ?
    `).run(stampStr, cleanCode, cleanDate);

    try {
      db.prepare(`
        INSERT INTO audit_log (table_name, action, record_key, action_by)
        VALUES ('PRICEHIST', 'DELETE', ?, ?)
      `).run(`${cleanCode}:${cleanDate}`, userName);
    } catch {
      // Non-blocking
    }

    revalidatePath('/products');
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || 'Failed to soft-delete price record.' };
  }
}

export async function restorePriceAction(prodCode: string, effDate: string) {
  try {
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
    const existing = db.prepare('SELECT is_deleted FROM PRICEHIST WHERE prodCode = ? AND effDate = ?').get(cleanCode, cleanDate) as any;
    if (!existing) {
      return { error: 'Price record not found.' };
    }

    db.prepare(`
      UPDATE PRICEHIST
      SET is_deleted = 0, stamp = ?
      WHERE prodCode = ? AND effDate = ?
    `).run(stampStr, cleanCode, cleanDate);

    try {
      db.prepare(`
        INSERT INTO audit_log (table_name, action, record_key, action_by)
        VALUES ('PRICEHIST', 'RESTORE', ?, ?)
      `).run(`${cleanCode}:${cleanDate}`, userName);
    } catch {
      // Non-blocking
    }

    revalidatePath('/products');
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || 'Failed to restore price record.' };
  }
}

// Backward compatibility exports
export const addNewPriceAction = addPriceAction;
export async function correctPriceAction(input: { prodCode: string; unitPrice: number; effDate?: string }) {
  const db = getSqliteDb();
  let effDate = input.effDate;
  if (!effDate) {
    const latest = db
      .prepare('SELECT effDate FROM PRICEHIST WHERE prodCode = ? ORDER BY effDate DESC LIMIT 1')
      .get(input.prodCode.toUpperCase()) as any;
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

