'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { DbHealthResult } from '@/lib/db-health';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Database,
  Info,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type DisplayDbStatus = 'connected' | 'partial' | 'disconnected' | 'unverified' | 'checking';

interface DbStatusPillProps {
  onStatusChange?: (status: DisplayDbStatus) => void;
}

export function DbStatusPill({ onStatusChange }: DbStatusPillProps) {
  const [health, setHealth] = useState<DbHealthResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayStatus, setDisplayStatus] = useState<DisplayDbStatus>('checking');
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Fetch health data client-side after initial render
  const fetchHealth = async (forceFresh = false) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/health/db${forceFresh ? '?fresh=1' : ''}`);

      if (res.status === 401) {
        const unverifiedFallback: DbHealthResult = {
          connected: false,
          status: 'disconnected',
          engine: 'SQLite (hope.db)',
          tablesExpected: 10,
          tablesFound: 0,
          latencyMs: 0,
          checkedAt: new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZone: 'Asia/Manila',
          }),
          tables: [],
          reason: 'unauthorized',
          message: 'Session authentication required to inspect database health.',
        };
        setHealth(unverifiedFallback);
        setDisplayStatus('unverified');
        onStatusChange?.('unverified');
        return;
      }

      if (!res.ok) {
        throw new Error(`Health check HTTP error ${res.status}`);
      }

      const data: DbHealthResult = await res.json();
      setHealth(data);
      setDisplayStatus(data.status);
      onStatusChange?.(data.status);
    } catch {
      // Network error, 500, or check could not run -> Neutral unverified state
      const networkFallback: DbHealthResult = {
        connected: false,
        status: 'disconnected',
        engine: 'SQLite (hope.db)',
        tablesExpected: 10,
        tablesFound: 0,
        latencyMs: 0,
        checkedAt: new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZone: 'Asia/Manila',
        }),
        tables: [],
        reason: 'query_failed',
        message: 'Could not verify database status at this time.',
      };
      setHealth(networkFallback);
      setDisplayStatus('unverified');
      onStatusChange?.('unverified');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth(false);

    // Auto re-check every 60s only when document is visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchHealth(true);
      }
    }, 60_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchHealth(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Close on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const currentStatus: DisplayDbStatus = loading && !health ? 'checking' : displayStatus;

  // State configurations: green (healthy), amber (partial), red (disconnected), neutral (unverified/checking)
  const statusConfig = {
    connected: {
      label: 'Database connected',
      dotClass: 'bg-emerald-500 animate-pulse',
      badgeClass:
        'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/15',
    },
    partial: {
      label: 'Partially connected',
      dotClass: 'bg-amber-500',
      badgeClass:
        'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/15',
    },
    disconnected: {
      label: 'Data not connected',
      dotClass: 'bg-rose-500',
      badgeClass:
        'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300 hover:bg-rose-500/15',
    },
    unverified: {
      label: 'Could not verify',
      dotClass: 'bg-neutral-400',
      badgeClass:
        'border-border bg-surface-2 text-text-muted hover:bg-surface-2/80',
    },
    checking: {
      label: 'Checking...',
      dotClass: 'bg-neutral-400 animate-ping',
      badgeClass:
        'border-border bg-surface-2 text-text-muted hover:bg-surface-2/80',
    },
  }[currentStatus];

  // User-friendly plain language explanation based on safe reason code
  function getReasonExplanation(): string {
    if (!health?.reason) return health?.message || 'Database status is normal.';
    switch (health.reason) {
      case 'file_missing':
        return 'The database file was not found on the server deployment.';
      case 'open_failed':
        return 'Could not open the SQLite database connection on the server.';
      case 'timeout':
        return 'The database verification query exceeded the allowed timeout threshold.';
      case 'table_missing':
        return 'One or more canonical ERP tables are missing from the database.';
      case 'unauthorized':
        return 'Session authentication is required to inspect live database status.';
      case 'query_failed':
      default:
        return health.message || 'The server could not verify database status at this time.';
    }
  }

  return (
    <div className="relative inline-block select-none font-sans">
      {/* ── Status Pill Button ── */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="db-health-popover"
        aria-label={`Database status: ${statusConfig.label}. Click to verify connection.`}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer shadow-2xs transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
          statusConfig.badgeClass
        )}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className={cn('inline-flex rounded-full h-2 w-2', statusConfig.dotClass)} />
        </span>
        <span className="leading-none whitespace-nowrap">{statusConfig.label}</span>
      </button>

      {/* Accessible live region for status announcements */}
      <span className="sr-only" aria-live="polite">
        Database status is currently {statusConfig.label}.
      </span>

      {/* ── Verification Popover ── */}
      {isOpen && (
        <div
          id="db-health-popover"
          ref={popoverRef}
          role="dialog"
          aria-label="Connection verification"
          className="absolute right-0 mt-2 w-[340px] sm:w-[380px] rounded-2xl border border-border bg-surface-1 dark:bg-surface-1/95 p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.14)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.45)] backdrop-blur-md z-50 animate-in fade-in-50 zoom-in-95 duration-150 text-xs text-text"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-border">
            <div>
              <div className="flex items-center gap-1.5 text-text">
                <Database className="w-4 h-4 text-accent" />
                <h3 className="font-semibold text-sm">Connection verification</h3>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted mt-0.5">
                Live SQLite 10-table ERD health check
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchHealth(true)}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-[4px] border border-border bg-surface-2 hover:bg-surface-2/80 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
              title="Query the database again"
            >
              <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
              <span>Re-check</span>
            </button>
          </div>

          {/* Status Banner */}
          <div className="my-3.5 p-3 rounded-xl border bg-surface-2/50 border-border">
            <div className="flex items-center gap-2">
              {currentStatus === 'connected' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              {currentStatus === 'partial' && (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              {currentStatus === 'disconnected' && (
                <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              {currentStatus === 'unverified' && (
                <HelpCircle className="w-4 h-4 text-neutral-500 shrink-0" />
              )}
              <span className="font-semibold text-sm">
                {currentStatus === 'connected'
                  ? 'Database fully connected'
                  : currentStatus === 'partial'
                  ? 'Partially connected (missing tables)'
                  : currentStatus === 'unverified'
                  ? 'Could not verify status'
                  : 'Data not connected'}
              </span>
            </div>

            {currentStatus !== 'connected' && (
              <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                {getReasonExplanation()}
              </p>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-border/80 font-mono text-[11px]">
              <div>
                <span className="text-text-faint text-[9.5px] uppercase tracking-wider block">
                  Tables Found
                </span>
                <span className="font-semibold text-text">
                  {health ? `${health.tablesFound} / ${health.tablesExpected}` : '0 / 10'}
                </span>
              </div>
              <div>
                <span className="text-text-faint text-[9.5px] uppercase tracking-wider block">
                  Latency
                </span>
                <span className="font-semibold text-text">
                  {health && currentStatus === 'connected' ? `${health.latencyMs} ms` : '—'}
                </span>
              </div>
              <div>
                <span className="text-text-faint text-[9.5px] uppercase tracking-wider block">
                  Engine
                </span>
                <span className="text-text truncate block">{health?.engine || 'SQLite'}</span>
              </div>
              <div>
                <span className="text-text-faint text-[9.5px] uppercase tracking-wider block">
                  Last Checked
                </span>
                <span className="text-text tabular-nums whitespace-nowrap block">
                  {health?.checkedAt || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* 10-Table Live Checklist */}
          <div className="space-y-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-faint block">
              CANONICAL ERD TABLES ({health?.tablesFound || 0}/10)
            </span>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-surface-2/30 p-1.5 space-y-1">
              {health?.tables && health.tables.length > 0 ? (
                health.tables.map((t) => (
                  <div
                    key={t.name}
                    className="flex items-center justify-between px-2 py-1 rounded bg-surface-1/60 text-[11px] font-mono"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {t.exists ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-3 h-3 text-rose-500 shrink-0" />
                      )}
                      <span className="font-medium text-text truncate">{t.name}</span>
                    </div>
                    <span className="text-text-muted tabular-nums shrink-0">
                      {t.exists ? `${t.rows} rows` : 'missing'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-text-muted text-xs">
                  {currentStatus === 'unverified'
                    ? 'Log in to view live table records.'
                    : 'No table information available.'}
                </div>
              )}
            </div>
          </div>

          {/* Explanatory Footer Note & Data Model Link */}
          <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between gap-2 text-[10.5px]">
            <div className="flex items-center gap-1.5 text-text-muted min-w-0">
              <Info className="w-3.5 h-3.5 text-text-faint shrink-0" />
              <span className="truncate">Live tables</span>
            </div>
            <Link
              href="/data-model"
              onClick={() => setIsOpen(false)}
              className="font-mono text-[10.5px] font-semibold text-accent hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>View data model</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
