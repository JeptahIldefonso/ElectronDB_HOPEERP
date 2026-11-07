import bcrypt from 'bcryptjs';
import type { UserRole, UserAccount } from '@/lib/types';
import { CANONICAL_RIGHTS } from '@/lib/types';
import { getHopeDb, type HopeDatabase } from '@/lib/hope-db';

let tablesInitialized = false;

function getStampString(action: 'CREATED' | 'EDITED' | 'DELETED' | 'RESTORED' | 'BLOCKED' | 'UNBLOCKED', byUser = 'system'): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' });
  return `${action} ${byUser} ${dateStr} ${timeStr}`;
}

/**
 * Initializes USERS, RIGHTS, USERRIGHTS tables (Student Guide §2.4)
 * and provisions initial administrator credentials from environment variables.
 * 
 * Works identically across local SQLite (hope.work.db) and production Turso cloud libSQL.
 */
/**
 * Safely parses DEV_ADMIN_PASSWORD_HASH from environment variables.
 * Supports:
 * - base64:<string> or standard base64 (bypasses Next.js $ variable expansion in .env files)
 * - Raw bcrypt strings ($2a$, $2b$, $2y$)
 */
export function getAdminPasswordHash(): string | undefined {
  const raw = process.env.DEV_ADMIN_PASSWORD_HASH?.trim();
  if (!raw) return undefined;
  if (raw.startsWith('base64:')) {
    try {
      return Buffer.from(raw.slice(7), 'base64').toString('utf8').trim();
    } catch {
      return undefined;
    }
  }
  if (raw.startsWith('$2')) {
    return raw;
  }
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8').trim();
    if (decoded.startsWith('$2')) {
      return decoded;
    }
  } catch {
    // Not base64
  }
  return raw;
}

export async function ensureAuthDb(): Promise<void> {
  if (tablesInitialized) return;
  const db = getHopeDb();

  // 1. Proposed USERS Table (Guide §2.4)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS USERS (
      userId TEXT PRIMARY KEY,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Superadmin', 'Admin', 'User')),
      isBlocked INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Inactive')),
      stamp TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 2. Proposed RIGHTS Table (Guide §2.4 - 36 canonical rights)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS RIGHTS (
      rightCode TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      description TEXT NOT NULL
    );
  `);

  // 3. Proposed USERRIGHTS Junction Table (Guide §2.4)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS USERRIGHTS (
      userId TEXT NOT NULL,
      rightCode TEXT NOT NULL,
      PRIMARY KEY (userId, rightCode),
      FOREIGN KEY (userId) REFERENCES USERS(userId) ON DELETE CASCADE,
      FOREIGN KEY (rightCode) REFERENCES RIGHTS(rightCode) ON DELETE CASCADE
    );
  `);

  // Legacy table support if it was already created
  await db.exec(`
    CREATE TABLE IF NOT EXISTS staff_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      passwordHash TEXT NOT NULL,
      fullName TEXT NOT NULL,
      role TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Populate RIGHTS table with the 36 canonical rights
  for (const r of CANONICAL_RIGHTS) {
    await db.run(`
      INSERT OR IGNORE INTO RIGHTS (rightCode, module, description)
      VALUES (?, ?, ?)
    `, [r.rightCode, r.module, r.label]);
  }

  // Provision administrator account from environment variable if configured
  const adminHash = getAdminPasswordHash();
  if (adminHash) {
    const adminEmail = (process.env.DEV_ADMIN_EMAIL || 'ildefonsojeptahashleyr@gmail.com').toLowerCase().trim();
    const existing = await db.get<{ userId: string }>('SELECT userId FROM USERS WHERE LOWER(email) = LOWER(?)', [adminEmail]);
    if (!existing) {
      await db.run(`
        INSERT OR IGNORE INTO USERS (userId, firstName, lastName, email, passwordHash, role, isBlocked, status, stamp)
        VALUES (?, ?, ?, ?, ?, 'Superadmin', 0, 'Active', ?)
      `, ['usr-dev-jeptah', 'Jeptah Ashley', 'Ildefonso', adminEmail, adminHash, getStampString('CREATED', 'system')]);
    } else {
      await db.run(`
        UPDATE USERS SET passwordHash = ?, role = 'Superadmin', status = 'Active', isBlocked = 0
        WHERE userId = ?
      `, [adminHash, existing.userId]);
    }
  }

  tablesInitialized = true;
}

/**
 * Finds user in USERS table (falls back to staff_accounts if migrating)
 */
export async function findAccountByEmail(email: string): Promise<(UserAccount & { id?: number }) | undefined> {
  await ensureAuthDb();
  const db = getHopeDb();
  
  const user = await db.get<any>(`
    SELECT userId, firstName, lastName, email, passwordHash, role, isBlocked, status, stamp, createdAt
    FROM USERS
    WHERE LOWER(email) = LOWER(?)
  `, [email.trim()]);

  if (user) {
    const rightsRows = await db.query<any>(`
      SELECT rightCode FROM USERRIGHTS WHERE userId = ?
    `, [user.userId]);
    const rights = rightsRows.map((r) => r.rightCode);

    return {
      userId: user.userId,
      id: 1,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      isBlocked: Boolean(user.isBlocked),
      status: user.status,
      stamp: user.stamp,
      createdAt: user.createdAt,
      rights,
    };
  }

  // Legacy staff_accounts lookup fallback
  const staff = await db.get<any>(`
    SELECT id, email, passwordHash, fullName, role, createdAt
    FROM staff_accounts
    WHERE LOWER(email) = LOWER(?)
  `, [email.trim()]);

  if (staff) {
    const roleMap: Record<string, 'Superadmin' | 'Admin' | 'User'> = {
      admin: 'Admin',
      sales: 'User',
      cashier: 'User',
    };
    const mappedRole = roleMap[staff.role] || 'User';
    const names = staff.fullName.split(' ');
    return {
      userId: `usr-${staff.id}`,
      id: staff.id,
      firstName: names[0] || 'Staff',
      lastName: names.slice(1).join(' ') || 'Member',
      fullName: staff.fullName,
      email: staff.email,
      passwordHash: staff.passwordHash,
      role: mappedRole,
      isBlocked: false,
      status: 'Active',
      stamp: 'CREATED system',
      createdAt: staff.createdAt,
      rights: ['add_customer', 'edit_customer', 'add_sale', 'view_sale_details'],
    };
  }

  return undefined;
}

export async function emailExists(email: string): Promise<boolean> {
  await ensureAuthDb();
  const db = getHopeDb();
  const inUsers = await db.get('SELECT 1 FROM USERS WHERE LOWER(email) = LOWER(?)', [email.trim()]);
  if (inUsers) return true;
  const inStaff = await db.get('SELECT 1 FROM staff_accounts WHERE LOWER(email) = LOWER(?)', [email.trim()]);
  return Boolean(inStaff);
}

export async function insertAccount(
  email: string,
  passwordHash: string,
  fullName: string,
  role: UserRole = 'User'
): Promise<{ id: number; email: string; fullName: string; role: UserRole }> {
  await ensureAuthDb();
  const db = getHopeDb();
  const names = fullName.trim().split(' ');
  const firstName = names[0] || 'User';
  const lastName = names.slice(1).join(' ') || 'User';
  const userId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const stamp = getStampString('CREATED', 'system');
  
  const mappedRole: 'Superadmin' | 'Admin' | 'User' = 
    role === 'Superadmin' ? 'Superadmin' : role === 'Admin' || role === 'admin' ? 'Admin' : 'User';

  await db.run(`
    INSERT INTO USERS (userId, firstName, lastName, email, passwordHash, role, isBlocked, status, stamp)
    VALUES (?, ?, ?, ?, ?, ?, 0, 'Active', ?)
  `, [userId, firstName, lastName, email.trim().toLowerCase(), passwordHash, mappedRole, stamp]);

  return {
    id: Date.now(),
    email: email.trim().toLowerCase(),
    fullName,
    role: mappedRole,
  };
}

export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, 10);
}

export async function getAllUsers(actingRole: UserRole = 'Admin'): Promise<UserAccount[]> {
  await ensureAuthDb();
  const db = getHopeDb();

  // Superadmin sees all accounts; Admin sees Admins and Users (Superadmin accounts are hidden - Guide §3.8)
  let query = `
    SELECT userId, firstName, lastName, email, role, isBlocked, status, stamp, createdAt
    FROM USERS
  `;
  if (actingRole !== 'Superadmin') {
    query += ` WHERE role != 'Superadmin'`;
  }
  query += ` ORDER BY role DESC, lastName ASC`;

  const rows = await db.query<any>(query);

  const results: UserAccount[] = [];
  for (const u of rows) {
    const rightsRows = await db.query<any>('SELECT rightCode FROM USERRIGHTS WHERE userId = ?', [u.userId]);
    const rights = rightsRows.map((r) => r.rightCode);
    results.push({
      userId: u.userId,
      firstName: u.firstName,
      lastName: u.lastName,
      fullName: `${u.firstName} ${u.lastName}`.trim(),
      email: u.email,
      passwordHash: '',
      role: u.role,
      isBlocked: Boolean(u.isBlocked),
      status: u.status,
      stamp: u.stamp,
      createdAt: u.createdAt,
      rights,
    });
  }

  return results;
}

export async function toggleBlockUser(userId: string, updatedBy = 'Admin'): Promise<{ success: boolean; isBlocked?: boolean; error?: string }> {
  await ensureAuthDb();
  const db = getHopeDb();

  const user = await db.get<any>('SELECT isBlocked, role FROM USERS WHERE userId = ?', [userId]);
  if (!user) return { success: false, error: 'User not found' };
  if (user.role === 'Superadmin') return { success: false, error: 'Superadmin accounts cannot be blocked' };

  const newBlocked = user.isBlocked ? 0 : 1;
  const stamp = getStampString(newBlocked ? 'BLOCKED' : 'UNBLOCKED', updatedBy);

  await db.run(`
    UPDATE USERS SET isBlocked = ?, stamp = ? WHERE userId = ?
  `, [newBlocked, stamp, userId]);

  return { success: true, isBlocked: Boolean(newBlocked) };
}

export async function updateUserRights(userId: string, rightCodes: string[], updatedBy = 'Admin'): Promise<{ success: boolean; error?: string }> {
  await ensureAuthDb();
  const db = getHopeDb();

  const user = await db.get<any>('SELECT role FROM USERS WHERE userId = ?', [userId]);
  if (!user) return { success: false, error: 'User not found' };
  if (user.role === 'Superadmin') return { success: false, error: 'Superadmin rights cannot be modified.' };

  // Clear existing rights
  await db.run('DELETE FROM USERRIGHTS WHERE userId = ?', [userId]);

  // Insert updated rights
  for (const code of rightCodes) {
    await db.run('INSERT INTO USERRIGHTS (userId, rightCode) VALUES (?, ?)', [userId, code]);
  }

  const stamp = getStampString('EDITED', updatedBy);
  await db.run('UPDATE USERS SET stamp = ? WHERE userId = ?', [stamp, userId]);

  return { success: true };
}

export async function getUserRights(userId: string): Promise<string[]> {
  await ensureAuthDb();
  const db = getHopeDb();
  const rows = await db.query<any>('SELECT rightCode FROM USERRIGHTS WHERE userId = ?', [userId]);
  return rows.map((r) => r.rightCode);
}

export async function adminCreateUser(
  firstName: string,
  lastName: string,
  email: string,
  passwordHash: string,
  role: 'Admin' | 'User',
  updatedBy = 'Admin'
): Promise<{ success: boolean; userId?: string; error?: string }> {
  await ensureAuthDb();
  const db = getHopeDb();
  const cleanEmail = email.trim().toLowerCase();

  if (await emailExists(cleanEmail)) {
    return { success: false, error: 'An account with this email address already exists.' };
  }

  const userId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const stamp = getStampString('CREATED', updatedBy);

  try {
    await db.run(`
      INSERT INTO USERS (userId, firstName, lastName, email, passwordHash, role, isBlocked, status, stamp)
      VALUES (?, ?, ?, ?, ?, ?, 0, 'Active', ?)
    `, [userId, firstName.trim(), lastName.trim(), cleanEmail, passwordHash, role, stamp]);

    // If role is User, grant canonical baseline user rights
    if (role === 'User') {
      const defaultUserRights = [
        'add_customer', 'edit_customer',
        'add_product', 'edit_product',
        'view_sale_details', 'edit_sale_detail',
        'report_top_customers', 'report_product_master', 'report_top_products',
      ];
      for (const rc of defaultUserRights) {
        await db.run('INSERT OR IGNORE INTO USERRIGHTS (userId, rightCode) VALUES (?, ?)', [userId, rc]);
      }
    }

    return { success: true, userId };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create user in database.' };
  }
}

export async function updateUserProfile(
  userId: string,
  firstName: string,
  lastName: string,
  email: string,
  role?: UserRole,
  passwordHash?: string,
  updatedBy = 'Admin'
): Promise<{ success: boolean; error?: string }> {
  await ensureAuthDb();
  const db = getHopeDb();
  const cleanEmail = email.trim().toLowerCase();

  const user = await db.get<any>('SELECT userId, role, email FROM USERS WHERE userId = ?', [userId]);
  if (!user) return { success: false, error: 'User not found' };
  if (user.role === 'Superadmin' && updatedBy !== 'Superadmin') {
    return { success: false, error: 'Administrators cannot modify Superadmin accounts.' };
  }

  // Check if new email is taken by someone else
  if (cleanEmail !== user.email.toLowerCase()) {
    const existing = await db.get('SELECT userId FROM USERS WHERE LOWER(email) = ? AND userId != ?', [cleanEmail, userId]);
    if (existing) {
      return { success: false, error: 'This email is already in use by another account.' };
    }
  }

  const stamp = getStampString('EDITED', updatedBy);

  try {
    if (passwordHash) {
      if (role) {
        await db.run(`
          UPDATE USERS 
          SET firstName = ?, lastName = ?, email = ?, role = ?, passwordHash = ?, stamp = ?
          WHERE userId = ?
        `, [firstName.trim(), lastName.trim(), cleanEmail, role, passwordHash, stamp, userId]);
      } else {
        await db.run(`
          UPDATE USERS 
          SET firstName = ?, lastName = ?, email = ?, passwordHash = ?, stamp = ?
          WHERE userId = ?
        `, [firstName.trim(), lastName.trim(), cleanEmail, passwordHash, stamp, userId]);
      }
    } else {
      if (role) {
        await db.run(`
          UPDATE USERS 
          SET firstName = ?, lastName = ?, email = ?, role = ?, stamp = ?
          WHERE userId = ?
        `, [firstName.trim(), lastName.trim(), cleanEmail, role, stamp, userId]);
      } else {
        await db.run(`
          UPDATE USERS 
          SET firstName = ?, lastName = ?, email = ?, stamp = ?
          WHERE userId = ?
        `, [firstName.trim(), lastName.trim(), cleanEmail, stamp, userId]);
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update user profile.' };
  }
}

export async function resetUserPassword(
  email: string,
  passwordHash: string
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  await ensureAuthDb();
  const db = getHopeDb();
  const cleanEmail = email.trim().toLowerCase();

  const user = await db.get<any>(
    'SELECT userId, firstName, lastName, email, role, isBlocked, status, createdAt FROM USERS WHERE LOWER(email) = LOWER(?)',
    [cleanEmail]
  );

  if (!user) {
    return { success: false, error: 'No registered account found with this email address.' };
  }

  if (user.isBlocked || user.status !== 'Active') {
    return { success: false, error: 'This account has been deactivated or blocked by an administrator.' };
  }

  if (user.role !== 'Superadmin') {
    return {
      success: false,
      error: 'Emergency reset is reserved for Superadmin accounts. Staff accounts are managed in User Management.',
    };
  }

  const stamp = getStampString('EDITED', 'Superadmin Recovery');

  try {
    const update = await db.run(
      `UPDATE USERS SET passwordHash = ?, stamp = ?
       WHERE userId = ? AND role = 'Superadmin' AND isBlocked = 0 AND status = 'Active'`,
      [passwordHash, stamp, user.userId]
    );
    if (update.changes === 0) {
      return { success: false, error: 'This Superadmin account is inactive or blocked.' };
    }

    return {
      success: true,
      user: {
        userId: user.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        role: user.role,
        isBlocked: Boolean(user.isBlocked),
        status: user.status,
        stamp,
        createdAt: user.createdAt,
        rights: [],
        passwordHash,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update password.' };
  }
}
