'use client';

import React, { useSyncExternalStore } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import {
  getPref,
  setPref,
  subscribeTheme,
  getResolvedTheme,
  type ThemePref,
} from '@/lib/theme/theme';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  variant?: 'pill' | 'segmented' | 'menu-item';
  className?: string;
}

/**
 * Modern Light / Dark Mode Toggle Switch matching the Pill Capsule Design
 * with dual Sun/Moon icons and a sliding circular thumb.
 */
export function ThemeToggle({ variant = 'pill', className = '' }: ThemeToggleProps) {
  // Safe SSR & client external store subscription (prevents hydration mismatch)
  const currentPref = useSyncExternalStore(subscribeTheme, getPref, () => 'system');
  const resolvedTheme = useSyncExternalStore(subscribeTheme, getResolvedTheme, () => 'light');

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    setPref(isDark ? 'light' : 'dark');
  };

  const options: Array<{ pref: ThemePref; label: string; icon: React.ReactNode }> = [
    {
      pref: 'system',
      label: 'System',
      icon: <Monitor className="w-3.5 h-3.5" />,
    },
    {
      pref: 'light',
      label: 'Light',
      icon: <Sun className="w-3.5 h-3.5" />,
    },
    {
      pref: 'dark',
      label: 'Dark',
      icon: <Moon className="w-3.5 h-3.5" />,
    },
  ];

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (index + 1) % options.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (index - 1 + options.length) % options.length;
    } else {
      return;
    }
    e.preventDefault();
    setPref(options[nextIndex].pref);
  };

  // 1. Menu-item variant for user profile dropdown
  if (variant === 'menu-item') {
    return (
      <div className={`px-3 py-2 space-y-1.5 ${className}`}>
        <span className="block font-mono text-[10px] uppercase tracking-wider text-text-muted">
          Appearance
        </span>
        <div
          role="radiogroup"
          aria-label="Theme preference"
          className="grid grid-cols-3 gap-1 p-0.5 rounded-[3px] bg-surface-2 border border-border"
        >
          {options.map((opt, idx) => {
            const isSelected = currentPref === opt.pref;
            return (
              <button
                key={opt.pref}
                type="button"
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setPref(opt.pref)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-[2px] font-mono text-[11px] transition-colors cursor-pointer select-none ${
                  isSelected
                    ? 'bg-surface-1 text-text shadow-2xs font-semibold border border-border'
                    : 'text-text-muted hover:text-text hover:bg-surface-1/50'
                }`}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. Segmented 3-option bar (System / Light / Dark)
  if (variant === 'segmented') {
    return (
      <div
        role="radiogroup"
        aria-label="Theme preference"
        className={`inline-flex items-center p-0.5 rounded-[3px] bg-surface-2 border border-border select-none ${className}`}
      >
        {options.map((opt, idx) => {
          const isSelected = currentPref === opt.pref;
          return (
            <button
              key={opt.pref}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${opt.label} theme`}
              title={`${opt.label} theme`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setPref(opt.pref)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`p-1 sm:px-2 sm:py-1 rounded-[2px] flex items-center gap-1 font-mono text-[10px] transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                isSelected
                  ? 'bg-surface-1 text-text shadow-2xs font-semibold border border-border'
                  : 'text-text-muted hover:text-text hover:bg-surface-1/50'
              }`}
            >
              {opt.icon}
              <span className="hidden md:inline">{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // 3. Default: Modern Pill Capsule Toggle Switch (Matching Reference Image)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggleTheme}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setPref('light');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setPref('dark');
        }
      }}
      className={cn(
        'relative inline-flex items-center h-8 w-[60px] rounded-full p-1 cursor-pointer select-none transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-95 shrink-0',
        isDark
          ? 'bg-[#0A1017] border border-white/10'
          : 'bg-[#E2E8F0] border border-black/10',
        className
      )}
    >
      {/* Sliding Active Pill Thumb */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-1 left-1 h-6 w-6 rounded-full transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none',
          isDark
            ? 'translate-x-[28px] bg-[#243040] shadow-sm border border-white/15'
            : 'translate-x-0 bg-white shadow-sm border border-black/5'
        )}
      />

      {/* Dual Icon Slots (Sun on left, Moon on right) */}
      <span className="relative z-10 flex w-full items-center justify-between pointer-events-none">
        {/* Left: Sun Slot */}
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center transition-colors duration-200',
            isDark ? 'text-slate-500' : 'text-[#0F172A]'
          )}
        >
          <Sun className="h-3.5 w-3.5 stroke-[2]" />
        </span>

        {/* Right: Moon Slot */}
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center transition-colors duration-200',
            isDark ? 'text-[#E6EDF3]' : 'text-slate-400'
          )}
        >
          <Moon className="h-3.5 w-3.5 stroke-[2]" />
        </span>
      </span>
    </button>
  );
}
