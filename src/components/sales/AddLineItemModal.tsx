'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { addLineItemAction } from '@/app/actions/sales';
import { formatPHP } from '@/lib/utils';
import type { ProductLookupItem } from '@/lib/data/sales';

interface AddLineItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  transNo: string;
  salesDate: string;
  products: ProductLookupItem[];
}

export function AddLineItemModal({
  isOpen,
  onClose,
  transNo,
  products,
}: AddLineItemModalProps) {
  const router = useRouter();

  const [prodCode, setProdCode] = useState(products[0]?.prodCode || '');
  const [quantity, setQuantity] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedProd = products.find((p) => p.prodCode === prodCode) || products[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qtyNum = parseInt(quantity, 10);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Quantity must be an integer greater than zero.');
      return;
    }

    if (!prodCode) {
      setError('Please select a product.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addLineItemAction({
        transNo,
        prodCode,
        quantity: qtyNum,
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
      setError('Failed to add line item to sale.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FCFAF6] dark:bg-slate-900 shadow-2xl overflow-hidden font-sans">
        <div className="flex items-start justify-between border-b border-slate-200/70 dark:border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Add Line Item
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sale {transNo}
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Product <span className="text-rose-500">*</span>
            </label>
            <select
              value={prodCode}
              onChange={(e) => setProdCode(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none"
            >
              {products.map((p) => (
                <option key={p.prodCode} value={p.prodCode}>
                  {p.prodCode} &mdash; {p.description} ({formatPHP(p.currentPrice)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Quantity <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="99999"
              step="1"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none"
            />
          </div>

          {selectedProd && (
            <div className="p-3 rounded-lg bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Unit Price:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {formatPHP(selectedProd.currentPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mt-1">
                <span>Estimated Line Total:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {formatPHP(selectedProd.currentPrice * (parseInt(quantity, 10) || 0))}
                </span>
              </div>
            </div>
          )}

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
              <span>Add Line</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
