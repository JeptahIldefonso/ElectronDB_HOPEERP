'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SalesSearchInputProps {
  /** Current committed query (source of truth lives in SalesMainView). */
  query: string;
  /** Called (debounced) when the user stops typing. */
  onQueryChange: (q: string) => void;
  /** Resets pagination to page 1 after a new search. */
  resetPage: () => void;
}

/**
 * Isolated search input for the Sales page adhering to PERFORMANCE.md §4.
 *
 * Owns ONLY local visual state so every keystroke renders in <16 ms.
 * Debounces the committed callback (300 ms) so filtering runs only once the user pauses.
 * Uses stable refs to prevent unwanted re-executions when parent re-renders.
 */
export function SalesSearchInput({ query, onQueryChange, resetPage }: SalesSearchInputProps) {
  const [local, setLocal] = useState(query);
  const onQueryChangeRef = useRef(onQueryChange);
  const resetPageRef = useRef(resetPage);

  useEffect(() => {
    onQueryChangeRef.current = onQueryChange;
    resetPageRef.current = resetPage;
  });

  // Debounce: notify parent 300 ms after the user stops typing
  useEffect(() => {
    if (local === query) return;
    const handler = setTimeout(() => {
      onQueryChangeRef.current(local);
      resetPageRef.current();
    }, 300);
    return () => clearTimeout(handler);
  }, [local, query]);

  // If the parent resets the query externally, keep local in sync
  useEffect(() => {
    setLocal(query);
  }, [query]);

  // Shallow URL sync without full navigation overhead
  useEffect(() => {
    const url = new URL(window.location.href);
    if (local) {
      url.searchParams.set('q', local);
    } else {
      url.searchParams.delete('q');
    }
    window.history.replaceState(null, '', url.toString());
  }, [local]);

  const handleClear = () => {
    setLocal('');
    onQueryChangeRef.current('');
    resetPageRef.current();
  };

  return (
    <div className="relative w-full max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder="Search sales..."
        aria-label="Search sales"
        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-8 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none transition-all"
      />
      {local && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
