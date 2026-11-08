'use client';

import React, { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { loginAction, registerAction } from '@/app/actions/auth';
import { TopographicCanvas } from '@/components/ambient/TopographicCanvas';

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Keep browser tab title synchronized with active authentication mode
  useEffect(() => {
    document.title =
      mode === 'signin'
        ? 'Sign In | ElectronDB ERP'
        : 'Register | ElectronDB ERP';
  }, [mode]);

  const handleTabKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setMode('register');
      setError(null);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setMode('signin');
      setError(null);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setMode('signin');
      setError(null);
    } else if (e.key === 'End') {
      e.preventDefault();
      setMode('register');
      setError(null);
    }
  };

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



  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#F4F4F0] text-[#041a24] selection:bg-[#041a24] selection:text-white overflow-x-hidden font-sans transition-colors duration-150">
      <TopographicCanvas />

      {/* Brand Header (High contrast against matte light topographic canvas) */}
      <header className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#41555e] hover:text-[#041a25] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing</span>
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
            <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#41555e] mt-0.5">
              ERP
            </span>
          </div>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6 w-full max-w-md mx-auto">
        <div className="w-full bg-white dark:bg-surface-1 border border-black/10 dark:border-border rounded-[6px] shadow-sm p-6 sm:p-8 space-y-5 transition-colors duration-150">
          {/* Card Title & Rebranded Copy */}
          <div className="text-left">
            <h1 className="font-editorial text-2xl font-normal text-[#041a24] dark:text-text tracking-tight leading-tight">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-xs text-[#41555f] dark:text-text-muted mt-1 font-sans">
              {mode === 'signin'
                ? 'Sign in to your ElectronDB ERP account'
                : 'Create your ElectronDB ERP account'}
            </p>
          </div>

          {/* Role rule notice in Register mode */}
          {mode === 'register' && (
            <div className="rounded-[4px] bg-[#FFFBEB] dark:bg-[#78350F]/20 border border-[#FDE68A] dark:border-[#92400E]/40 p-2.5 text-[11px] text-[#92400E] dark:text-[#FDE68A] leading-relaxed">
              New accounts are created as <strong>User</strong>. Superadmin and Admin roles can only be assigned by existing administrators.
            </div>
          )}

          {/* Artistic Segmented Mode Switcher with sliding navy thumb */}
          <div
            role="tablist"
            aria-label="Authentication mode"
            tabIndex={0}
            onKeyDown={handleTabKeyDown}
            className="relative grid grid-cols-2 p-1 rounded-[4px] bg-[#F4F4F0] dark:bg-surface-2 border border-black/10 dark:border-border text-xs font-medium select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-[#041a24]"
          >
            {/* Sliding navy thumb */}
            <div
              aria-hidden="true"
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-[3px] bg-[#041a24] dark:bg-primary-bg shadow-xs pointer-events-none transition-transform duration-200 ease-out motion-reduce:transition-none"
              style={{
                transform: mode === 'signin' ? 'translateX(0%)' : 'translateX(100%)',
              }}
            />

            {/* Sign In tab button */}
            <button
              id="tab-signin"
              type="button"
              role="tab"
              aria-selected={mode === 'signin'}
              aria-controls="panel-signin"
              tabIndex={mode === 'signin' ? 0 : -1}
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`relative z-10 py-1.5 text-center font-mono text-[11px] uppercase tracking-[0.14em] font-semibold transition-colors duration-200 cursor-pointer ${
                mode === 'signin'
                  ? 'text-white dark:!text-primary-fg'
                  : 'text-[#41555f] hover:text-[#041a24] dark:text-text-muted dark:hover:text-text'
              }`}
            >
              Sign In
            </button>

            {/* Register tab button */}
            <button
              id="tab-register"
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              aria-controls="panel-register"
              tabIndex={mode === 'register' ? 0 : -1}
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`relative z-10 py-1.5 text-center font-mono text-[11px] uppercase tracking-[0.14em] font-semibold transition-colors duration-200 cursor-pointer ${
                mode === 'register'
                  ? 'text-white dark:!text-primary-fg'
                  : 'text-[#41555f] hover:text-[#041a24] dark:text-text-muted dark:hover:text-text'
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

          {/* Sign In Form */}
          {mode === 'signin' && (
            <form id="panel-signin" role="tabpanel" aria-labelledby="tab-signin" onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="signin-email"
                  className="block font-mono text-[11px] uppercase tracking-[0.14em] font-medium text-[#41555f] dark:text-text-muted mb-1.5"
                >
                  Email address
                </label>
                <input
                  id="signin-email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@hope.com"
                  className="w-full h-9 px-3 bg-white dark:bg-surface-2 border border-black/15 dark:border-border focus:border-[#041a24] dark:focus:border-text focus:ring-1 focus:ring-[#041a24]/20 rounded-[3px] text-xs text-[#041a24] dark:text-text placeholder-[#41555f]/60 dark:placeholder-text-muted/60 outline-none transition-all font-sans"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="signin-password"
                    className="block font-mono text-[11px] uppercase tracking-[0.14em] font-medium text-[#41555f] dark:text-text-muted"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-sans text-[#41555f] hover:text-[#041a24] dark:text-text-muted dark:hover:text-text transition-colors"
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
                    placeholder="Enter your password"
                    className="w-full h-9 pl-3 pr-9 bg-white dark:bg-surface-2 border border-black/15 dark:border-border focus:border-[#041a24] dark:focus:border-text focus:ring-1 focus:ring-[#041a24]/20 rounded-[3px] text-xs text-[#041a24] dark:text-text placeholder-[#41555f]/60 dark:placeholder-text-muted/60 outline-none transition-all font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-black/40 dark:text-text-muted hover:text-[#041a24] dark:hover:text-text p-1 rounded transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full h-9 bg-[#041a24] dark:bg-primary-bg hover:bg-[#1c313b] dark:hover:bg-primary-bg/90 active:bg-black dark:active:bg-primary-bg/80 disabled:opacity-50 text-white dark:!text-primary-fg font-medium text-xs rounded-[3px] shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#041a24] dark:border-primary-bg"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white dark:!text-primary-fg" />
                    <span>Signing in...</span>
                  </span>
                ) : (
                  <span>Sign In</span>
                )}
              </button>



              <div className="text-center pt-1 text-xs text-[#41555f] dark:text-text-muted font-sans">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="font-medium text-[#041a24] dark:text-text hover:underline cursor-pointer"
                >
                  Register
                </button>
              </div>
            </form>
          )}

          {/* Registration Form */}
          {mode === 'register' && (
            <form id="panel-register" role="tabpanel" aria-labelledby="tab-register" onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="reg-first"
                    className="block font-mono text-[11px] uppercase tracking-[0.14em] font-medium text-[#41555f] dark:text-text-muted mb-1.5"
                  >
                    First name
                  </label>
                  <input
                    id="reg-first"
                    name="firstName"
                    type="text"
                    required
                    placeholder="Jeptah"
                    className="w-full h-9 px-3 bg-white dark:bg-surface-2 border border-black/15 dark:border-border focus:border-[#041a24] dark:focus:border-text rounded-[3px] text-xs text-[#041a24] dark:text-text placeholder-[#41555f]/60 dark:placeholder-text-muted/60 outline-none transition-all font-sans"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-last"
                    className="block font-mono text-[11px] uppercase tracking-[0.14em] font-medium text-[#41555f] dark:text-text-muted mb-1.5"
                  >
                    Last name
                  </label>
                  <input
                    id="reg-last"
                    name="lastName"
                    type="text"
                    required
                    placeholder="Ildefonso"
                    className="w-full h-9 px-3 bg-white dark:bg-surface-2 border border-black/15 dark:border-border focus:border-[#041a24] dark:focus:border-text rounded-[3px] text-xs text-[#041a24] dark:text-text placeholder-[#41555f]/60 dark:placeholder-text-muted/60 outline-none transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="block font-mono text-[11px] uppercase tracking-[0.14em] font-medium text-[#41555f] dark:text-text-muted mb-1.5"
                >
                  Email address
                </label>
                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  required
                  placeholder="ildefonsojeptahashleyr@gmail.com"
                  className="w-full h-9 px-3 bg-white dark:bg-surface-2 border border-black/15 dark:border-border focus:border-[#041a24] dark:focus:border-text rounded-[3px] text-xs text-[#041a24] dark:text-text placeholder-[#41555f]/60 dark:placeholder-text-muted/60 outline-none transition-all font-sans"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-password"
                  className="block font-mono text-[11px] uppercase tracking-[0.14em] font-medium text-[#41555f] dark:text-text-muted mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="reg-password"
                    name="password"
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="••••••••••••"
                    className="w-full h-9 pl-3 pr-9 bg-white dark:bg-surface-2 border border-black/15 dark:border-border focus:border-[#041a24] dark:focus:border-text rounded-[3px] text-xs text-[#041a24] dark:text-text placeholder-[#41555f]/60 dark:placeholder-text-muted/60 outline-none transition-all font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-black/40 dark:text-text-muted hover:text-[#041a24] dark:hover:text-text p-1 rounded transition-colors"
                    aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full h-9 bg-[#041a24] dark:bg-primary-bg hover:bg-[#1c313b] dark:hover:bg-primary-bg/90 active:bg-black dark:active:bg-primary-bg/80 disabled:opacity-50 text-white dark:!text-primary-fg font-medium text-xs rounded-[3px] shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer mt-1 border border-[#041a24] dark:border-primary-bg"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white dark:!text-primary-fg" />
                    <span>Registering...</span>
                  </span>
                ) : (
                  <span>Register</span>
                )}
              </button>



              <div className="text-center pt-1 text-xs text-[#41555f] dark:text-text-muted font-sans">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setError(null);
                  }}
                  className="font-medium text-[#041a24] dark:text-text hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-6 py-4 text-center text-xs font-mono text-[#41555e]">
        ElectronDB ERP &bull; Student Explainer
      </footer>
    </div>
  );
}
