'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { loginAction, registerAction, demoLoginAction } from '@/app/actions/auth';
import { TopographicCanvas } from '@/components/ambient/TopographicCanvas';

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await registerAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  const handleQuickDemo = (role: 'Superadmin' | 'Admin' | 'User') => {
    setError(null);
    startTransition(async () => {
      await demoLoginAction(role);
    });
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#F4F4F0] text-[#041a24] selection:bg-[#041a24] selection:text-white overflow-x-hidden font-sans">
      <TopographicCanvas />

      {/* Brand Header */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-xs font-medium text-[#41555f] hover:text-[#041a24] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#0284C7] flex items-center justify-center font-bold text-white text-sm shadow-xs">
            H
          </div>
          <span className="font-editorial text-lg font-normal text-[#041a24]">Hope, Inc. ERP</span>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6 w-full max-w-md mx-auto">
        <div className="w-full bg-white border border-black/10 rounded-[6px] shadow-sm p-6 sm:p-8 space-y-5">
          {/* Card Title (Fig 3 & 4) */}
          <div className="text-left">
            <h1 className="font-editorial text-2xl font-normal text-[#041a24] tracking-tight leading-tight">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-xs text-[#41555f] mt-1 font-sans">
              {mode === 'signin'
                ? 'Sign in to your Hope, Inc. ERP account'
                : 'Join Hope, Inc. ERP'}
            </p>
          </div>

          {/* Role rule notice in Register mode (Fig 3) */}
          {mode === 'register' && (
            <div className="rounded-[4px] bg-[#FFFBEB] border border-[#FDE68A] p-2.5 text-[11px] text-[#92400E] leading-relaxed">
              New accounts are created as <strong>User</strong>. Superadmin and Admin roles can only be assigned by existing administrators.
            </div>
          )}

          {/* Demo Accounts Notice in Login mode (Fig 4) */}
          {mode === 'signin' && (
            <div className="rounded-[4px] bg-[#041a24]/5 border border-[#041a24]/15 p-3 text-[11px] text-[#041a24] space-y-2">
              <div className="font-semibold text-xs text-[#041a24]">Demo accounts (one-click sign in):</div>
              <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('Superadmin')}
                  disabled={isPending}
                  className="py-1 px-1.5 bg-white border border-[#041a24]/20 hover:bg-[#041a24]/5 text-[10px] font-semibold text-[#041a24] rounded text-center transition-colors shadow-2xs"
                >
                  Superadmin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('Admin')}
                  disabled={isPending}
                  className="py-1 px-1.5 bg-white border border-[#041a24]/20 hover:bg-[#041a24]/5 text-[10px] font-semibold text-[#041a24] rounded text-center transition-colors shadow-2xs"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('User')}
                  disabled={isPending}
                  className="py-1 px-1.5 bg-white border border-[#041a24]/20 hover:bg-[#041a24]/5 text-[10px] font-semibold text-[#041a24] rounded text-center transition-colors shadow-2xs"
                >
                  User (Staff)
                </button>
              </div>
            </div>
          )}

          {/* Segmented Mode Switcher */}
          <div
            role="tablist"
            className="grid grid-cols-2 p-1 rounded-[4px] bg-[#F4F4F0] border border-black/10 text-xs font-medium"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`py-1.5 text-center transition-all rounded-[3px] font-medium cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-[#041a24] shadow-2xs font-semibold'
                  : 'text-[#41555f] hover:text-[#041a24]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-1.5 text-center transition-all rounded-[3px] font-medium cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-[#041a24] shadow-2xs font-semibold'
                  : 'text-[#41555f] hover:text-[#041a24]'
              }`}
            >
              Register
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="rounded-[3px] bg-red-50 border border-red-200 p-2.5 text-xs text-red-800 flex items-start gap-2 font-mono"
            >
              <span className="font-semibold shrink-0">ERROR:</span>
              <span>{error}</span>
            </div>
          )}

          {/* Sign In Form (Fig 4) */}
          {mode === 'signin' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="signin-email"
                  className="block text-xs font-semibold text-[#041a24] mb-1 font-sans"
                >
                  Email address
                </label>
                <input
                  id="signin-email"
                  name="email"
                  type="email"
                  required
                  defaultValue="admin@hope.com"
                  placeholder="name@hope.com"
                  className="w-full h-9 px-3 bg-white border border-black/15 focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]/20 rounded-[3px] text-xs text-[#041a24] placeholder-[#41555f]/60 outline-none transition-all font-sans"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="signin-password"
                    className="block text-xs font-semibold text-[#041a24] font-sans"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] text-[#0284C7] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="signin-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    defaultValue="demo"
                    placeholder="Enter your password"
                    className="w-full h-9 pl-3 pr-9 bg-white border border-black/15 focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]/20 rounded-[3px] text-xs text-[#041a24] placeholder-[#41555f]/60 outline-none transition-all font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-black/40 hover:text-[#041a24] p-1 rounded transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-black/20 text-[#0284C7] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="remember-me" className="text-xs text-[#41555f] cursor-pointer select-none">
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full h-9 bg-[#1D4ED8] hover:bg-[#1E40AF] active:bg-[#1E3A8A] disabled:opacity-50 text-white font-medium text-xs rounded-[3px] shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Signing in...</span>
                  </span>
                ) : (
                  <span>Sign In</span>
                )}
              </button>

              <div className="relative my-3 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-black/10" />
                </div>
                <span className="relative bg-white px-2 text-[10px] text-[#41555f] uppercase tracking-wider font-mono">
                  or
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleQuickDemo('User')}
                className="w-full h-9 bg-white hover:bg-neutral-50 border border-black/15 text-[#041a24] font-medium text-xs rounded-[3px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span className="font-bold text-[#EA4335] text-sm leading-none">G</span>
                <span>Continue with Google</span>
              </button>

              <div className="text-center pt-1 text-xs text-[#41555f] font-sans">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="font-medium text-[#1D4ED8] hover:underline"
                >
                  Register
                </button>
              </div>
            </form>
          )}

          {/* Registration Form (Fig 3) */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="reg-first"
                    className="block text-xs font-semibold text-[#041a24] mb-1 font-sans"
                  >
                    First name
                  </label>
                  <input
                    id="reg-first"
                    name="firstName"
                    type="text"
                    required
                    placeholder="Jerry"
                    className="w-full h-9 px-3 bg-white border border-black/15 focus:border-[#0284C7] rounded-[3px] text-xs text-[#041a24] placeholder-[#41555f]/60 outline-none transition-all font-sans"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-last"
                    className="block text-xs font-semibold text-[#041a24] mb-1 font-sans"
                  >
                    Last name
                  </label>
                  <input
                    id="reg-last"
                    name="lastName"
                    type="text"
                    required
                    placeholder="Esperanza"
                    className="w-full h-9 px-3 bg-white border border-black/15 focus:border-[#0284C7] rounded-[3px] text-xs text-[#041a24] placeholder-[#41555f]/60 outline-none transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-semibold text-[#041a24] mb-1 font-sans"
                >
                  Email address
                </label>
                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  required
                  placeholder="jcesperanza@neu.edu.ph"
                  className="w-full h-9 px-3 bg-white border border-black/15 focus:border-[#0284C7] rounded-[3px] text-xs text-[#041a24] placeholder-[#41555f]/60 outline-none transition-all font-sans"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-semibold text-[#041a24] mb-1 font-sans"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    name="password"
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={4}
                    placeholder="••••••••••••"
                    className="w-full h-9 pl-3 pr-9 bg-white border border-black/15 focus:border-[#0284C7] rounded-[3px] text-xs text-[#041a24] placeholder-[#41555f]/60 outline-none transition-all font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-black/40 hover:text-[#041a24] p-1 rounded transition-colors"
                  >
                    {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full h-9 bg-[#1D4ED8] hover:bg-[#1E40AF] active:bg-[#1E3A8A] disabled:opacity-50 text-white font-medium text-xs rounded-[3px] shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer mt-1"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Registering...</span>
                  </span>
                ) : (
                  <span>Register</span>
                )}
              </button>

              <div className="relative my-3 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-black/10" />
                </div>
                <span className="relative bg-white px-2 text-[10px] text-[#41555f] uppercase tracking-wider font-mono">
                  or
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleQuickDemo('User')}
                className="w-full h-9 bg-white hover:bg-neutral-50 border border-black/15 text-[#041a24] font-medium text-xs rounded-[3px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span className="font-bold text-[#EA4335] text-sm leading-none">G</span>
                <span>Continue with Google</span>
              </button>

              <div className="text-center pt-1 text-xs text-[#41555f] font-sans">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                  }}
                  className="font-medium text-[#1D4ED8] hover:underline"
                >
                  Sign in
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-6 py-4 text-center text-xs text-[#41555f]">
        Hope, Inc. ERP &bull; Student Explainer
      </footer>
    </div>
  );
}
