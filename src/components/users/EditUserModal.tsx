'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { X, Loader2, UserCheck, Shield } from 'lucide-react';
import type { UserAccount, UserRole } from '@/lib/types';
import { updateUserProfileAction } from '@/app/actions/auth';

interface EditUserModalProps {
  user: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserRole: UserRole;
}

export function EditUserModal({
  user,
  isOpen,
  onClose,
  onSuccess,
  currentUserRole,
}: EditUserModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'User' | 'Admin'>('User');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isSuperadmin = currentUserRole === 'Superadmin';

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setRole(user.role === 'Admin' ? 'Admin' : 'User');
      setNewPassword('');
      setError(null);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('First name, last name, and email are required.');
      return;
    }

    startTransition(async () => {
      const res = await updateUserProfileAction({
        userId: user.userId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        role: role,
        newPassword: newPassword.trim() ? newPassword.trim() : undefined,
      });

      if (res.error) {
        setError(res.error);
      } else {
        onSuccess();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#041a24]/10 dark:bg-slate-800 text-[#041a24] dark:text-slate-200 flex items-center justify-center font-bold text-xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Edit User — {user.fullName}
              </h2>
              <p className="text-xs text-slate-500 font-mono">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              System Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'User' | 'Admin')}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none transition-all cursor-pointer"
            >
              <option value="User">User (Standard Staff)</option>
              <option value="Admin">Admin (Manager)</option>
            </select>
            {!isSuperadmin && (
              <p className="text-[10.5px] text-slate-500 mt-1">
                Admins may only assign User or Admin roles. Superadmin promotion is restricted.
              </p>
            )}
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Reset Password (Optional)
            </label>
            <input
              type="password"
              placeholder="Leave blank to preserve current password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none transition-all"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-[#001A2B] hover:bg-[#00263E] text-white shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
