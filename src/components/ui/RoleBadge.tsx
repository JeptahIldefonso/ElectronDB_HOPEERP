'use client';

import React from 'react';
import { normalizeRole, type NormalizedRole } from '@/lib/permissions';
import { cn } from '@/lib/utils';

interface RoleBadgeProps {
  role?: string | null;
  variant?: 'pill' | 'sidebar' | 'inline';
  className?: string;
}

export function RoleBadge({ role, variant = 'pill', className }: RoleBadgeProps) {
  const normRole: NormalizedRole = normalizeRole(role);

  const roleTextMap: Record<NormalizedRole, string> = {
    superadmin: 'SUPERADMIN',
    admin: 'ADMIN',
    user: 'USER',
  };

  const displayText = roleTextMap[normRole];

  if (variant === 'sidebar') {
    return (
      <span
        className={cn(
          'font-mono text-[9.5px] uppercase tracking-[0.14em] text-text-muted select-none leading-none',
          className
        )}
      >
        {displayText}
      </span>
    );
  }

  // Tinted pill style matching:
  // Superadmin: amber/gold
  // Admin: blue
  // User: green
  const colorStyles: Record<NormalizedRole, string> = {
    superadmin:
      'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 dark:border-amber-400/40',
    admin:
      'bg-[#041a24]/10 text-[#041a24] dark:text-slate-200 border-[#041a24]/20 dark:border-slate-700',
    user:
      'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-400/40',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-[4px] border select-none transition-colors duration-150',
        colorStyles[normRole],
        className
      )}
      title={`Role: ${displayText}`}
    >
      {displayText}
    </span>
  );
}
