'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Users, ShoppingCart, Package, Loader2, ArrowRight, Receipt } from 'lucide-react';
import { searchGlobalAction } from '@/app/actions/search';
import type { GlobalSearchResult } from '@/lib/data/search';

export function GlobalSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K or /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.key === 'k') ||
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search with race-condition prevention
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let isCurrent = true;

    const timer = setTimeout(async () => {
      try {
        const data = await searchGlobalAction(query);
        if (isCurrent) {
          setResults(data);
          setIsOpen(true);
        }
      } catch (err) {
        if (isCurrent) {
          console.error('Search error:', err);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [query]);

  const handleSelect = (url: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      handleSelect(results[0].url);
    }
  };

  const customers = results.filter((r) => r.type === 'customer');
  const receipts = results.filter((r) => r.type === 'receipt');
  const sales = results.filter((r) => r.type === 'sale');
  const products = results.filter((r) => r.type === 'product');

  return (
    <div ref={containerRef} className="relative w-72 sm:w-80 md:w-96 lg:w-[440px] font-sans">
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-3.5 w-3.5 text-text-faint pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim() || results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search records, customers, sales..."
          className="w-full h-8 pl-8 pr-16 text-xs bg-surface-1 text-text placeholder:text-text-muted/60 rounded-[2px] border border-border focus:border-border-strong focus:ring-1 focus:ring-accent-soft transition-all outline-none"
        />

        {/* Keyboard cue pill */}
        <div className="absolute right-2.5 flex items-center gap-1 pointer-events-none select-none">
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 text-text-faint animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setIsOpen(false);
              }}
              className="p-0.5 text-text-faint hover:text-text rounded pointer-events-auto"
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block font-mono text-[9px] text-text-muted border border-border bg-surface-2 px-1.5 py-0.5 rounded-[2px]">
              Ctrl+K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown Results */}
      {isOpen && query.trim() && (
        <div className="absolute top-full left-0 mt-1.5 w-full min-w-[320px] bg-surface-1 rounded-[4px] border border-border shadow-md overflow-hidden z-50 max-h-96 overflow-y-auto">
          {isLoading && results.length === 0 ? (
            <div className="py-6 text-center font-mono text-xs text-text-muted">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2 text-text" />
              Searching archive...
            </div>
          ) : results.length === 0 ? (
            <div className="py-6 px-4 text-center font-mono text-xs text-text-muted">
              No archive records matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="divide-y divide-border p-1">
              {/* Customers Group */}
              {customers.length > 0 && (
                <div className="p-1">
                  <div className="px-2 py-1 font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="h-3 w-3 text-text" /> Customers
                  </div>
                  {customers.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onClick={() => handleSelect(item.url)}
                      className="w-full text-left px-2.5 py-1.5 rounded-[2px] hover:bg-surface-2 flex items-center justify-between group transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-xs font-semibold text-text truncate">
                          {item.title}
                        </div>
                        <div className="font-mono text-[10px] text-text-muted truncate">{item.subtitle}</div>
                      </div>
                      <ArrowRight className="h-3 w-3 text-text-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Official Receipts Group */}
              {receipts.length > 0 && (
                <div className="p-1">
                  <div className="px-2 py-1 font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="h-3 w-3 text-text" /> Official Receipts
                  </div>
                  {receipts.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onClick={() => handleSelect(item.url)}
                      className="w-full text-left px-2.5 py-1.5 rounded-[2px] hover:bg-surface-2 flex items-center justify-between group transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-xs font-semibold text-text truncate">
                          {item.title}
                        </div>
                        <div className="font-mono text-[10px] text-text-muted truncate">{item.subtitle}</div>
                      </div>
                      <ArrowRight className="h-3 w-3 text-text-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Sales Transactions Group */}
              {sales.length > 0 && (
                <div className="p-1">
                  <div className="px-2 py-1 font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingCart className="h-3 w-3 text-text" /> Sales Transactions
                  </div>
                  {sales.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onClick={() => handleSelect(item.url)}
                      className="w-full text-left px-2.5 py-1.5 rounded-[2px] hover:bg-surface-2 flex items-center justify-between group transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-xs font-semibold text-text truncate">
                          {item.title}
                        </div>
                        <div className="font-mono text-[10px] text-text-muted truncate">{item.subtitle}</div>
                      </div>
                      <ArrowRight className="h-3 w-3 text-text-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Products Group */}
              {products.length > 0 && (
                <div className="p-1">
                  <div className="px-2 py-1 font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="h-3 w-3 text-text" /> Products
                  </div>
                  {products.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onClick={() => handleSelect(item.url)}
                      className="w-full text-left px-2.5 py-1.5 rounded-[2px] hover:bg-surface-2 flex items-center justify-between group transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="text-xs font-semibold text-text truncate">
                          {item.title}
                        </div>
                        <div className="font-mono text-[10px] text-text-muted truncate">{item.subtitle}</div>
                      </div>
                      <ArrowRight className="h-3 w-3 text-text-faint opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
