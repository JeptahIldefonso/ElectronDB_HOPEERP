'use client';

import React, { useState, useTransition } from 'react';
import { X, Loader2, UserPlus } from 'lucide-react';
import type { UserRole } from '@/lib/types';
import { createUserAction } from '@/app/actions/auth';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserRole: UserRole;
}

export function AddUserModal({
  isOpen,
  onClose,
  onSuccess,
  currentUserRole,
}: AddUserModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'User' | 'Admin'>('User');
  const [password, setPassword] = useState('demo');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError('First name, last name, email, and password are required.');
      return;
    }

    startTransition(async () => {
      const res = await createUserAction({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        role,
        password: password.trim(),
      });

      if (res.error) {
        setError(res.error);
      } else {
        onSuccess();
        onClose();
        // Reset form
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('demo');
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
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Add New User
              </h2>
              <p className="text-xs text-slate-500">
                Create a new staff or administrator account.
              </p>
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
                placeholder="e.g. Alex"
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
                placeholder="e.g. Rivera"
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
              placeholder="user@hope.com"
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
            <p className="text-[10.5px] text-slate-500 mt-1">
              Users are automatically granted baseline operational rights. You can refine them anytime in Rights dialog.
            </p>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="Initial account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              <span>Add User</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
