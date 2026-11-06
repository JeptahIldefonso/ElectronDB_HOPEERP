'use client';

import React, { useState, useTransition } from 'react';
import { X, Loader2, DollarSign, Calendar, FileText } from 'lucide-react';
import { recordPaymentAction } from '@/app/actions/payments';
import type { SaleForPaymentOption } from '@/lib/data/payments';
import { formatPHP } from '@/lib/utils';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  salesList: SaleForPaymentOption[];
  nextOrPreview?: number;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  onSuccess,
  salesList,
  nextOrPreview = 166,
}: RecordPaymentModalProps) {
  const [selectedTransNo, setSelectedTransNo] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Selected sale details
  const selectedSale = salesList.find((s) => String(s.transNo) === selectedTransNo);

  const handleSaleChange = (transNo: string) => {
    setSelectedTransNo(transNo);
    const sale = salesList.find((s) => String(s.transNo) === transNo);
    if (sale) {
      // Default to remaining balance
      setAmount(sale.balance > 0 ? sale.balance.toFixed(2) : '0.00');
    } else {
      setAmount('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedTransNo) {
      setError('Please select a sales transaction to pay.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    if (selectedSale && numAmount > selectedSale.balance + 0.001) {
      setError(
        `Payment cannot exceed outstanding balance of ${formatPHP(selectedSale.balance)}.`
      );
      return;
    }

    if (!payDate) {
      setError('Please select a payment date.');
      return;
    }

    startTransition(async () => {
      const res = await recordPaymentAction({
        transNo: selectedTransNo,
        amount: numAmount,
        payDate,
      });

      if (res.error) {
        setError(res.error);
      } else {
        onSuccess();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#001A2B] text-white flex items-center justify-center shadow-xs">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Record Official Payment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                OR #{`OR${String(nextOrPreview).padStart(6, '0')}`} (Auto-generated)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Sales Transaction Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
              Sales Transaction <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedTransNo}
              onChange={(e) => handleSaleChange(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none transition-all cursor-pointer font-mono"
              required
            >
              <option value="">Select a sale transaction...</option>
              {salesList.map((s) => (
                <option key={s.transNo} value={s.transNo}>
                  #{s.transNo} — {s.custName} ({formatPHP(s.totalAmount)}) — Due: {formatPHP(s.balance)}
                </option>
              ))}
            </select>
          </div>

          {/* Sale Summary Banner when selected */}
          {selectedSale && (
            <div className="p-3.5 rounded-lg border border-[#041a24]/15 dark:border-slate-800 bg-[#041a24]/5 dark:bg-slate-800/50 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {selectedSale.custName}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="text-slate-500">Sales Date:</span>
                <span className="font-mono">{selectedSale.salesDate}</span>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="text-slate-500">Total Sale Amount:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {formatPHP(selectedSale.totalAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="text-slate-500">Already Paid:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  {formatPHP(selectedSale.alreadyPaid)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#041a24]/15 dark:border-slate-700 font-semibold text-slate-900 dark:text-slate-100">
                <span>Outstanding Balance:</span>
                <span className="font-mono text-rose-600 dark:text-rose-400">
                  {formatPHP(selectedSale.balance)}
                </span>
              </div>
            </div>
          )}

          {/* Payment Date */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
              Payment Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none transition-all font-mono"
                required
              />
            </div>
          </div>

          {/* Payment Amount */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono uppercase tracking-wider">
              Payment Amount (PHP ₱) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-8 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none transition-all font-mono font-semibold"
                required
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 text-xs font-medium rounded-md bg-[#001A2B] hover:bg-[#00263E] text-white shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Record Payment &amp; Issue OR</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
