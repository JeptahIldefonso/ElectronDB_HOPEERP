'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { addNewPriceAction } from '@/app/actions/products';
import { formatPHP } from '@/lib/utils';
import { formatPriceChange } from '@/lib/products';
import { AlertCircle, AlertTriangle } from 'lucide-react';

interface NewPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  prodCode: string;
  description: string;
  unit: string;
  currentPrice: number | null;
  latestEffDate: string | null;
}

export function NewPriceModal({
  isOpen,
  onClose,
  prodCode,
  description,
  unit,
  currentPrice,
  latestEffDate,
}: NewPriceModalProps) {
  const router = useRouter();

  const getTodayManila = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  };

  const [unitPrice, setUnitPrice] = useState('');
  const [effDate, setEffDate] = useState(getTodayManila());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedLargeChange, setConfirmedLargeChange] = useState(false);

  const parsedPrice = parseFloat(unitPrice);
  const hasValidPrice = !isNaN(parsedPrice) && parsedPrice > 0;

  // Live change calculation
  const changeCalc = hasValidPrice && currentPrice !== null
    ? formatPriceChange(parsedPrice, currentPrice)
    : null;

  // Check if price change exceeds 50%
  const isLargeChange = changeCalc?.percent !== null && (changeCalc?.percent ?? 0) > 50;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!hasValidPrice) {
      setErrorMsg('Unit price must be greater than zero.');
      return;
    }

    if (isLargeChange && !confirmedLargeChange) {
      setErrorMsg('Please confirm the significant price change before saving.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addNewPriceAction({
        prodCode,
        unitPrice: parsedPrice,
        effDate,
      });

      if (result.error) {
        setErrorMsg(result.error);
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onClose();
      setUnitPrice('');
      setConfirmedLargeChange(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record new price.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Price Record"
      description={`Record an effective price change for ${prodCode}.`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-md border border-[#FDECEA] bg-[#FDECEA]/60 p-3 text-xs text-[#B42318]">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#B42318]" />
            <p className="leading-snug">{errorMsg}</p>
          </div>
        )}

        {/* Current Price Banner */}
        <div className="rounded-md border border-[#DDE3DE] bg-[#FAFBFA] p-3 space-y-1">
          <div className="text-[11px] text-[#52615B] uppercase tracking-wider font-semibold">
            Current Price
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-bold tabular-nums text-[#17231F] font-mono">
              {currentPrice !== null ? `${formatPHP(currentPrice)} / ${unit}` : 'No price record'}
            </span>
            {latestEffDate && (
              <span className="text-[11px] text-[#52615B]">
                Effective since {latestEffDate}
              </span>
            )}
          </div>
          <div className="text-xs text-[#52615B] truncate font-medium pt-1 border-t border-[#E9EDEA]">
            {description}
          </div>
        </div>

        {/* New Unit Price */}
        <div>
          <label className="block text-xs font-semibold text-[#17231F] mb-1">
            New unit price (₱ / {unit})
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={unitPrice}
            onChange={(e) => {
              setUnitPrice(e.target.value);
              setConfirmedLargeChange(false);
            }}
            className="w-full rounded-md border border-[#CCD5CD] bg-white px-3 py-2 text-xs tabular-nums text-[#17231F] focus:border-[#245B48] focus:outline-none focus:ring-1 focus:ring-[#245B48]/30 transition-all font-mono"
            required
            autoFocus
          />
        </div>

        {/* Live Change Preview */}
        {changeCalc && hasValidPrice && (
          <div className="rounded-md border border-[#DDE3DE] bg-white p-2.5 flex items-center justify-between text-xs">
            <span className="text-[#52615B]">Price change:</span>
            <span className="font-semibold tabular-nums text-[#17231F] font-mono">
              {changeCalc.label}
            </span>
          </div>
        )}

        {/* Effective Date */}
        <div>
          <label className="block text-xs font-semibold text-[#17231F] mb-1">
            Effective date
          </label>
          <input
            type="date"
            max={getTodayManila()}
            value={effDate}
            onChange={(e) => setEffDate(e.target.value)}
            className="w-full rounded-md border border-[#CCD5CD] bg-white px-3 py-2 text-xs text-[#17231F] focus:border-[#245B48] focus:outline-none focus:ring-1 focus:ring-[#245B48]/30 transition-all font-mono"
            required
          />
          <p className="mt-1 text-[11px] text-[#52615B]">
            Must be after the latest price record and latest sale date. Cannot be in the future.
          </p>
        </div>

        {/* Large Change Soft Warning */}
        {isLargeChange && (
          <div className="rounded-md border border-[#FBF2DD] bg-[#FBF2DD]/60 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#956316]">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[#956316]" />
              <span>Large price variance detected ({changeCalc?.percent?.toFixed(1)}%)</span>
            </div>
            <label className="flex items-center gap-2 text-xs text-[#17231F] cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedLargeChange}
                onChange={(e) => setConfirmedLargeChange(e.target.checked)}
                className="rounded border-[#CCD5CD] text-[#245B48] focus:ring-[#245B48]"
              />
              <span>I confirm this price is correct</span>
            </label>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDE3DE]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting || (isLargeChange && !confirmedLargeChange)}
          >
            {isSubmitting ? 'Saving...' : 'Record new price'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
