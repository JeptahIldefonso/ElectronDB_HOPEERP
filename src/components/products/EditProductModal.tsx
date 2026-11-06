'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { updateProductAction } from '@/app/actions/products';
import { X, Edit2, AlertCircle, Lock } from 'lucide-react';
import type { ProductItem } from '@/lib/data/products';

export interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: ProductItem;
  prodCode?: string;
  initialDescription?: string;
  initialUnit?: string;
  hasSales?: boolean;
  availableUnits?: string[];
}

const PERMITTED_UNITS = [
  { value: 'pc', label: 'pc (Piece)' },
  { value: 'ea', label: 'ea (Each)' },
  { value: 'mtr', label: 'mtr (Meter)' },
  { value: 'pkg', label: 'pkg (Package)' },
  { value: 'ltr', label: 'ltr (Liter)' },
];

export function EditProductModal({
  isOpen,
  onClose,
  product,
  prodCode: propCode,
  initialDescription = '',
  initialUnit = 'pc',
}: EditProductModalProps) {
  const router = useRouter();

  const code = product?.prodCode || propCode || '';
  const [description, setDescription] = useState(product?.description || initialDescription);
  const [unit, setUnit] = useState(product?.unit || initialUnit);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDescription(product?.description || initialDescription);
      setUnit(product?.unit || initialUnit || 'pc');
      setErrorMsg(null);
    }
  }, [isOpen, product, initialDescription, initialUnit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!description.trim()) {
      setErrorMsg('Product description is required.');
      return;
    }
    if (description.trim().length > 30) {
      setErrorMsg('Description cannot exceed 30 characters (Schema limit: VARCHAR(30)).');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateProductAction({
        prodCode: code,
        description: description.trim(),
        unit: unit as any,
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
      setErrorMsg('An unexpected error occurred while updating product.');
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
            <Edit2 className="h-4 w-4 text-[#041a24] dark:text-slate-200" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Edit Product
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
          {/* Product Code (Locked) */}
          <div className="space-y-1">
            <label className="block font-semibold text-slate-800 dark:text-slate-200">
              Product Code (Immutable PK)
            </label>
            <div className="flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>{code}</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Primary key cannot be modified to preserve historical sales and price integrity.
            </p>
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
