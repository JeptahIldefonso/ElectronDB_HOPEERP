'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { correctPriceAction } from '@/app/actions/products';
import { formatPHP } from '@/lib/utils';
import { AlertCircle, Info } from 'lucide-react';

interface CorrectPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  prodCode: string;
  description: string;
  unit: string;
  currentPrice: number;
  effDate: string;
}

export function CorrectPriceModal({
  isOpen,
  onClose,
  prodCode,
  description,
  unit,
  currentPrice,
  effDate,
}: CorrectPriceModalProps) {
  const router = useRouter();

  const [unitPrice, setUnitPrice] = useState(String(currentPrice));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedPrice = parseFloat(unitPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMsg('Unit price must be greater than zero.');
      return;
    }

    if (Math.abs(parsedPrice - currentPrice) < 0.001) {
      setErrorMsg('The price has not been changed.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await correctPriceAction({
        prodCode,
        unitPrice: parsedPrice,
      });

      if (result.error) {
        setErrorMsg(result.error);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onClose();
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to correct price.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Correct Price"
      description={`Fix typing mistake on the latest price record of ${prodCode}.`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-md border border-[#FDECEA] bg-[#FDECEA]/60 p-3 text-xs text-[#B42318]">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#B42318]" />
            <p className="leading-snug">{errorMsg}</p>
          </div>
        )}

        <div className="rounded-md border border-[#DDE3DE] bg-[#FAFBFA] p-3 space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-[#17231F]">
            <Info className="h-3.5 w-3.5 text-[#52615B]" />
            <span>Record dated {effDate}</span>
          </div>
          <p className="text-[#52615B] text-[11px] leading-relaxed">
            Use this only to fix a typing mistake. Once a sale uses this price it can no longer be changed.
          </p>
        </div>

        {/* Existing price overview */}
        <div className="rounded-md border border-[#DDE3DE] bg-white p-3 space-y-0.5">
          <div className="text-[11px] text-[#52615B]">Current recorded price:</div>
          <div className="text-sm font-bold tabular-nums text-[#17231F] font-mono">
            {formatPHP(currentPrice)} / {unit}
          </div>
          <div className="text-xs text-[#52615B] truncate">{description}</div>
        </div>

        {/* Corrected Unit Price */}
        <div>
          <label className="block text-xs font-semibold text-[#17231F] mb-1">
            Corrected unit price (₱ / {unit})
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            className="w-full rounded-md border border-[#CCD5CD] bg-white px-3 py-2 text-xs tabular-nums text-[#17231F] focus:border-[#245B48] focus:outline-none focus:ring-1 focus:ring-[#245B48]/30 transition-all font-mono"
            required
            autoFocus
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDE3DE]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Correct price'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
