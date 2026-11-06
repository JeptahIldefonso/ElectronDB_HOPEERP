'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { recordCustomerPaymentAction } from '@/app/actions/customers';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { X, Receipt, AlertCircle, Calendar } from 'lucide-react';

interface RecordCustomerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  custNo: string | number;
  custName: string;
  eligibleTransactions: {
    transNo: string | number;
    salesDate: string;
  }[];
}

export function RecordCustomerPaymentModal({
  isOpen,
  onClose,
  custNo,
  custName,
  eligibleTransactions,
}: RecordCustomerPaymentModalProps) {
  const router = useRouter();

  const getTodayManila = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  };

  const [selectedTransNo, setSelectedTransNo] = useState<string | number>(
    eligibleTransactions[0]?.transNo || ''
  );
  const [orNo, setOrNo] = useState('');
  const [amount, setAmount] = useState('');
  const [payDate, setPayDate] = useState(getTodayManila());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (eligibleTransactions.length > 0) {
        setSelectedTransNo(eligibleTransactions[0].transNo);
      }
      setOrNo('');
      setAmount('');
      setPayDate(getTodayManila());
      setErrorMsg(null);
    }
  }, [isOpen, eligibleTransactions]);

  if (!isOpen) return null;

  const currentSelectedSale = eligibleTransactions.find(
    (t) => String(t.transNo) === String(selectedTransNo)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanOr = orNo.trim().toUpperCase();
    if (!cleanOr) {
      setErrorMsg('OR number is required (R-08).');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Payment amount must be greater than zero (R-07).');
      return;
    }

    if (!selectedTransNo || selectedTransNo === 0 || selectedTransNo === '0') {
      setErrorMsg('Please select a valid sales transaction (R-05).');
      return;
    }

    if (currentSelectedSale && payDate < currentSelectedSale.salesDate) {
      setErrorMsg(
        `The payment date must be on or after the sale date (${formatDate(
          currentSelectedSale.salesDate
        )}) (R-06).`
      );
      return;
    }

    const todayManila = getTodayManila();
    if (payDate > todayManila) {
      setErrorMsg('The payment date cannot be in the future (R-06).');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await recordCustomerPaymentAction({
        orNo: cleanOr,
        payDate,
        amount: parsedAmount,
        transNo: selectedTransNo,
        custNo,
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
      setErrorMsg('An unexpected error occurred while saving.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17231F]/50 p-4 backdrop-blur-[2px]">
      <div
        className="w-full max-w-md rounded-lg border border-[#DDE3DE] bg-white p-6 shadow-xl space-y-5"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#DDE3DE] pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[#245B48]" />
            <div>
              <h3 className="text-lg font-semibold text-[#17231F]">
                Record Payment
              </h3>
              <p className="text-[11px] text-[#52615B]">
                {custName} (Customer #{custNo})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#52615B] hover:text-[#17231F] p-1 rounded-md hover:bg-[#F0F3F0] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-md border border-[#FDECEA] bg-[#FDECEA]/60 p-3 text-xs text-[#B42318] flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Linked Transaction Notice */}
        {currentSelectedSale && (
          <div className="rounded-md border border-[#DDE3DE] bg-[#FAFBFA] p-3 text-xs flex items-center gap-2 text-[#17231F]">
            <Calendar className="h-4 w-4 text-[#52615B] shrink-0" />
            <span>
              Sale date: <strong>{formatDate(currentSelectedSale.salesDate)}</strong>. Payment date must be on or after this date.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          {/* Sales Transaction Dropdown */}
          <div className="space-y-1">
            <label className="block font-semibold text-[#17231F]">
              Sales transaction <span className="text-rose-600">*</span>
            </label>
            <select
              required
              value={selectedTransNo}
              onChange={(e) => setSelectedTransNo(e.target.value)}
              className="w-full rounded-md border border-[#CCD5CD] bg-white px-3 py-2 text-xs font-mono text-[#17231F] focus:border-[#245B48] focus:ring-1 focus:ring-[#245B48]/30 focus:outline-none transition-all"
            >
              {eligibleTransactions.map((t) => (
                <option key={t.transNo} value={t.transNo}>
                  Transaction #{t.transNo} &mdash; {formatDate(t.salesDate)}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-[#52615B]">
              Selects the specific sales invoice transaction being paid (R-05).
            </p>
          </div>

          {/* OR Number */}
          <div className="space-y-1">
            <label className="block font-semibold text-[#17231F]">
              OR No. <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              value={orNo}
              onChange={(e) => setOrNo(e.target.value)}
              className="w-full rounded-md border border-[#CCD5CD] bg-white px-3 py-2 text-xs font-mono text-[#17231F] focus:border-[#245B48] focus:ring-1 focus:ring-[#245B48]/30 focus:outline-none transition-all"
              placeholder="e.g. OR000166 or 166"
            />
            <p className="text-[10px] text-[#52615B]">
              Official Receipt number (PAYMENT.ORNo). Unique, immutable once saved (R-08).
            </p>
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <label className="block font-semibold text-[#17231F]">
              Amount (₱) <span className="text-rose-600">*</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border border-[#CCD5CD] bg-white px-3 py-2 text-xs font-mono text-[#17231F] focus:border-[#245B48] focus:ring-1 focus:ring-[#245B48]/30 focus:outline-none transition-all"
              placeholder="0.00"
            />
          </div>

          {/* Payment Date */}
          <div className="space-y-1">
            <label className="block font-semibold text-[#17231F]">
              Payment date <span className="text-rose-600">*</span>
            </label>
            <input
              type="date"
              required
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full rounded-md border border-[#CCD5CD] bg-white px-3 py-2 text-xs font-mono text-[#17231F] focus:border-[#245B48] focus:ring-1 focus:ring-[#245B48]/30 focus:outline-none transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 border-t border-[#DDE3DE] pt-4">
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
              variant="primary"
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
