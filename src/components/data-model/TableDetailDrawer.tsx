'use client';

import React from 'react';
import Link from 'next/link';
import {
  X,
  Key,
  Layers,
  Database,
  ExternalLink,
  Lock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  DATA_MODEL_TABLES,
  MODULE_THEMES,
  type TableDefinition,
} from '@/lib/data-model';
import { canAccess, type ModuleName } from '@/lib/permissions';

interface TableDetailDrawerProps {
  tableName: string | null;
  onClose: () => void;
  userRole?: string | null;
  userRights?: string[];
  liveRowCount?: number;
}

export function TableDetailDrawer({
  tableName,
  onClose,
  userRole,
  userRights = [],
  liveRowCount,
}: TableDetailDrawerProps) {
  if (!tableName) return null;
  const table = DATA_MODEL_TABLES[tableName];
  if (!table) return null;

  const theme = MODULE_THEMES[table.module];
  const rows = liveRowCount ?? table.fallbackRowCount;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Table details for ${table.name}`}
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[300px] max-w-[300px] bg-surface-1 border-l border-border shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-200"
    >
      {/* ── 1. Drawer Header ── */}
      <div className="p-3.5 border-b border-border flex items-start justify-between gap-2.5 bg-surface-2/40">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold uppercase tracking-wider ${theme.badgeBg} ${theme.badgeText}`}
            >
              {theme.name}
            </span>
            <span className="font-mono text-[10px] text-text-muted">
              {rows} rows
            </span>
          </div>
          <h2 className="font-editorial italic text-xl font-normal text-text tracking-tight truncate">
            {table.name}
          </h2>
          <p className="font-sans text-[11px] text-text-muted mt-0.5 leading-snug">
            {table.description}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-3 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── 2. Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
        {/* Sample Screen Preview */}
        <div className="p-2.5 rounded-lg border border-border bg-surface-2/30 space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-text-faint font-semibold block">
            HOW THIS LOOKS ON SCREEN
          </span>
          <p className="text-text font-medium text-[11px] leading-snug">
            {table.sampleScreenView}
          </p>
        </div>

        {/* Columns Specification Table */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-text-faint font-semibold">
              COLUMNS SPECIFICATION ({table.columns.length})
            </span>
            <span className="font-mono text-[9px] text-text-faint">
              *Composite PK
            </span>
          </div>

          <div className="rounded-lg border border-border overflow-hidden bg-surface-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-2/60 font-mono text-[9px] uppercase tracking-wider text-text-faint">
                  <th className="py-1.5 px-2">Column</th>
                  <th className="py-1.5 px-1.5">Type</th>
                  <th className="py-1.5 px-1.5 text-right">Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-[10.5px]">
                {table.columns.map((col) => (
                  <tr key={col.name} className="hover:bg-surface-2/40 transition-colors">
                    <td className="py-1.5 px-2">
                      <span className={`font-semibold ${col.isPk ? 'text-text underline' : 'text-text'}`}>
                        {col.name}
                      </span>
                      <span className="block font-sans text-[9.5px] text-text-muted truncate mt-0.5">
                        {col.description}
                      </span>
                    </td>
                    <td className="py-1.5 px-1.5 text-text-muted text-[10px] whitespace-nowrap">
                      {col.type}
                    </td>
                    <td className="py-1.5 px-1.5 text-right whitespace-nowrap">
                      {col.isCompositePk ? (
                        <span className="inline-block px-1 py-0.2 rounded text-[8.5px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          PK*
                        </span>
                      ) : col.isPk ? (
                        <span className="inline-block px-1 py-0.2 rounded text-[8.5px] font-bold bg-[#041a24]/10 text-[#041a24] dark:bg-slate-800 dark:text-slate-200">
                          PK
                        </span>
                      ) : col.isFk ? (
                        <span className="inline-block px-1 py-0.2 rounded text-[8.5px] font-medium bg-slate-500/15 text-slate-700 dark:text-slate-300">
                          FK
                        </span>
                      ) : (
                        <span className="text-text-faint text-[9px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Used By Pages & Actions (with RBAC enforcement) */}
        <div className="space-y-1.5">
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-text-faint font-semibold block">
            USED BY APPLICATION PAGES & ROUTES
          </span>

          <div className="space-y-1.5">
            {table.usedByPages.map((page) => {
              const hasAccess =
                page.moduleKey === 'home'
                  ? true
                  : canAccess(userRole, page.moduleKey as ModuleName, userRights);

              if (hasAccess) {
                return (
                  <Link
                    key={page.title}
                    href={page.href}
                    className="flex items-center justify-between p-2 rounded-lg border border-border bg-surface-2/40 hover:bg-surface-2 hover:border-accent/40 transition-colors group cursor-pointer"
                  >
                    <div className="min-w-0 pr-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-[11px] text-text group-hover:text-accent transition-colors truncate">
                          {page.title}
                        </span>
                        <span className="font-mono text-[8.5px] uppercase px-1 py-0.2 rounded bg-surface-3 text-text-muted">
                          {page.mode}
                        </span>
                      </div>
                      <span className="font-mono text-[9.5px] text-text-faint block mt-0.5 truncate">
                        {page.href}
                      </span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-text-faint group-hover:text-accent transition-transform group-hover:translate-x-0.5 shrink-0" />
                  </Link>
                );
              }

              // Locked state for ungranted module
              return (
                <div
                  key={page.title}
                  title="You don't have access to this module"
                  className="flex items-center justify-between p-2 rounded-lg border border-border/50 bg-surface-2/20 opacity-60 cursor-not-allowed select-none"
                >
                  <div className="min-w-0 pr-1.5">
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-text-faint shrink-0" />
                      <span className="font-medium text-[11px] text-text-muted truncate">
                        {page.title}
                      </span>
                      <span className="font-mono text-[8.5px] uppercase px-1 py-0.2 rounded bg-surface-3/50 text-text-faint">
                        LOCKED
                      </span>
                    </div>
                    <span className="font-mono text-[9.5px] text-text-faint block mt-0.5 truncate">
                      {page.href}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 3. Drawer Footer ── */}
      <div className="px-3.5 py-2.5 border-t border-border bg-surface-2/30 flex items-center justify-between">
        <span className="font-mono text-[9.5px] text-text-muted">
          Canonical ERD Entity
        </span>
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-surface-3 hover:bg-surface-4 text-text transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}
