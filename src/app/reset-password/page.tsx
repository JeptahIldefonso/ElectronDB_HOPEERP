'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { TopographicCanvas } from '@/components/ambient/TopographicCanvas';
import { verifyEmailForResetAction } from '@/app/actions/auth';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
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
        if (result && !result.success && result.error) {
          setError(result.error);
          return;
        }
        setSubmitted(true);
      } catch {
        // Fallback: never leave user stranded with unhandled error
        setSubmitted(true);
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
              {submitted
                ? 'Check your inbox to proceed with resetting your password.'
                : "Enter your email address and we'll send you a secure link to reset it."}
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

          {submitted ? (
            /* Figure 5 Confirmation Screen */
            <div className="space-y-4">
              <div className="p-4 rounded-[3px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 space-y-2">
                <div className="flex items-center gap-2 font-medium text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Reset link sent!</span>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
                  A secure password reset link has been dispatched to <strong>{email}</strong>. Please check your inbox and follow the instructions to reset your credentials.
                </p>
                <div className="pt-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Sign In
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Input Form */
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
        <span className="font-mono text-[10px]">Security verified &bull; Password Recovery</span>
      </footer>
    </div>
  );
}
