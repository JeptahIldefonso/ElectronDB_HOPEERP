'use client';

import React, { useState } from 'react';
import { normalizeRole, type NormalizedRole } from '@/lib/permissions';
import { ShieldAlert, X } from 'lucide-react';

interface WelcomeStripProps {
  fullName: string;
  role?: string | null;
  deniedNotice?: boolean;
}

export function WelcomeStrip({ role, deniedNotice = false }: WelcomeStripProps) {
  const [showNotice, setShowNotice] = useState(deniedNotice);
  const normRole: NormalizedRole = normalizeRole(role);

  const roleSubtitles: Record<NormalizedRole, string> = {
    superadmin:
      'You have full system access. You can manage all modules and assign roles to any user.',
    admin:
      'You can manage most modules and user rights (except Superadmin accounts).',
    user:
      'You have access to the core modules assigned to you. Contact an Admin for elevated permissions.',
  };

  return (
    <div className="space-y-3 select-none font-sans">
      {/* 1. Dismissible Access Denied Warning Banner (?denied=1) */}
      {showNotice && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200 text-xs animate-in fade-in-50 duration-150"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-medium truncate">
              You don&apos;t have access to that module.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowNotice(false)}
            aria-label="Dismiss notice"
            className="p-1 rounded text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Editorial Welcome Block */}
      <div className="pb-1">
        <h2 className="font-editorial italic text-2xl sm:text-[28px] font-normal text-text tracking-tight leading-tight">
          Welcome aboard
        </h2>
        <p className="font-sans text-xs sm:text-[13px] text-text-muted mt-1 leading-relaxed max-w-3xl">
          {roleSubtitles[normRole]}
        </p>
      </div>
    </div>
  );
}
