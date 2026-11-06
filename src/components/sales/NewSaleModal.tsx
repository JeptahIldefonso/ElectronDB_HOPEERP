'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { createSaleHeaderAction } from '@/app/actions/sales';
import type { SalesLookupData } from '@/lib/data/sales';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextSuggestedTransNo?: string;
  lookups: SalesLookupData;
}

export function NewSaleModal({
  isOpen,
  onClose,
  nextSuggestedTransNo = 'TR000125',
  lookups,
}: NewSaleModalProps) {
  const router = useRouter();

  const [salesDate, setSalesDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [custNo, setCustNo] = useState(lookups.customers[0]?.custNo || '');
  const [empNo, setEmpNo] = useState(lookups.employees[0]?.empNo || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!custNo) {
      setError('Please select a customer.');
      return;
    }

    if (!empNo) {
      setError('Please select a salesperson (employee).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createSaleHeaderAction({
        salesDate,
        custNo,
        empNo,
      });

      if (res.error) {
        setError(res.error);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onClose();
      router.refresh();
    } catch {
      setError('Failed to create sale transaction.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FCFAF6] dark:bg-slate-900 shadow-2xl overflow-hidden font-sans">
        {/* Header matching Figure 24 */}
        <div className="flex items-start justify-between border-b border-slate-200/70 dark:border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              New Sale
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Transaction header
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body matching Figure 24 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Transaction No.
            </label>
            <input
              type="text"
              disabled
              value={nextSuggestedTransNo}
              className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-850 px-3 py-1.5 text-xs text-slate-500 font-mono cursor-not-allowed"
            />
            <span className="text-[10px] text-slate-400">
              Auto-numbered sequence (referential rule: non-editable)
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Sales Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={salesDate}
              onChange={(e) => setSalesDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Customer <span className="text-rose-500">*</span>
            </label>
            <select
              value={custNo}
              onChange={(e) => setCustNo(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none"
            >
              {lookups.customers.map((c) => (
                <option key={c.custNo} value={c.custNo}>
                  {c.custNo} &mdash; {c.custName}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400">
              Foreign key populated from CUSTOMER table
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Employee (Salesperson) <span className="text-rose-500">*</span>
            </label>
            <select
              value={empNo}
              onChange={(e) => setEmpNo(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none"
            >
              {lookups.employees.map((e) => (
                <option key={e.empNo} value={e.empNo}>
                  {e.empNo} &mdash; {e.fullName}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400">
              Foreign key populated from EMPLOYEE table
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200/70 dark:border-slate-800 pt-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-[#001A2B] hover:bg-[#00263E] text-white shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Save Sale</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
