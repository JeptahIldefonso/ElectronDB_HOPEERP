'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { isDemoReadOnly } from '@/lib/is-readonly';
import { addProductAction } from '@/app/actions/products';
import { X, PackagePlus, AlertCircle } from 'lucide-react';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextSuggestedProdCode?: string;
}

const PERMITTED_UNITS = [
  { value: 'pc', label: 'pc (Piece)' },
  { value: 'ea', label: 'ea (Each)' },
  { value: 'mtr', label: 'mtr (Meter)' },
  { value: 'pkg', label: 'pkg (Package)' },
  { value: 'ltr', label: 'ltr (Liter)' },
];

export function AddProductModal({
  isOpen,
  onClose,
  nextSuggestedProdCode = 'P-006',
}: AddProductModalProps) {
  const router = useRouter();

  const getTodayManila = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

  const [prodCode, setProdCode] = useState(nextSuggestedProdCode);
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState<'pc' | 'ea' | 'mtr' | 'pkg' | 'ltr'>('pc');
  const [initialPrice, setInitialPrice] = useState('');
  const [effDate, setEffDate] = useState(getTodayManila());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setProdCode(nextSuggestedProdCode);
      setDescription('');
      setUnit('pc');
      setInitialPrice('');
      setEffDate(getTodayManila());
      setErrorMsg(null);
    }
  }, [isOpen, nextSuggestedProdCode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCode = prodCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Product code is required.');
      return;
    }
    if (cleanCode.length > 6) {
      setErrorMsg('Product code cannot exceed 6 characters (Schema limit: VARCHAR(6)).');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Product description is required.');
      return;
    }
    if (description.trim().length > 30) {
      setErrorMsg('Description cannot exceed 30 characters (Schema limit: VARCHAR(30)).');
      return;
    }

    let parsedPrice: number | undefined;
    if (initialPrice.trim()) {
      parsedPrice = parseFloat(initialPrice);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        setErrorMsg('Initial price must be a positive number greater than 0.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await addProductAction({
        prodCode: cleanCode,
        description: description.trim(),
        unit,
        initialPrice: parsedPrice,
        effDate: parsedPrice ? effDate : undefined,
      });

      if (result.error) {
        setErrorMsg(result.error);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onClose();
      router.refresh();
    } catch {
      setErrorMsg('An unexpected error occurred while creating product.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
      <div
        className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-5"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <PackagePlus className="h-4 w-4 text-[#041a24] dark:text-slate-200" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Add Product
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-md border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          {/* Product Code */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-slate-800 dark:text-slate-200">
                Product Code <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Max 6 chars (PK)</span>
            </div>
            <input
              type="text"
              required
              maxLength={6}
              value={prodCode}
              onChange={(e) => setProdCode(e.target.value.toUpperCase())}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono uppercase text-slate-900 dark:text-slate-100 focus:border-[#041a24] focus:ring-1 focus:ring-[#041a24]/30 focus:outline-none transition-all"
              placeholder="e.g. P-006 or AD0005"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-slate-800 dark:text-slate-200">
                Description <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[10px] font-mono ${description.length >= 30 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                {description.length}/30
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={30}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-[#041a24] focus:ring-1 focus:ring-[#041a24]/30 focus:outline-none transition-all"
              placeholder="e.g. Industrial Widget A"
            />
          </div>

          {/* Unit of Measurement */}
          <div className="space-y-1">
            <label className="block font-semibold text-slate-800 dark:text-slate-200">
              Unit of Measurement <span className="text-rose-500">*</span>
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as any)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-[#041a24] focus:ring-1 focus:ring-[#041a24]/30 focus:outline-none transition-all"
            >
              {PERMITTED_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Enforced by database check constraint: unit IN (&apos;pc&apos;, &apos;ea&apos;, &apos;mtr&apos;, &apos;pkg&apos;, &apos;ltr&apos;).
            </p>
          </div>

          {/* Optional Initial Price & Effective Date */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <label className="block font-semibold text-slate-800 dark:text-slate-200">
                Initial Price (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={initialPrice}
                onChange={(e) => setInitialPrice(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-mono"
                placeholder="e.g. 13.75"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-slate-800 dark:text-slate-200">
                Effective Date
              </label>
              <input
                type="date"
                disabled={!initialPrice}
                value={effDate}
                onChange={(e) => setEffDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-[#001A2B] hover:bg-[#00263E] text-white transition-colors"
            >
              {isSubmitting ? 'Saving...' : isDemoReadOnly() ? 'Add Product (Read-Only Demo)' : 'Add Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
