'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Users, 
  Package, 
  UserCheck, 
  ShoppingCart, 
  ArrowRight, 
  ShieldCheck, 
  BarChart3, 
  Database 
} from 'lucide-react';

export function PublicLandingPage() {
  return (
    <div className="min-h-screen bg-[#FDFCF7] dark:bg-[#0C121E] text-[#1E293B] dark:text-[#E2E8F0] font-sans flex flex-col justify-between selection:bg-[#0F172A] selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#0284C7] flex items-center justify-center font-bold text-white text-lg shadow-sm">
              H
            </div>
            <div className="font-editorial text-xl font-normal tracking-tight text-[#0F172A] dark:text-white">
              Hope, Inc. ERP
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-medium text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login?tab=register"
              className="text-xs font-medium bg-[#1D4ED8] hover:bg-[#1E40AF] text-white px-4 py-2 rounded shadow-xs transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero & Content (Matching Figure 2) */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 md:py-20 flex flex-col items-center text-center">
        <div className="max-w-3xl space-y-4">
          <h1 className="font-editorial text-4xl sm:text-5xl md:text-6xl font-normal text-[#0F172A] dark:text-white tracking-tight leading-[1.1]">
            Run your entire business <br className="hidden sm:inline" />
            <span className="text-[#0284C7]">with confidence</span>
          </h1>

          <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] max-w-xl mx-auto leading-relaxed pt-2">
            Hope, Inc. ERP unifies Customer Management, Product Catalog, Human Resources, and Sales into one powerful platform. Built for teams of every size.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold shadow-sm transition-all"
            >
              Sign In to Dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/login?tab=register"
              className="inline-flex items-center px-5 py-2.5 rounded bg-white dark:bg-white/10 hover:bg-black/5 dark:hover:bg-white/15 border border-black/15 dark:border-white/15 text-[#1E293B] dark:text-white text-xs font-semibold transition-all"
            >
              Register
            </Link>
          </div>
        </div>

        {/* 4 Core Modules Showcase (Fig 2) */}
        <div className="w-full max-w-4xl mt-14 sm:mt-16 bg-white dark:bg-[#111A2E] rounded-lg border border-black/10 dark:border-white/10 shadow-sm overflow-hidden text-left">
          <div className="bg-[#1E3A8A] px-4 py-2 flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
            </div>
            <span className="text-white/80 text-[11px] font-mono ml-2">Hope, Inc. ERP Dashboard</span>
          </div>

          <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded border border-black/5 dark:border-white/5 bg-[#F8FAFC] dark:bg-white/5 flex items-start gap-3">
              <div className="p-2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#0F172A] dark:text-white">Customers</h2>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">Manage clients &amp; accounts</p>
              </div>
            </div>

            <div className="p-4 rounded border border-black/5 dark:border-white/5 bg-[#F8FAFC] dark:bg-white/5 flex items-start gap-3">
              <div className="p-2 rounded bg-[#041a24]/10 text-[#041a24] dark:bg-white/10 dark:text-slate-200 shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#0F172A] dark:text-white">Products</h2>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">Catalog &amp; inventory pricing</p>
              </div>
            </div>

            <div className="p-4 rounded border border-black/5 dark:border-white/5 bg-[#F8FAFC] dark:bg-white/5 flex items-start gap-3">
              <div className="p-2 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#0F172A] dark:text-white">Human Resources</h2>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">Employees, jobs &amp; departments</p>
              </div>
            </div>

            <div className="p-4 rounded border border-black/5 dark:border-white/5 bg-[#F8FAFC] dark:bg-white/5 flex items-start gap-3">
              <div className="p-2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#0F172A] dark:text-white">Sales</h2>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">Orders, detail lines &amp; revenue</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Banner (Fig 2) */}
        <div className="mt-14 space-y-1">
          <h2 className="font-editorial text-xl sm:text-2xl font-normal text-[#0F172A] dark:text-white">
            Everything you need to grow
          </h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Four core modules. Three user roles. One unified system.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/10 dark:border-white/10 py-6 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
        Hope, Inc. ERP &bull; Student Explainer &bull; 100% Faithful Implementation
      </footer>
    </div>
  );
}
