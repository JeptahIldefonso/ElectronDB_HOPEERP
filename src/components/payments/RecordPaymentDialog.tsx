'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatPHP, formatDate } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  getPaymentFormDataAction,
  recordPaymentAction,
} from '@/app/actions/payments';
import type { SaleForPaymentOption } from '@/lib/data/payments';
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  Printer,
  Search,
  Lock,
} from 'lucide-react';

export interface RecordPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fixedTransNo?: string | number;
  fixedCustNo?: string | number;
  initialSales?: SaleForPaymentOption[];
  initialNextOr?: string | number;
  onSuccess?: (orNo: string | number) => void;
}

export function RecordPaymentDialog({
  isOpen,
  onClose,
  fixedTransNo,
  fixedCustNo,
  initialSales,
  initialNextOr,
  onSuccess,
}: RecordPaymentDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [sales, setSales] = useState<SaleForPaymentOption[]>(initialSales || []);
  const [nextOrPreview, setNextOrPreview] = useState<string | number>(initialNextOr || 9050);
  const [loadingOptions, setLoadingOptions] = useState(!initialSales || initialSales.length === 0);

  // Form states
  const [selectedTransNo, setSelectedTransNo] = useState<string | number>(fixedTransNo || 0);
  const [payDate, setPayDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState<string>('');
  const [searchSaleQuery, setSearchSaleQuery] = useState<string>('');

  // Status & Feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReceiptNo, setSuccessReceiptNo] = useState<string | number | null>(null);

  // Fetch or refresh options when dialog opens
  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      setSuccessReceiptNo(null);
      return;
    }

    let isMounted = true;
    async function loadData() {
      setLoadingOptions(true);
      const res = await getPaymentFormDataAction({
        transNo: fixedTransNo,
        custNo: fixedCustNo,
      });

      if (isMounted && !('error' in res)) {
        setSales(res.sales || []);
        if (res.nextOrPreview) setNextOrPreview(res.nextOrPreview);

        // Pre-select if fixed or if single option
        const targetTrans = fixedTransNo || (fixedCustNo && res.sales.length > 0 ? res.sales[0].transNo : res.sales[0]?.transNo || 0);
        setSelectedTransNo(targetTrans);

        const found = res.sales.find((s) => String(s.transNo) === String(targetTrans));
        if (found) {
          setAmount(found.totalAmount.toFixed(2));
        }
      }
      if (isMounted) setLoadingOptions(false);
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, fixedTransNo, fixedCustNo]);

  // Filter sales based on search query
  const filteredSales = useMemo(() => {
    if (fixedTransNo) {
      return sales.filter((s) => String(s.transNo) === String(fixedTransNo));
    }
    let list = sales;
    if (fixedCustNo) {
      list = list.filter((s) => String(s.custNo) === String(fixedCustNo));
    }
    if (searchSaleQuery.trim()) {
      const q = searchSaleQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          String(s.transNo).toLowerCase().includes(q) ||
          s.custName.toLowerCase().includes(q) ||
          String(s.custNo).toLowerCase().includes(q)
      );
    }
    return list;
  }, [sales, fixedTransNo, fixedCustNo, searchSaleQuery]);

  const activeSale = useMemo(() => {
    return sales.find((s) => String(s.transNo) === String(selectedTransNo)) || null;
  }, [sales, selectedTransNo]);

  // Update amount when selected transaction changes
  const handleSaleSelect = (transNo: string | number) => {
    setSelectedTransNo(transNo);
    const s = sales.find((item) => String(item.transNo) === String(transNo));
    if (s) {
      setAmount(s.totalAmount.toFixed(2));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedTransNo || selectedTransNo === 0 || selectedTransNo === '0') {
      setErrorMessage('Please select a valid sales transaction.');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Please enter a positive payment amount.');
      return;
    }

    startTransition(async () => {
      const res = await recordPaymentAction({
        transNo: selectedTransNo,
        amount: numericAmount,
        payDate,
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.success && res.orNo) {
        setSuccessReceiptNo(res.orNo);
        if (onSuccess) {
          onSuccess(res.orNo);
        }
        router.refresh();
      }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment"
      description="Record an official receipt payment linked to a sales transaction."
      maxWidth="md"
    >
      {successReceiptNo ? (
        <div className="py-4 space-y-4 font-sans text-center">
          <div className="w-12 h-12 rounded-full bg-[#EAF2ED] text-[#245B48] mx-auto flex items-center justify-center border border-[#CCD5CD]">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-[#17231F]">Payment Recorded Successfully</h3>
            <p className="text-xs text-[#52615B] mt-1 font-mono">
              Official Receipt OR #{successReceiptNo}
            </p>
          </div>

          <div className="p-3 bg-[#FAFBFA] border border-[#DDE3DE] rounded-md text-xs text-[#52615B] text-left">
            <span>Transaction #{selectedTransNo} payment has been committed to the ledger.</span>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <Link
              href={`/receipts/${successReceiptNo}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#245B48] text-white rounded-md text-xs font-medium hover:bg-[#1C4939] transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official Receipt</span>
            </Link>

            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
          {errorMessage && (
            <div className="rounded-md border border-[#FDECEA] bg-[#FDECEA]/60 p-3 text-xs text-[#B42318] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Sale Field (Searchable, Pre-selected, Locked if fixed) */}
          <div>
            <label className="block text-[11px] font-semibold text-[#17231F] mb-1">
              Sales Transaction <span className="text-rose-600">*</span>
            </label>

            {fixedTransNo ? (
              // Locked when opened from a specific sale
              <div className="rounded-md border border-[#DDE3DE] bg-[#FAFBFA] px-3 py-2 flex items-center justify-between text-xs text-[#17231F]">
                <div>
                  <span className="font-mono font-bold">Sale #{fixedTransNo}</span>
                  {activeSale && (
                    <span className="text-[#52615B] ml-2 font-sans">
                      &bull; {activeSale.custName} ({formatDate(activeSale.salesDate)})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[#52615B] font-mono">
                  <Lock className="w-3 h-3 text-[#52615B]" />
                  <span>Locked</span>
                </div>
              </div>
            ) : (
              // Searchable select when opened from customer or dashboard
              <div className="space-y-1.5">
                {!fixedCustNo && sales.length > 5 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#7A8781]" />
                    <input
                      type="text"
                      placeholder="Search sale # or customer name..."
                      value={searchSaleQuery}
                      onChange={(e) => setSearchSaleQuery(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-[#CCD5CD] bg-white text-[#17231F] placeholder:text-[#A0AAA4] focus:outline-none focus:border-[#245B48] focus:ring-1 focus:ring-[#245B48]/30 transition-all"
                    />
                  </div>
                )}

                <select
                  required
                  value={selectedTransNo}
                  onChange={(e) => handleSaleSelect(e.target.value)}
                  disabled={loadingOptions || filteredSales.length === 0}
                  className="w-full rounded-md border border-[#CCD5CD] bg-white px-3 py-2 text-xs text-[#17231F] focus:border-[#245B48] focus:ring-1 focus:ring-[#245B48]/30 focus:outline-none font-sans transition-all"
                >
                  {filteredSales.length === 0 ? (
                    <option value="0">No eligible sales transactions found</option>
                  ) : (
                    filteredSales.map((s) => (
                      <option key={s.transNo} value={s.transNo}>
                        Sale #{s.transNo} &bull; {s.custName} ({formatDate(s.salesDate)}) &bull; Total: {formatPHP(s.totalAmount)}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {activeSale && (
              <div className="mt-1 text-[11px] text-[#52615B] flex items-center justify-between">
                <span>Customer: {activeSale.custName} (#{activeSale.custNo})</span>
                <span className="font-mono font-medium text-[#17231F]">Sale Total: {formatPHP(activeSale.totalAmount)}</span>
              </div>
            )}
          </div>

          {/* 2. Official Receipt (OR) Number (Read-only preview) */}
          <div>
            <label className="block text-[11px] font-semibold text-[#17231F] mb-1">
              Official Receipt (OR) Number
            </label>
            <div className="rounded-md border border-dashed border-[#CCD5CD] bg-[#FAFBFA] px-3 py-2 text-xs text-[#52615B] font-mono flex items-center justify-between">
              <span className="font-bold text-[#17231F]">OR #{nextOrPreview}</span>
              <span className="text-[10px] text-[#52615B]">Assigned sequentially on save</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 3. Payment Date (default today) */}
            <div>
              <label className="block text-[11px] font-semibold text-[#17231F] mb-1">
                Payment Date <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-md border border-[#CCD5CD] bg-white px-3 py-1.5 text-xs text-[#17231F] focus:border-[#245B48] focus:ring-1 focus:ring-[#245B48]/30 focus:outline-none transition-all"
                />
              </div>
              <p className="text-[10px] text-[#52615B] mt-0.5">
                Cannot precede sale date or be in the future.
              </p>
            </div>

            {/* 4. Payment Amount (pre-filled with sale total) */}
            <div>
              <label className="block text-[11px] font-semibold text-[#17231F] mb-1">
                Payment Amount (PHP) <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-md border border-[#CCD5CD] bg-white px-3 py-1.5 text-xs text-[#17231F] font-mono focus:border-[#245B48] focus:ring-1 focus:ring-[#245B48]/30 focus:outline-none transition-all"
                />
              </div>
              <p className="text-[10px] text-[#52615B] mt-0.5">
                Cannot exceed total sale value.
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDE3DE]">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isPending || !selectedTransNo || selectedTransNo === 0 || selectedTransNo === '0'}
            >
              {isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
