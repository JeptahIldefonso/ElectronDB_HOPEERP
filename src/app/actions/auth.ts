'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cache } from 'react';
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
} from '@/lib/auth-db';

/**
 * Retrieves the current session (from session cookie or Supabase Auth).
 */
export const getCurrentUser = cache(async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const demoRole = cookieStore.get('hope_demo_role')?.value as UserRole | undefined;
  const demoEmail = cookieStore.get('hope_demo_email')?.value;
  const demoName = cookieStore.get('hope_demo_name')?.value;

  if (demoRole && demoEmail) {
    const account = await findAccountByEmail(demoEmail);
    if (account?.isBlocked) {
      return null;
    }
    return {
      id: account?.userId || (account ? `staff-${account.id}` : 'demo-user-id'),
      email: demoEmail,
      role: account ? account.role : demoRole,
      fullName: account ? account.fullName : demoName || 'Staff Member',
      isBlocked: account?.isBlocked,
      rights: account?.rights || [],
    };
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

    // 3. Establish authenticated session cookie
    const cookieStore = await cookies();
    cookieStore.set('hope_demo_role', account.role, {
      path: '/',
      httpOnly: true,
      maxAge: 86400 * 7,
      sameSite: 'lax',
    });
    cookieStore.set('hope_demo_email', account.email, {
      path: '/',
      httpOnly: true,
      maxAge: 86400 * 7,
      sameSite: 'lax',
    });
    cookieStore.set('hope_demo_name', account.fullName, {
      path: '/',
      httpOnly: true,
      maxAge: 86400 * 7,
      sameSite: 'lax',
    });

    redirect('/');
  }

  // Fallback demo accounts if running prototype mode
  const demoFallback: Record<string, { role: UserRole; name: string }> = {
    'superadmin@hope.com': { role: 'Superadmin', name: 'Michael Superadmin' },
    'admin@hope.com': { role: 'Admin', name: 'Lisa Park' },
    'user@hope.com': { role: 'User', name: 'Alex Rivera' },
  };

  if (demoFallback[email]) {
    const info = demoFallback[email];
    const cookieStore = await cookies();
    cookieStore.set('hope_demo_role', info.role, { path: '/', httpOnly: true, maxAge: 86400 * 7, sameSite: 'lax' });
    cookieStore.set('hope_demo_email', email, { path: '/', httpOnly: true, maxAge: 86400 * 7, sameSite: 'lax' });
    cookieStore.set('hope_demo_name', info.name, { path: '/', httpOnly: true, maxAge: 86400 * 7, sameSite: 'lax' });
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

  if (password.length < 4) {
    return { error: 'Password must be at least 4 characters.' };
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

  // 4. Establish authenticated session immediately
  const cookieStore = await cookies();
  cookieStore.set('hope_demo_role', 'User', {
    path: '/',
    httpOnly: true,
    maxAge: 86400 * 7,
    sameSite: 'lax',
  });
  cookieStore.set('hope_demo_email', email, {
    path: '/',
    httpOnly: true,
    maxAge: 86400 * 7,
    sameSite: 'lax',
  });
  cookieStore.set('hope_demo_name', fullName, {
    path: '/',
    httpOnly: true,
    maxAge: 86400 * 7,
    sameSite: 'lax',
  });

  redirect('/');
}

/**
 * Instant demo login for prototype evaluation (§3.1, Fig 4).
 * Demo safety: In production, one-click Superadmin access is disabled to protect database integrity.
 */
export async function demoLoginAction(role: 'Superadmin' | 'Admin' | 'User' | UserRole) {
  if (process.env.VERCEL && role === 'Superadmin') {
    return { error: 'One-click Superadmin sign in is disabled on the live site for security. Please sign in with your credentials or use the User (Staff) demo account.' };
  }

  const cookieStore = await cookies();
  const emailMap: Record<string, { email: string; name: string; role: UserRole }> = {
    Superadmin: { email: 'superadmin@hope.com', name: 'Michael Superadmin', role: 'Superadmin' },
    Admin: { email: 'admin@hope.com', name: 'Lisa Park', role: 'Admin' },
    User: { email: 'user@hope.com', name: 'Alex Rivera', role: 'User' },
    admin: { email: 'admin@hope.com', name: 'Lisa Park', role: 'Admin' },
    sales: { email: 'user@hope.com', name: 'Alex Rivera', role: 'User' },
    cashier: { email: 'user@hope.com', name: 'Alex Rivera', role: 'User' },
  };

  const info = emailMap[role] || emailMap.User;
  cookieStore.set('hope_demo_role', info.role, { path: '/', httpOnly: true, maxAge: 86400 * 7, sameSite: 'lax' });
  cookieStore.set('hope_demo_email', info.email, { path: '/', httpOnly: true, maxAge: 86400 * 7, sameSite: 'lax' });
  cookieStore.set('hope_demo_name', info.name, { path: '/', httpOnly: true, maxAge: 86400 * 7, sameSite: 'lax' });

  redirect('/');
}

/**
 * Destroys session and returns to public landing / login.
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('hope_demo_role');
  cookieStore.delete('hope_demo_email');
  cookieStore.delete('hope_demo_name');

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

    if (data.password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
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
  role?: 'User' | 'Admin';
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
      if (data.newPassword.trim().length < 4) {
        return { success: false, error: 'New password must be at least 4 characters.' };
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
