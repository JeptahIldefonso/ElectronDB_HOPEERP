import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import type { UserRole, UserAccount } from '@/lib/types';
import { CANONICAL_RIGHTS } from '@/lib/types';

let dbInstance: DatabaseSync | null = null;

function getDbPath(): string {
  if (process.env.VERCEL) {
    return path.join('/tmp', 'auth.db');
  }
  return path.join(process.cwd(), 'auth.db');
}

export function getAuthDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dbPath = getDbPath();
  try {
    dbInstance = new DatabaseSync(dbPath);
  } catch (err) {
    try {
      dbInstance = new DatabaseSync(path.join('/tmp', 'auth.db'));
    } catch {
      dbInstance = new DatabaseSync(':memory:');
    }
  }

  try {
    dbInstance.exec('PRAGMA journal_mode = WAL;');
  } catch {
    // WAL fallback
  }

  return dbInstance;
}

function getStampString(action: 'CREATED' | 'EDITED' | 'DELETED' | 'RESTORED' | 'BLOCKED' | 'UNBLOCKED', byUser = 'system'): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' });
  return `${action} ${byUser} ${dateStr} ${timeStr}`;
}

/**
 * Initializes USERS, RIGHTS, USERRIGHTS tables (Student Guide §2.4)
 * and seeds canonical demo accounts & 36 rights.
 * 
 * Note: On Vercel serverless deployments, /tmp is ephemeral and resets on cold start;
 * changes made on the deployed site are not persistent across serverless restarts.
 */
export function ensureAuthDb(): void {
  const db = getAuthDb();

  // 1. Proposed USERS Table (Guide §2.4)
  db.exec(`
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS RIGHTS (
      rightCode TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      description TEXT NOT NULL
    );
  `);

  // 3. Proposed USERRIGHTS Junction Table (Guide §2.4)
  db.exec(`
    CREATE TABLE IF NOT EXISTS USERRIGHTS (
      userId TEXT NOT NULL,
      rightCode TEXT NOT NULL,
      PRIMARY KEY (userId, rightCode),
      FOREIGN KEY (userId) REFERENCES USERS(userId) ON DELETE CASCADE,
      FOREIGN KEY (rightCode) REFERENCES RIGHTS(rightCode) ON DELETE CASCADE
    );
  `);

  // Legacy table support if it was already created
  db.exec(`
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
  const insertRightStmt = db.prepare(`
    INSERT OR IGNORE INTO RIGHTS (rightCode, module, description)
    VALUES (?, ?, ?)
  `);

  for (const r of CANONICAL_RIGHTS) {
    insertRightStmt.run(r.rightCode, r.module, r.label);
  }

  // Precomputed salted bcrypt hashes (never plaintext passwords in source code)
  // 'demo' -> $2b$10$uD1Nx8kdhqM4wL0PHA4f2.8v2SFuT5cYRDTqDcvWQJPDe8vorujOe
  // developer pass -> $2b$10$gEd44NE4L.9y2tmLcVQsw.O4wZmRSyZ4zbfba9i6fjsCb9oEzCqGq
  const HASH_DEMO = '$2b$10$uD1Nx8kdhqM4wL0PHA4f2.8v2SFuT5cYRDTqDcvWQJPDe8vorujOe';
  const HASH_DEV = '$2b$10$gEd44NE4L.9y2tmLcVQsw.O4wZmRSyZ4zbfba9i6fjsCb9oEzCqGq';

  // Seed Default Accounts matching Student Guide & preserving developer credentials
  const defaultAccounts = [
    {
      userId: 'usr-superadmin',
      firstName: 'Michael',
      lastName: 'Superadmin',
      email: 'superadmin@hope.com',
      role: 'Superadmin' as const,
      passwordHash: HASH_DEMO,
      stamp: getStampString('CREATED', 'system'),
    },
    {
      userId: 'usr-admin',
      firstName: 'Lisa',
      lastName: 'Park',
      email: 'admin@hope.com',
      role: 'Admin' as const,
      passwordHash: HASH_DEMO,
      stamp: getStampString('CREATED', 'system'),
    },
    {
      userId: 'usr-manager',
      firstName: 'David',
      lastName: 'Kim',
      email: 'manager@hope.com',
      role: 'Admin' as const,
      passwordHash: HASH_DEMO,
      stamp: getStampString('CREATED', 'system'),
    },
    {
      userId: 'usr-user',
      firstName: 'Alex',
      lastName: 'Rivera',
      email: 'user@hope.com',
      role: 'User' as const,
      passwordHash: HASH_DEMO,
      stamp: getStampString('CREATED', 'system'),
    },
    {
      userId: 'usr-dev-jeptah',
      firstName: 'Jeptah Ashley',
      lastName: 'Ildefonso',
      email: 'ildefonsojeptahashleyr@gmail.com',
      role: 'Superadmin' as const,
      passwordHash: HASH_DEV,
      stamp: getStampString('CREATED', 'system'),
    },
  ];

  const insertUserStmt = db.prepare(`
    INSERT OR IGNORE INTO USERS (userId, firstName, lastName, email, passwordHash, role, isBlocked, status, stamp)
    VALUES (?, ?, ?, ?, ?, ?, 0, 'Active', ?)
  `);

  for (const acc of defaultAccounts) {
    const existing = db.prepare('SELECT userId FROM USERS WHERE LOWER(email) = LOWER(?)').get(acc.email);
    if (!existing) {
      insertUserStmt.run(acc.userId, acc.firstName, acc.lastName, acc.email.toLowerCase(), acc.passwordHash, acc.role, acc.stamp);
    }
  }

  // Seed default rights for Alex Rivera ('user@hope.com') matching the guide figures (Figures 37-40)
  const defaultUserRights = [
    'add_customer', 'edit_customer', // Customer (delete unticked)
    'add_product', 'edit_product', // Product (prices unticked)
    'view_sale_details', 'edit_sale_detail', // Sales
    'report_top_customers', 'report_product_master', 'report_top_products', // Reports
  ];

  const insertUserRightStmt = db.prepare(`
    INSERT OR IGNORE INTO USERRIGHTS (userId, rightCode)
    VALUES (?, ?)
  `);

  for (const rc of defaultUserRights) {
    insertUserRightStmt.run('usr-user', rc);
  }
}

/**
 * Finds user in USERS table (falls back to staff_accounts if migrating)
 */
export function findAccountByEmail(email: string): (UserAccount & { id?: number }) | undefined {
  ensureAuthDb();
  const db = getAuthDb();
  
  const user = db.prepare(`
    SELECT userId, firstName, lastName, email, passwordHash, role, isBlocked, status, stamp, createdAt
    FROM USERS
    WHERE LOWER(email) = LOWER(?)
  `).get(email.trim()) as any;

  if (user) {
    const rights = db.prepare(`
      SELECT rightCode FROM USERRIGHTS WHERE userId = ?
    `).all(user.userId).map((r: any) => r.rightCode);

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
  const staff = db.prepare(`
    SELECT id, email, passwordHash, fullName, role, createdAt
    FROM staff_accounts
    WHERE LOWER(email) = LOWER(?)
  `).get(email.trim()) as any;

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

export function emailExists(email: string): boolean {
  ensureAuthDb();
  const db = getAuthDb();
  const inUsers = db.prepare('SELECT 1 FROM USERS WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (inUsers) return true;
  const inStaff = db.prepare('SELECT 1 FROM staff_accounts WHERE LOWER(email) = LOWER(?)').get(email.trim());
  return Boolean(inStaff);
}

export function insertAccount(
  email: string,
  passwordHash: string,
  fullName: string,
  role: UserRole = 'User'
): { id: number; email: string; fullName: string; role: UserRole } {
  ensureAuthDb();
  const db = getAuthDb();
  const names = fullName.trim().split(' ');
  const firstName = names[0] || 'User';
  const lastName = names.slice(1).join(' ') || 'User';
  const userId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const stamp = getStampString('CREATED', 'system');
  
  const mappedRole: 'Superadmin' | 'Admin' | 'User' = 
    role === 'Superadmin' ? 'Superadmin' : role === 'Admin' || role === 'admin' ? 'Admin' : 'User';

  db.prepare(`
    INSERT INTO USERS (userId, firstName, lastName, email, passwordHash, role, isBlocked, status, stamp)
    VALUES (?, ?, ?, ?, ?, ?, 0, 'Active', ?)
  `).run(userId, firstName, lastName, email.trim().toLowerCase(), passwordHash, mappedRole, stamp);

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

export function getAllUsers(actingRole: UserRole = 'Admin'): UserAccount[] {
  ensureAuthDb();
  const db = getAuthDb();

  // Superadmin sees all accounts; Admin sees Admins and Users (Superadmin accounts are hidden - Guide §3.8)
  let query = `
    SELECT userId, firstName, lastName, email, role, isBlocked, status, stamp, createdAt
    FROM USERS
  `;
  if (actingRole !== 'Superadmin') {
    query += ` WHERE role != 'Superadmin'`;
  }
  query += ` ORDER BY role DESC, lastName ASC`;

  const rows = db.prepare(query).all() as any[];

  return rows.map((u) => {
    const rights = db.prepare('SELECT rightCode FROM USERRIGHTS WHERE userId = ?').all(u.userId).map((r: any) => r.rightCode);
    return {
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
    };
  });
}

export function toggleBlockUser(userId: string, updatedBy = 'Admin'): { success: boolean; isBlocked?: boolean; error?: string } {
  ensureAuthDb();
  const db = getAuthDb();

  const user = db.prepare('SELECT isBlocked, role FROM USERS WHERE userId = ?').get(userId) as any;
  if (!user) return { success: false, error: 'User not found' };
  if (user.role === 'Superadmin') return { success: false, error: 'Superadmin accounts cannot be blocked' };

  const newBlocked = user.isBlocked ? 0 : 1;
  const stamp = getStampString(newBlocked ? 'BLOCKED' : 'UNBLOCKED', updatedBy);

  db.prepare(`
    UPDATE USERS SET isBlocked = ?, stamp = ? WHERE userId = ?
  `).run(newBlocked, stamp, userId);

  return { success: true, isBlocked: Boolean(newBlocked) };
}

export function updateUserRights(userId: string, rightCodes: string[], updatedBy = 'Admin'): { success: boolean; error?: string } {
  ensureAuthDb();
  const db = getAuthDb();

  const user = db.prepare('SELECT role FROM USERS WHERE userId = ?').get(userId) as any;
  if (!user) return { success: false, error: 'User not found' };
  if (user.role === 'Superadmin') return { success: false, error: 'Superadmin rights cannot be modified.' };

  // Clear existing rights
  db.prepare('DELETE FROM USERRIGHTS WHERE userId = ?').run(userId);

  // Insert updated rights
  const insertStmt = db.prepare('INSERT INTO USERRIGHTS (userId, rightCode) VALUES (?, ?)');
  for (const code of rightCodes) {
    insertStmt.run(userId, code);
  }

  const stamp = getStampString('EDITED', updatedBy);
  db.prepare('UPDATE USERS SET stamp = ? WHERE userId = ?').run(stamp, userId);

  return { success: true };
}

export function getUserRights(userId: string): string[] {
  ensureAuthDb();
  const db = getAuthDb();
  return db.prepare('SELECT rightCode FROM USERRIGHTS WHERE userId = ?').all(userId).map((r: any) => r.rightCode);
}

export function adminCreateUser(
  firstName: string,
  lastName: string,
  email: string,
  passwordHash: string,
  role: 'Admin' | 'User',
  updatedBy = 'Admin'
): { success: boolean; userId?: string; error?: string } {
  ensureAuthDb();
  const db = getAuthDb();
  const cleanEmail = email.trim().toLowerCase();

  if (emailExists(cleanEmail)) {
    return { success: false, error: 'An account with this email address already exists.' };
  }

  const userId = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const stamp = getStampString('CREATED', updatedBy);

  try {
    db.prepare(`
      INSERT INTO USERS (userId, firstName, lastName, email, passwordHash, role, isBlocked, status, stamp)
      VALUES (?, ?, ?, ?, ?, ?, 0, 'Active', ?)
    `).run(userId, firstName.trim(), lastName.trim(), cleanEmail, passwordHash, role, stamp);

    // If role is User, grant canonical baseline user rights
    if (role === 'User') {
      const defaultUserRights = [
        'add_customer', 'edit_customer',
        'add_product', 'edit_product',
        'view_sale_details', 'edit_sale_detail',
        'report_top_customers', 'report_product_master', 'report_top_products',
      ];
      const insertRightStmt = db.prepare('INSERT OR IGNORE INTO USERRIGHTS (userId, rightCode) VALUES (?, ?)');
      for (const rc of defaultUserRights) {
        insertRightStmt.run(userId, rc);
      }
    }

    return { success: true, userId };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create user in database.' };
  }
}

export function updateUserProfile(
  userId: string,
  firstName: string,
  lastName: string,
  email: string,
  role?: 'Admin' | 'User',
  passwordHash?: string,
  updatedBy = 'Admin'
): { success: boolean; error?: string } {
  ensureAuthDb();
  const db = getAuthDb();
  const cleanEmail = email.trim().toLowerCase();

  const user = db.prepare('SELECT userId, role, email FROM USERS WHERE userId = ?').get(userId) as any;
  if (!user) return { success: false, error: 'User not found' };
  if (user.role === 'Superadmin' && updatedBy !== 'Superadmin') {
    return { success: false, error: 'Administrators cannot modify Superadmin accounts.' };
  }

  // Check if new email is taken by someone else
  if (cleanEmail !== user.email.toLowerCase()) {
    const existing = db.prepare('SELECT userId FROM USERS WHERE LOWER(email) = ? AND userId != ?').get(cleanEmail, userId);
    if (existing) {
      return { success: false, error: 'This email is already in use by another account.' };
    }
  }

  const stamp = getStampString('EDITED', updatedBy);

  try {
    if (passwordHash) {
      if (role) {
        db.prepare(`
          UPDATE USERS 
          SET firstName = ?, lastName = ?, email = ?, role = ?, passwordHash = ?, stamp = ?
          WHERE userId = ?
        `).run(firstName.trim(), lastName.trim(), cleanEmail, role, passwordHash, stamp, userId);
      } else {
        db.prepare(`
          UPDATE USERS 
          SET firstName = ?, lastName = ?, email = ?, passwordHash = ?, stamp = ?
          WHERE userId = ?
        `).run(firstName.trim(), lastName.trim(), cleanEmail, passwordHash, stamp, userId);
      }
    } else {
      if (role) {
        db.prepare(`
          UPDATE USERS 
          SET firstName = ?, lastName = ?, email = ?, role = ?, stamp = ?
          WHERE userId = ?
        `).run(firstName.trim(), lastName.trim(), cleanEmail, role, stamp, userId);
      } else {
        db.prepare(`
          UPDATE USERS 
          SET firstName = ?, lastName = ?, email = ?, stamp = ?
          WHERE userId = ?
        `).run(firstName.trim(), lastName.trim(), cleanEmail, stamp, userId);
      }
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update user profile.' };
  }
}
