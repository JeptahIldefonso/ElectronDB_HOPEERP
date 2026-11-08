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
  findAccountById,
  adminResetUserPassword,
  updateUserPassword,
  emailExists,
  insertAccount,
  hashPassword,
  verifyPassword,
  getAllUsers,
  toggleBlockUser,
  updateUserRights,
  adminCreateUser,
  updateUserProfile,
} from '@/lib/auth-db';

/**
 * Retrieves the current session (from session cookie or Supabase Auth).
 */

const SESSION_COOKIE_NAME = 'hope_session';
const SESSION_MAX_AGE = 86400 * 7; // 7 days

interface SessionPayload {
  userId: string;
  email: string;
  sessionVersion?: number;
  exp: number;
}

const FALLBACK_AUTH_SECRET = 'electrondb-hope-erd-production-session-fallback-secret-2026';

function getSessionSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.SESSION_SECRET;
  if (secret && secret.trim().length > 0) {
    return secret.trim();
  }
  return FALLBACK_AUTH_SECRET;
}

function signSession(payload: SessionPayload): string {
  const secret = getSessionSecret();
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

function verifySession(token: string): SessionPayload | null {
  try {
    const secret = getSessionSecret();
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
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionToken) {
      const session = verifySession(sessionToken);
      if (session) {
        try {
          await ensureAuthDb();
          const account = await findAccountByEmail(session.email);
          if (account && !account.isBlocked && account.status === 'Active') {
            const sessionVer = typeof session.sessionVersion === 'number' ? session.sessionVersion : 0;
            const accountVer = typeof account.sessionVersion === 'number' ? account.sessionVersion : 1;
            if (sessionVer < accountVer) {
              return null; // Token invalidated or missing sessionVersion
            }
            return {
              id: account.userId,
              email: account.email,
              role: account.role,
              fullName: account.fullName,
              isBlocked: account.isBlocked,
              rights: account.rights || [],
              mustChangePassword: Boolean(account.mustChangePassword),
              sessionVersion: account.sessionVersion ?? 1,
            };
          }
        } catch (dbErr: any) {
          console.warn('[getCurrentUser] Database lookup warning:', dbErr?.message);
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
  } catch (outerErr: any) {
    if (
      outerErr?.digest === 'DYNAMIC_SERVER_USAGE' ||
      outerErr?.message === 'NEXT_REDIRECT' ||
      outerErr?.digest?.startsWith('NEXT_REDIRECT')
    ) {
      throw outerErr;
    }
    console.error('[getCurrentUser] Unexpected error:', outerErr);
    return null;
  }
});

/**
 * Handles regular email/password login with secure bcrypt hash verification.
 */
export async function loginAction(formData: FormData): Promise<{ error?: string }> {
  try {
    const email = (formData.get('email') as string)?.trim().toLowerCase();
    const password = formData.get('password') as string;

    if (!email || !password) {
      return { error: 'Please enter both email and password.' };
    }

    try {
      await ensureAuthDb();
    } catch (dbErr: any) {
      console.warn('[loginAction] Database init note:', dbErr?.message);
    }

    // 1. Look up account in unified DB
    let account;
    try {
      account = await findAccountByEmail(email);
    } catch (accErr: any) {
      console.error('[loginAction] Account lookup error:', accErr);
      return { error: 'Unable to query user account at this time. Please try again.' };
    }

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
        sessionVersion: account.sessionVersion ?? 1,
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

      if (account.mustChangePassword) {
        redirect('/change-password');
      }

      redirect('/');
    }

    return { error: 'Invalid email or password.' };
  } catch (err: any) {
    if (err?.message === 'NEXT_REDIRECT' || err?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    console.error('[loginAction] Unhandled error:', err);
    const msg = err?.message || '';
    return { error: msg ? `Authentication error: ${msg}` : 'An unexpected authentication error occurred. Please try again.' };
  }
}

/**
 * Handles new account registration.
 * In the Student Guide (§1.2 & §3.1, Fig 3):
 * "New accounts are always created as User; Superadmin and Admin roles can only be assigned by existing administrators."
 */
export async function registerAction(formData: FormData): Promise<{ error?: string }> {
  try {
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

    try {
      await ensureAuthDb();
    } catch (dbErr: any) {
      console.warn('[registerAction] Database init note:', dbErr?.message);
    }

    // 1. Prevent duplicate registrations
    try {
      if (await emailExists(email)) {
        return { error: 'An account with this email address already exists. Please sign in.' };
      }
    } catch (existsErr: any) {
      console.warn('[registerAction] Email check warning:', existsErr?.message);
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
  } catch (err: any) {
    if (err?.message === 'NEXT_REDIRECT' || err?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    console.error('[registerAction] Unhandled registration error:', err);
    return { error: 'An unexpected error occurred during registration. Please try again.' };
  }
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
    if (user.mustChangePassword) {
      return { users: [], error: 'Password change required: You must change your temporary password first.' };
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
  if (user.mustChangePassword) {
    return {
      authorized: false,
      user,
      error: 'Password change required: You must change your temporary password before performing any actions.',
    };
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
 * Admin-initiated password reset:
 * - Checks caller role from database (not just cookie).
 * - Admin can reset only role 'User'.
 * - Superadmin can reset 'Admin' or 'Superadmin'.
 * - Nobody can reset their own account.
 * - Generates 12+ char temporary password with crypto.randomBytes, hashes with bcrypt (cost 10).
 * - Sets mustChangePassword = 1 and increments sessionVersion to invalidate existing sessions.
 * - Returns tempPassword to caller for one-time display in modal.
 */
export async function adminResetPasswordAction(targetUserId: string): Promise<{
  success: boolean;
  tempPassword?: string;
  error?: string;
}> {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return { success: false, error: 'Unauthorized: Please sign in.' };
    }

    // Verify caller role directly against database
    const caller = await findAccountById(sessionUser.id);
    if (!caller || (caller.role !== 'Superadmin' && caller.role !== 'Admin')) {
      return { success: false, error: 'Access denied: Only administrators can reset passwords.' };
    }

    if (caller.userId === targetUserId) {
      return { success: false, error: 'You cannot reset your own password. Please use Change Password instead.' };
    }

    const targetUser = await findAccountById(targetUserId);
    if (!targetUser) {
      return { success: false, error: 'Target user account not found.' };
    }

    // Admin may reset only role User; only Superadmin may reset Admin or Superadmin
    if (caller.role === 'Admin' && targetUser.role !== 'User') {
      return { success: false, error: 'Administrators may only reset passwords for User accounts.' };
    }

    // Generate 12+ character random temporary password
    const rawRandom = crypto.randomBytes(9).toString('base64url');
    const tempPassword = `Tmp-${rawRandom}`;
    const tempPasswordHash = await hashPassword(tempPassword);

    const res = await adminResetUserPassword(
      targetUserId,
      tempPasswordHash,
      caller.fullName || caller.role
    );

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to reset password.' };
    }

    revalidatePath('/users');
    return { success: true, tempPassword };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unexpected error during password reset.' };
  }
}

/**
 * Self-service / forced change password for signed-in users:
 * - Validates current password against database hash.
 * - Requires new password >= 8 chars and different from old password.
 * - Clears mustChangePassword = 0, increments sessionVersion to invalidate old tokens.
 * - Re-issues session cookie with the new sessionVersion.
 */
export async function changePasswordAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return { success: false, error: 'Please sign in to change your password.' };
    }

    const currentPassword = ((formData.get('currentPassword') as string) || '').trim();
    const newPassword = ((formData.get('newPassword') as string) || '').trim();
    const confirmPassword = ((formData.get('confirmPassword') as string) || '').trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return { success: false, error: 'All fields are required.' };
    }

    if (newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters long.' };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: 'New password and confirm password do not match.' };
    }

    // Fetch user with passwordHash directly from database
    const account = await findAccountById(sessionUser.id);
    if (!account) {
      return { success: false, error: 'User account not found.' };
    }

    // Verify current password
    const isCurrentValid = await verifyPassword(currentPassword, account.passwordHash);
    if (!isCurrentValid) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    // New password must be different from current password
    if (currentPassword === newPassword) {
      return { success: false, error: 'New password must be different from the old password.' };
    }

    const newPasswordHash = await hashPassword(newPassword);
    const updateRes = await updateUserPassword(
      account.userId,
      newPasswordHash,
      account.fullName || account.email
    );

    if (!updateRes.success) {
      return { success: false, error: updateRes.error || 'Failed to update password.' };
    }

    // Fetch fresh sessionVersion
    const updatedAccount = await findAccountById(account.userId);
    const newVersion = updatedAccount?.sessionVersion ?? ((account.sessionVersion ?? 1) + 1);

    // Re-issue session cookie with new sessionVersion
    const sessionToken = signSession({
      userId: account.userId,
      email: account.email,
      sessionVersion: newVersion,
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
  } catch (err: any) {
    if (err?.message === 'NEXT_REDIRECT' || err?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    return { success: false, error: err?.message || 'Failed to change password.' };
  }
}
