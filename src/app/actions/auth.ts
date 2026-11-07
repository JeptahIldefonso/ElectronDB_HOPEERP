'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import crypto from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import type { UserRole, UserSession, UserAccount } from '@/lib/types';
import {
  ensureAuthDb,
  findAccountByEmail,
  emailExists,
  insertAccount,
  hashPassword,
  verifyPassword,
  getAllUsers,
  toggleBlockUser,
  updateUserRights,
  adminCreateUser,
  updateUserProfile,
  resetUserPassword,
} from '@/lib/auth-db';

/**
 * Retrieves the current session (from session cookie or Supabase Auth).
 */

const SESSION_COOKIE_NAME = 'hope_session';
const SESSION_MAX_AGE = 86400 * 7; // 7 days

interface SessionPayload {
  userId: string;
  email: string;
  exp: number;
}

function getSessionSecret(): string | null {
  const secret = process.env.AUTH_SECRET || process.env.SESSION_SECRET;
  if (!secret || secret.trim().length === 0) {
    return null;
  }
  return secret.trim();
}

function signSession(payload: SessionPayload): string {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error('Authentication failure: AUTH_SECRET or SESSION_SECRET must be configured in environment variables.');
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifySession(token: string): SessionPayload | null {
  try {
    const secret = getSessionSecret();
    if (!secret) return null; // Fail-closed: cannot verify without configured secret

    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encodedPayload, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.userId || !payload.exp || typeof payload.exp !== 'number' || Date.now() > payload.exp) {
      return null; // Expired or malformed
    }
    return payload;
  } catch {
    return null;
  }
}

export const getCurrentUser = cache(async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    const session = verifySession(sessionToken);
    if (session) {
      await ensureAuthDb();
      const account = await findAccountByEmail(session.email);
      if (account && !account.isBlocked && account.status === 'Active') {
        return {
          id: account.userId,
          email: account.email,
          role: account.role,
          fullName: account.fullName,
          isBlocked: account.isBlocked,
          rights: account.rights || [],
        };
      }
    }
    return null;
  }

  // Fallback to Supabase Auth if session cookies are absent
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    const role = (user.app_metadata?.role as UserRole) || 'Admin';
    const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

    return {
      id: user.id,
      email: user.email || '',
      role,
      fullName,
      rights: [],
    };
  } catch {
    return null;
  }
});

/**
 * Handles regular email/password login with secure bcrypt hash verification.
 */
export async function loginAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Please enter both email and password.' };
  }

  await ensureAuthDb();

  // 1. Look up account in unified DB
  const account = await findAccountByEmail(email);

  if (account) {
    // Check if user is blocked (§3.8)
    if (account.isBlocked) {
      return { error: 'Your account has been blocked by an administrator.' };
    }

    // 2. Verify password against bcrypt hash
    const isValid = await verifyPassword(password, account.passwordHash);
    if (!isValid) {
      return { error: 'Invalid email or password.' };
    }

    // 3. Establish cryptographically signed session cookie
    const sessionToken = signSession({
      userId: account.userId,
      email: account.email,
      exp: Date.now() + SESSION_MAX_AGE * 1000,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE,
      sameSite: 'lax',
    });

    redirect('/');
  }

  return { error: 'Invalid email or password.' };
}

/**
 * Handles new account registration.
 * In the Student Guide (§1.2 & §3.1, Fig 3):
 * "New accounts are always created as User; Superadmin and Admin roles can only be assigned by existing administrators."
 */
export async function registerAction(formData: FormData) {
  const firstName = (formData.get('firstName') as string)?.trim() || '';
  const lastName = (formData.get('lastName') as string)?.trim() || '';
  const fullNameRaw = (formData.get('fullName') as string)?.trim();
  const fullName = fullNameRaw || `${firstName} ${lastName}`.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!fullName || !email || !password) {
    return { error: 'Please provide full name, email address, and password.' };
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  await ensureAuthDb();

  // 1. Prevent duplicate registrations
  if (await emailExists(email)) {
    return { error: 'An account with this email address already exists. Please sign in.' };
  }

  // 2. Hash password with bcrypt salt
  const passwordHash = await hashPassword(password);

  // 3. New registrations strictly get role 'User'
  try {
    await insertAccount(email, passwordHash, fullName, 'User');
  } catch (err: any) {
    return { error: err?.message || 'Failed to save account to database.' };
  }

  // 4. Establish cryptographically signed session cookie
  const sessionToken = signSession({
    userId: `usr-${Date.now()}`,
    email: email.toLowerCase(),
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    sameSite: 'lax',
  });

  redirect('/');
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore signout errors on client
  }

  redirect('/');
}

// ========================================================================
// USER MANAGEMENT ACTIONS (§3.8)
// ========================================================================

export async function fetchUsersAction(): Promise<{ users: UserAccount[]; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'Superadmin' && user.role !== 'Admin' && user.role !== 'admin')) {
      return { users: [], error: 'Access denied: Administrator privileges required.' };
    }

    const users = await getAllUsers(user.role);
    return { users };
  } catch (err: any) {
    return { users: [], error: err?.message || 'Failed to fetch users.' };
  }
}

/**
 * Validates whether the currently authenticated user is authorized for a specific canonical right.
 * Superadmin and Admin have universal authority across all modules.
 * Users are strictly checked against their granted rights in USERRIGHTS.
 */
export async function checkUserPermission(
  rightCode: string
): Promise<{ authorized: boolean; user: UserSession | null; error?: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { authorized: false, user: null, error: 'Unauthorized: Please sign in.' };
  }
  const role = user.role.toLowerCase();
  if (role === 'superadmin' || role === 'admin') {
    return { authorized: true, user };
  }
  if (user.rights && user.rights.includes(rightCode)) {
    return { authorized: true, user };
  }
  return {
    authorized: false,
    user,
    error: `Access Denied: Missing required permission '${rightCode}'.`,
  };
}

export async function toggleBlockUserAction(targetUserId: string): Promise<{ success: boolean; isBlocked?: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'Superadmin' && currentUser.role !== 'Admin' && currentUser.role !== 'admin')) {
      return { success: false, error: 'Access denied: Only administrators can block or unblock users.' };
    }

    const res = await toggleBlockUser(targetUserId, currentUser.fullName || 'Admin');
    revalidatePath('/users');
    return res;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to toggle block status.' };
  }
}

export async function updateUserRightsAction(targetUserId: string, rightCodes: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'Superadmin' && currentUser.role !== 'Admin' && currentUser.role !== 'admin')) {
      return { success: false, error: 'Access denied: Only administrators can update user rights.' };
    }

    const res = await updateUserRights(targetUserId, rightCodes, currentUser.fullName || 'Admin');
    revalidatePath('/users');
    return res;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update user rights.' };
  }
}

export async function createUserAction(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'User' | 'Admin';
}): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'Superadmin' && currentUser.role !== 'Admin' && currentUser.role !== 'admin')) {
      return { success: false, error: 'Access denied: Only administrators can create users.' };
    }

    if (!data.firstName?.trim() || !data.lastName?.trim() || !data.email?.trim() || !data.password?.trim()) {
      return { success: false, error: 'All fields (First Name, Last Name, Email, Password) are required.' };
    }

    if (data.password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters.' };
    }

    const passwordHash = await hashPassword(data.password);
    const res = await adminCreateUser(
      data.firstName,
      data.lastName,
      data.email,
      passwordHash,
      data.role,
      currentUser.fullName || 'Admin'
    );

    if (res.success) {
      revalidatePath('/users');
    }
    return res;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create user.' };
  }
}

export async function updateUserProfileAction(data: {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: UserRole;
  newPassword?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || (currentUser.role !== 'Superadmin' && currentUser.role !== 'Admin' && currentUser.role !== 'admin')) {
      return { success: false, error: 'Access denied: Only administrators can update users.' };
    }

    if (!data.firstName?.trim() || !data.lastName?.trim() || !data.email?.trim()) {
      return { success: false, error: 'First Name, Last Name, and Email are required.' };
    }

    let passwordHash: string | undefined;
    if (data.newPassword && data.newPassword.trim()) {
      if (data.newPassword.trim().length < 8) {
        return { success: false, error: 'New password must be at least 8 characters.' };
      }
      passwordHash = await hashPassword(data.newPassword.trim());
    }

    const res = await updateUserProfile(
      data.userId,
      data.firstName,
      data.lastName,
      data.email,
      data.role,
      passwordHash,
      currentUser.fullName || 'Admin'
    );

    if (res.success) {
      revalidatePath('/users');
    }
    return res;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update user profile.' };
  }
}

/**
 * Verifies email address for self-service password reset.
 */
export async function verifyEmailForResetAction(email: string): Promise<{
  success: boolean;
  fullName?: string;
  role?: string;
  error?: string;
}> {
  const cleanEmail = email?.trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, error: 'Please enter your email address.' };
  }

  await ensureAuthDb();
  const account = await findAccountByEmail(cleanEmail);
  if (!account) {
    return { success: false, error: 'No registered account found with this email address.' };
  }

  if (account.isBlocked || account.status !== 'Active') {
    return { success: false, error: 'This account has been deactivated or blocked by an administrator.' };
  }

  return {
    success: true,
    fullName: account.fullName,
    role: account.role,
  };
}

/**
 * Resets the password directly for verified accounts and logs in immediately.
 */
export async function resetPasswordDirectAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const newPassword = String(formData.get('newPassword') ?? '').trim();
  const confirmPassword = String(formData.get('confirmPassword') ?? '').trim();

  if (!email || !newPassword || !confirmPassword) {
    return { success: false, error: 'Email, new password, and confirmation are required.' };
  }

  if (newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters.' };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: 'Passwords do not match.' };
  }

  await ensureAuthDb();
  const account = await findAccountByEmail(email);
  if (!account) {
    return { success: false, error: 'No registered account found with this email address.' };
  }

  if (account.isBlocked || account.status !== 'Active') {
    return { success: false, error: 'This account has been deactivated or blocked by an administrator.' };
  }

  const passwordHash = await hashPassword(newPassword);
  const result = await resetUserPassword(email, passwordHash);

  if (!result.success || !result.user) {
    return { success: false, error: result.error || 'Failed to update password.' };
  }

  // Establish authenticated session immediately
  const sessionToken = signSession({
    userId: result.user.userId,
    email: result.user.email,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    sameSite: 'lax',
  });

  redirect('/');
}

/**
 * Backward compatibility alias for password recovery.
 */
export const resetSuperadminPasswordAction = resetPasswordDirectAction;
