'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { TopographicCanvas } from '@/components/ambient/TopographicCanvas';
import { verifyEmailForResetAction, resetPasswordDirectAction } from '@/app/actions/auth';

export default function ResetPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [verifiedUser, setVerifiedUser] = useState<{ fullName?: string; role?: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    startTransition(async () => {
      try {
        const result = await verifyEmailForResetAction(cleanEmail);
        if (!result.success) {
          setError(result.error || 'Failed to verify email.');
          return;
        }

        setVerifiedUser({
          fullName: result.fullName,
          role: result.role,
        });
        setStep(2);
      } catch (err: any) {
        setError(err?.message || 'Verification failed. Please try again.');
      }
    });
  };

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

    const formData = new FormData();
    formData.append('email', email);
    formData.append('newPassword', newPassword);
    formData.append('confirmPassword', confirmPassword);

    startTransition(async () => {
      try {
        const result = await resetPasswordDirectAction(formData);
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
              {step === 1
                ? "Enter your email address and we'll send you a secure link to reset it."
                : 'A reset link has been dispatched to your email. Proceed below to reset your password right away.'}
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

          {/* STEP 1: Enter Email & Send Reset Link */}
          {step === 1 && (
            <form onSubmit={handleSendLink} className="space-y-4">
              <div>
                <label
                  htmlFor="reset-email"
                  className="block font-mono text-[11px] uppercase tracking-[0.14em] font-medium text-[#41555f] dark:text-text-muted mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ildefonsojeptahashleyr@gmail.com"
                  className="w-full h-9 px-3 bg-white dark:bg-surface-2 border border-black/15 dark:border-border focus:border-[#041a24] dark:focus:border-text focus:ring-1 focus:ring-[#041a24]/20 rounded-[3px] text-xs text-[#041a24] dark:text-text placeholder-[#41555f]/60 dark:placeholder-text-muted/60 outline-none transition-all font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full h-9 bg-[#041a24] dark:bg-primary-bg hover:bg-[#1c313b] dark:hover:bg-primary-bg/90 active:bg-black dark:active:bg-primary-bg/80 disabled:opacity-50 text-white dark:!text-primary-fg font-medium text-xs rounded-[3px] shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#041a24] dark:border-primary-bg"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white dark:!text-primary-fg" />
                    <span>Sending Reset Link...</span>
                  </span>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Link Dispatched Banner + Reset Password Right Away */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Notice Banner matching Figure 5 */}
              <div className="p-4 rounded-[3px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 space-y-1.5">
                <div className="flex items-center gap-2 font-medium text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Reset link sent!</span>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
                  A secure password reset link has been dispatched to <strong>{email}</strong>.
                  You can also proceed to reset your password right away below:
                </p>
                {verifiedUser?.fullName && (
                  <div className="pt-1 text-[10px] font-mono uppercase tracking-wider text-emerald-800/80 dark:text-emerald-300/80">
                    Account: {verifiedUser.fullName} &bull; {verifiedUser.role}
                  </div>
                )}
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* New Password */}
                <div>
                  <label
                    htmlFor="new-password"
                    className="block font-mono text-[11px] uppercase tracking-[0.14em] font-medium text-[#41555f] dark:text-text-muted mb-1.5"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      name="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full h-9 pl-3 pr-9 bg-white dark:bg-surface-2 border border-black/15 dark:border-border focus:border-[#041a24] dark:focus:border-text focus:ring-1 focus:ring-[#041a24]/20 rounded-[3px] text-xs text-[#041a24] dark:text-text placeholder-[#41555f]/60 dark:placeholder-text-muted/60 outline-none transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-black/40 dark:text-text-muted hover:text-[#041a24] dark:hover:text-text p-1 rounded transition-colors"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block font-mono text-[11px] uppercase tracking-[0.14em] font-medium text-[#41555f] dark:text-text-muted mb-1.5"
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
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="w-full h-9 pl-3 pr-9 bg-white dark:bg-surface-2 border border-black/15 dark:border-border focus:border-[#041a24] dark:focus:border-text focus:ring-1 focus:ring-[#041a24]/20 rounded-[3px] text-xs text-[#041a24] dark:text-text placeholder-[#41555f]/60 dark:placeholder-text-muted/60 outline-none transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-black/40 dark:text-text-muted hover:text-[#041a24] dark:hover:text-text p-1 rounded transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError(null);
                    }}
                    className="text-xs text-[#41555f] dark:text-text-muted hover:underline cursor-pointer"
                  >
                    Change email address
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-9 bg-[#041a24] dark:bg-primary-bg hover:bg-[#1c313b] dark:hover:bg-primary-bg/90 active:bg-black dark:active:bg-primary-bg/80 disabled:opacity-50 text-white dark:!text-primary-fg font-medium text-xs rounded-[3px] shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#041a24] dark:border-primary-bg"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white dark:!text-primary-fg" />
                      <span>Updating Password & Signing In...</span>
                    </span>
                  ) : (
                    <span>Reset Password & Sign In</span>
                  )}
                </button>
              </form>
            </div>
          )}

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
        <span className="font-mono text-[10px]">Self-Service Password Reset</span>
      </footer>
    </div>
  );
}
