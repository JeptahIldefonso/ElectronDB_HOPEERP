'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { BRAND } from '@/lib/brand';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Application Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="rounded-2xl border border-red-200 bg-red-50/70 p-8 shadow-sm dark:border-red-900/50 dark:bg-red-950/30 max-w-md w-full space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
          <AlertCircle className="h-6 w-6" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            System Notice
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {error.message || 'An unexpected error occurred while processing this request.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => reset()}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </Button>

          <Link href="/">
            <Button type="button" variant="primary" size="sm" className="flex items-center gap-1.5">
              <Home className="h-3.5 w-3.5" />
              Home
            </Button>
          </Link>
        </div>

        <div className="text-[10px] text-slate-400 pt-2 border-t border-red-200/50 dark:border-red-900/40">
          {BRAND.name} • Error Digest: {error.digest || 'local-fallback'}
        </div>
      </div>
    </div>
  );
}
