'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Loader2, ArrowLeft, KeyRound, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { changePasswordAction } from '@/app/actions/auth';
import { TopographicCanvas } from '@/components/ambient/TopographicCanvas';

interface ChangePasswordFormProps {
  email: string;
  fullName: string;
  mustChangePassword: boolean;
}

export function ChangePasswordForm({
  email,
  fullName,
  mustChangePassword,
}: ChangePasswordFormProps) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    const currentPassword = (formData.get('currentPassword') as string) || '';
    const newPassword = (formData.get('newPassword') as string) || '';
    const confirmPassword = (formData.get('confirmPassword') as string) || '';

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from your current or temporary password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    startTransition(async () => {
      const res = await changePasswordAction(formData);
      if (res?.error) {
        setError(res.error);
      }
    });
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#F4F4F0] text-[#041a24] selection:bg-[#041a24] selection:text-white overflow-x-hidden font-sans transition-colors duration-150">
      <TopographicCanvas />

      {/* Brand Header */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        {!mustChangePassword ? (
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#41555e] hover:text-[#041a25] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
        ) : (
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-800">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Password Change Required</span>
          </div>
        )}

        {/* Artistic ElectronDB Brand Mark & Wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 shrink-0 rounded-md overflow-hidden border border-black/10 dark:border-white/10 shadow-2xs bg-white">
            <Image
              src="/logo.jpg"
              alt="ElectronDB Logo"
              fill
              sizes="32px"
              className="object-cover"
              priority
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-editorial italic text-xl font-normal tracking-tight text-[#041a25]">
              ElectronDB
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#41555f]/80">
              HOPE ERP System
            </span>
          </div>
        </div>
      </header>

      {/* Main Form Card */}
      <main className="relative z-10 w-full max-w-md mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="bg-[#FAF9F5] border border-black/10 rounded-lg p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-1.5">
            <div className="w-9 h-9 rounded bg-[#041a24]/5 border border-[#041a24]/10 flex items-center justify-center text-[#041a24] mb-3">
              <KeyRound className="w-4 h-4" />
            </div>
            <h1 className="font-editorial text-2xl font-normal tracking-tight text-[#041a25]">
              Change Password
            </h1>
            <p className="font-sans text-xs text-[#41555f]">
              {mustChangePassword
                ? 'Your account has a temporary password. Set a permanent password to continue.'
                : `Signed in as ${fullName} (${email}). Update your account password below.`}
            </p>
          </div>

          {mustChangePassword && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-[4px] text-xs text-amber-900 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Temporary password detected:</span> For your security, you must set a new password of at least 8 characters before accessing the ERP modules.
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="p-3 bg-red-500/10 border border-red-500/20 rounded-[4px] text-xs text-red-700 font-sans"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password / Temporary Password */}
            <div>
              <label
                htmlFor="currentPassword"
                className="block font-mono text-[11px] uppercase tracking-[0.14em] font-medium text-[#41555f] mb-1.5"
              >
                {mustChangePassword ? 'Temporary Password' : 'Current Password'}
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  required
                  placeholder={mustChangePassword ? 'Enter assigned temporary password' : 'Enter your current password'}
                  className="w-full h-9 pl-3 pr-9 bg-white border border-black/15 focus:border-[#041a24] focus:ring-1 focus:ring-[#041a24]/20 rounded-[3px] text-xs text-[#041a24] placeholder-[#41555f]/60 outline-none transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-black/40 hover:text-[#041a24] p-1 rounded transition-colors"
                  aria-label={showCurrent ? 'Hide password' : 'Show password'}
                >
                  {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label
                htmlFor="newPassword"
                className="block font-mono text-[11px] uppercase tracking-[0.14em] font-medium text-[#41555f] mb-1.5"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showNew ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  className="w-full h-9 pl-3 pr-9 bg-white border border-black/15 focus:border-[#041a24] focus:ring-1 focus:ring-[#041a24]/20 rounded-[3px] text-xs text-[#041a24] placeholder-[#41555f]/60 outline-none transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-black/40 hover:text-[#041a24] p-1 rounded transition-colors"
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                >
                  {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block font-mono text-[11px] uppercase tracking-[0.14em] font-medium text-[#41555f] mb-1.5"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Re-enter your new password"
                  className="w-full h-9 pl-3 pr-9 bg-white border border-black/15 focus:border-[#041a24] focus:ring-1 focus:ring-[#041a24]/20 rounded-[3px] text-xs text-[#041a24] placeholder-[#41555f]/60 outline-none transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-black/40 hover:text-[#041a24] p-1 rounded transition-colors"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full h-9 bg-[#041a24] hover:bg-[#1c313b] active:bg-black disabled:opacity-50 text-white font-medium text-xs rounded-[3px] shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#041a24]"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Updating Password & Securing Account...</span>
                </span>
              ) : (
                <span>Change Password</span>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#41555f]/80 gap-2 border-t border-black/5">
        <div className="font-editorial text-sm text-[#041a24]">
          Hope, Inc. ERP
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-[#41555f]/60">
          ElectronDB Cryptographic Session Verification
        </div>
      </footer>
    </div>
  );
}
