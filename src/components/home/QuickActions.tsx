'use client';

import React from 'react';
import Link from 'next/link';
import {
  canAccess,
  MODULE_METADATA,
  type ModuleName,
} from '@/lib/permissions';
import {
  ShoppingCart,
  Users,
  CreditCard,
  Package,
  Briefcase,
  FileText,
  Shield,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  userRole?: string | null;
  userRights?: string[];
}

const MODULE_ICONS: Record<ModuleName, React.ComponentType<{ className?: string }>> = {
  sales: ShoppingCart,
  customer: Users,
  payments: CreditCard,
  products: Package,
  'human-resources': Briefcase,
  reports: FileText,
  'user-management': Shield,
};

const ACTION_MODULES: ModuleName[] = [
  'sales',
  'customer',
  'payments',
  'products',
  'human-resources',
  'reports',
  'user-management',
];

export function QuickActions({ userRole, userRights = [] }: QuickActionsProps) {
  return (
    <div
      aria-label="Quick Actions"
      className="w-full rounded-2xl border border-border bg-surface-1/90 dark:bg-surface-1 backdrop-blur-md p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.1)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2),0_8px_24px_-8px_rgba(0,0,0,0.35)] select-none font-sans transition-colors duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-text-faint font-semibold">
            QUICK ACTIONS &bull; NAVIGATION SHORTCUTS
          </span>
        </div>
        <span className="font-mono text-[10.5px] text-text-muted">
          Clickable per your assigned role & rights
        </span>
      </div>

      {/* Action Row / Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {ACTION_MODULES.map((modName) => {
          const meta = MODULE_METADATA[modName];
          const hasAccess = canAccess(userRole, modName, userRights);
          const Icon = MODULE_ICONS[modName];

          if (hasAccess) {
            return (
              <Link
                key={modName}
                href={meta.href}
                className={cn(
                  'group flex flex-col items-center text-center p-3 rounded-xl border border-border/80 bg-surface-2/40 hover:bg-surface-2 hover:border-accent/40 active:scale-[0.98] transition-all cursor-pointer'
                )}
                title={`Open ${meta.label}: ${meta.shortDesc}`}
              >
                <div className="w-8 h-8 rounded-lg bg-surface-1 border border-border flex items-center justify-center text-text group-hover:text-accent group-hover:border-accent/40 transition-colors shadow-2xs mb-2">
                  <Icon className="w-4 h-4 stroke-[1.75]" />
                </div>
                <span className="text-xs font-semibold text-text group-hover:text-accent leading-tight">
                  {meta.label}
                </span>
                <span className="font-mono text-[9.5px] text-text-muted leading-tight mt-1 line-clamp-1">
                  {meta.shortDesc}
                </span>
              </Link>
            );
          }

          // Disabled / Greyed out with Lock icon
          return (
            <div
              key={modName}
              title="Not granted. Contact an Admin."
              aria-disabled="true"
              className="flex flex-col items-center text-center p-3 rounded-xl border border-dashed border-border/60 bg-surface-2/20 opacity-55 cursor-not-allowed select-none"
            >
              <div className="relative w-8 h-8 rounded-lg bg-surface-2/80 border border-border flex items-center justify-center text-text-faint mb-2">
                <Icon className="w-4 h-4 stroke-[1.5]" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-surface-1 border border-border flex items-center justify-center text-text-muted">
                  <Lock className="w-2.5 h-2.5" />
                </div>
              </div>
              <span className="text-xs font-medium text-text-faint leading-tight flex items-center gap-1">
                {meta.label}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-text-faint leading-tight mt-1">
                Locked
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
