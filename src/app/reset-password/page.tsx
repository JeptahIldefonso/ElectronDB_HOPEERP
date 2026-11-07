'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react';
import { TopographicCanvas } from '@/components/ambient/TopographicCanvas';
import { resetSuperadminPasswordAction } from '@/app/actions/auth';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRecoveryKey, setShowRecoveryKey] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = await resetSuperadminPasswordAction(formData);
        if (result?.error) {
          setError(result.error);
        }
      } catch (err: any) {
        // Next.js redirect() throws a NEXT_REDIRECT digest error when redirecting
        if (err?.digest?.startsWith('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT') {
          return;
        }
        setError(err?.message || 'Failed to reset password.');
      }
    });
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#F4F4F0] dark:bg-canvas-bg text-[#041a24] dark:text-text selection:bg-[#041a24] dark:selection:bg-surface-3 selection:text-white dark:selection:text-text overflow-x-hidden font-sans transition-colors duration-150">
      <TopographicCanvas />

      {/* Brand Header */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <Link
          href="/login"
          className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#41555f] dark:text-text-muted hover:text-[#041a25] dark:hover:text-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>

        {/* Brand Mark */}
        <div className="flex items-center gap-2.5">
          <svg
            viewBox="0 0 32 32"
            className="w-8 h-8 text-[#041a25] dark:text-text shrink-0"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="ElectronDB Monogram"
            role="img"
          >
            <g transform="rotate(-28 16 16)">
              <ellipse
                cx="16"
                cy="16"
                rx="13.5"
                ry="4.5"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeDasharray="2.5 2"
                className="opacity-75"
              />
              <circle cx="29.5" cy="16" r="2" fill="currentColor" />
            </g>
            <text
              x="16"
              y="22"
              textAnchor="middle"
              fontFamily="Georgia, 'Times New Roman', serif"
              fontSize="18"
              fontWeight="400"
              fill="currentColor"
            >
              e
            </text>
          </svg>
          <div className="flex flex-col">
            <span className="font-editorial text-xl leading-none tracking-tight font-normal text-[#041a25] dark:text-text">
              ElectronDB
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#41555f] dark:text-text-muted leading-tight mt-0.5">
              HopeERD System
            </span>
          </div>
        </div>
      </header>

      {/* Main Form Section */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white/95 dark:bg-surface-1/95 backdrop-blur-xs border border-black/10 dark:border-border rounded-[4px] shadow-sm p-6 sm:p-8 space-y-5">
          {/* Header Title */}
          <div className="border-b border-black/5 dark:border-border pb-4">
            <div className="flex items-center gap-2 text-[#041a24] dark:text-text mb-1">
              <KeyRound className="w-5 h-5 text-[#041a24] dark:text-primary-bg" />
              <h1 className="font-editorial text-2xl font-normal">
                Reset Password
              </h1>
            </div>
            <p className="text-xs text-[#41555f] dark:text-text-muted">
              Superadmin recovery requires the server-configured recovery key. Staff accounts are managed by an administrator.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-[3px] text-xs text-red-700 dark:text-red-400 font-sans"
            >
              {error}
            </div>
          )}

          <div className="flex items-start gap-2 rounded-[3px] border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Emergency recovery is limited to the active Superadmin account. Keep the recovery key private.</p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label
                htmlFor="reset-email"
                className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#41555f] dark:text-text-muted"
              >
                Superadmin Email
              </label>
              <input
                id="reset-email"
                name="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Superadmin account email"
                className="w-full rounded-[3px] border border-black/15 bg-white px-3 text-xs text-[#041a24] outline-none transition-all focus:border-[#041a24] focus:ring-1 focus:ring-[#041a24]/20 dark:border-border dark:bg-surface-2 dark:text-text"
              />
            </div>

            <div>
              <label
                htmlFor="recovery-key"
                className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#41555f] dark:text-text-muted"
              >
                Recovery Key
              </label>
              <div className="relative">
                <input
                  id="recovery-key"
                  name="recoveryKey"
                  type={showRecoveryKey ? 'text' : 'password'}
                  required
                  autoComplete="off"
                  value={recoveryKey}
                  onChange={(e) => setRecoveryKey(e.target.value)}
                  className="h-9 w-full rounded-[3px] border border-black/15 bg-white pl-3 pr-9 text-xs text-[#041a24] outline-none transition-all focus:border-[#041a24] focus:ring-1 focus:ring-[#041a24]/20 dark:border-border dark:bg-surface-2 dark:text-text"
                />
                <button
                  type="button"
                  onClick={() => setShowRecoveryKey(!showRecoveryKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-black/40 transition-colors hover:text-[#041a24] dark:text-text-muted dark:hover:text-text"
                  aria-label={showRecoveryKey ? 'Hide recovery key' : 'Show recovery key'}
                >
                  {showRecoveryKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#41555f] dark:text-text-muted"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="h-9 w-full rounded-[3px] border border-black/15 bg-white pl-3 pr-9 text-xs text-[#041a24] outline-none transition-all focus:border-[#041a24] focus:ring-1 focus:ring-[#041a24]/20 dark:border-border dark:bg-surface-2 dark:text-text"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-black/40 transition-colors hover:text-[#041a24] dark:text-text-muted dark:hover:text-text"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#41555f] dark:text-text-muted"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="h-9 w-full rounded-[3px] border border-black/15 bg-white pl-3 pr-9 text-xs text-[#041a24] outline-none transition-all focus:border-[#041a24] focus:ring-1 focus:ring-[#041a24]/20 dark:border-border dark:bg-surface-2 dark:text-text"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-black/40 transition-colors hover:text-[#041a24] dark:text-text-muted dark:hover:text-text"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-[3px] border border-[#041a24] bg-[#041a24] text-xs font-medium text-white transition-colors hover:bg-[#1c313b] active:bg-black disabled:opacity-50 dark:border-primary-bg dark:bg-primary-bg dark:text-primary-fg dark:hover:bg-primary-bg/90"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Updating Password & Signing In...</span>
                </span>
              ) : (
                <span>Reset Password & Sign In</span>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-black/5 dark:border-border">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-[#41555f] dark:text-text-muted hover:text-[#041a24] dark:hover:text-text transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#41555f]/80 dark:text-text-muted/80 gap-2 border-t border-black/5 dark:border-border">
        <span>&copy; {new Date().getFullYear()} ElectronDB ERP</span>
        <span className="font-mono text-[10px]">Superadmin recovery &bull; Server-verified key</span>
      </footer>
    </div>
  );
}
