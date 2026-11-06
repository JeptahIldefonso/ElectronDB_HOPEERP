'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface SalesSearchInputProps {
  /** Current committed query (source of truth lives in SalesMainView). */
  query: string;
  /** Called (debounced) when the user stops typing. */
  onQueryChange: (q: string) => void;
  /** Resets pagination to page 1 after a new search. */
  resetPage: () => void;
}

/**
 * Isolated search input for the Sales page.
 *
 * Owns ONLY local visual state so every keystroke renders in <16 ms.
 * Debounces the committed callback (300 ms) so the parent's useDeferredValue
 * filter runs only once the user pauses. Never defers internally.
 */
export function SalesSearchInput({ query, onQueryChange, resetPage }: SalesSearchInputProps) {
  const [local, setLocal] = useState(query);

  // Debounce: notify parent 300 ms after the user stops typing.
  useEffect(() => {
    const handler = setTimeout(() => {
      onQueryChange(local);
      resetPage();
    }, 300);
    return () => clearTimeout(handler);
  }, [local, onQueryChange, resetPage]);

  // If the parent resets the query externally, keep local in sync.
  useEffect(() => {
    setLocal(query);
  }, [query]);

  // Shallow URL sync — zero server round-trips.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (local) {
      url.searchParams.set('q', local);
    } else {
      url.searchParams.delete('q');
    }
    window.history.replaceState(null, '', url.toString());
  }, [local]);

  return (
    <div className="relative w-full max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder="Search sales..."
        className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none transition-all"
      />
    </div>
  );
}
