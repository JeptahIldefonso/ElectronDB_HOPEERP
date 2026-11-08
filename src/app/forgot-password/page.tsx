import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, KeyRound, ShieldAlert } from 'lucide-react';
import { TopographicCanvas } from '@/components/ambient/TopographicCanvas';

export const metadata = {
  title: 'Forgot Password | ElectronDB ERP',
  description: 'Password recovery information for ElectronDB ERP.',
};

export default function ForgotPasswordPage() {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#F4F4F0] text-[#041a24] selection:bg-[#041a24] selection:text-white overflow-x-hidden font-sans transition-colors duration-150">
      <TopographicCanvas />

      {/* Brand Header */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <Link
          href="/login"
          className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#41555e] hover:text-[#041a25] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>

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

      {/* Main Notice Card */}
      <main className="relative z-10 w-full max-w-md mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="bg-[#FAF9F5] border border-black/10 rounded-lg p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded bg-[#041a24]/5 border border-[#041a24]/10 flex items-center justify-center text-[#041a24] mb-3">
              <KeyRound className="w-4 h-4" />
            </div>
            <h1 className="font-editorial text-2xl font-normal tracking-tight text-[#041a25]">
              Forgot Password
            </h1>
            <p className="font-sans text-xs text-[#41555f] leading-relaxed">
              Staff and operational user accounts are securely managed by your organization&apos;s administrators.
            </p>
          </div>

          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-[4px] text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[11px] uppercase tracking-wider text-amber-800 font-mono mb-1">
                Notice
              </p>
              <p>
                Contact your administrator to reset your password. An administrator can issue a secure temporary password from the User Management console.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className="w-full h-9 bg-[#041a24] hover:bg-[#1c313b] active:bg-black text-white font-medium text-xs rounded-[3px] shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#041a24]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Sign In</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#41555f]/80 gap-2 border-t border-black/5">
        <div className="font-editorial text-sm text-[#041a24]">
          Hope, Inc. ERP
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-[#41555f]/60">
          Administrator-Managed Password Recovery
        </div>
      </footer>
    </div>
  );
}
