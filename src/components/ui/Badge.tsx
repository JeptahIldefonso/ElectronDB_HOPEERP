import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'bg-[#041a24] dark:bg-surface-2 text-white dark:text-text border-transparent dark:border-border',
    success: 'bg-[#041a24] dark:bg-emerald-950/50 text-white dark:text-emerald-400 border-transparent dark:border-emerald-500/30',
    warning: 'bg-[#FEF08A]/80 dark:bg-amber-950/50 text-[#713F12] dark:text-amber-400 border-yellow-400/50 dark:border-amber-500/30',
    danger:  'bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-400 border-red-200 dark:border-red-500/30',
    info:    'bg-[#041a24]/10 dark:bg-slate-800 text-[#041a24] dark:text-slate-200 border-[#041a24]/20 dark:border-slate-700',
    outline: 'bg-white dark:bg-surface-2 text-[#041a24] dark:text-text border-black/15 dark:border-border',
  };

  const badgeClass = variants[variant] || variants.default;

  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono font-medium border leading-none tracking-wide select-none transition-colors duration-150',
        badgeClass,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
