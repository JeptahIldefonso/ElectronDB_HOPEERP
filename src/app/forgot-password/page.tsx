'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F0] dark:bg-[#0C121E] text-[#041a24] dark:text-[#E2E8F0] font-sans flex flex-col items-center justify-center p-4">
      {/* Container (Matching Figure 5) */}
      <div className="w-full max-w-md bg-white dark:bg-[#111A2E] border border-black/10 dark:border-white/10 rounded-[6px] shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
          <div>
            <h1 className="font-editorial text-2xl font-normal text-[#041a24] dark:text-white">
              Reset password
            </h1>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
              We&apos;ll send you a secure link to reset it
            </p>
          </div>
          <Link href="/login" className="text-xs text-[#64748B] hover:text-[#041a24] dark:hover:text-white">
            &times;
          </Link>
        </div>

        {submitted ? (
          <div className="p-4 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 space-y-2">
            <div className="flex items-center gap-2 font-medium text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Reset link sent!
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
              A secure password reset link has been dispatched to <strong>{email}</strong>. Check your inbox to proceed.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="text-xs font-semibold underline hover:no-underline"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jcesperanza@neu.edu.ph"
                className="w-full h-10 px-3 text-xs rounded border border-black/15 dark:border-white/15 bg-white dark:bg-black/20 text-[#041a24] dark:text-white focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <button
              type="submit"
              className="w-full h-10 rounded bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              Send Reset Link
            </button>
          </form>
        )}

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-[#64748B] dark:text-[#94A3B8] hover:text-[#041a24] dark:hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Remember your password? Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
