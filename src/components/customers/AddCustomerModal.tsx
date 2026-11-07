'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addCustomerAction } from '@/app/actions/customers';
import { Button } from '@/components/ui/Button';
import { isReadOnly } from '@/lib/is-readonly';
import { X, UserPlus, AlertCircle } from 'lucide-react';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextSuggestedCustNo?: string;
}

export function AddCustomerModal({
  isOpen,
  onClose,
  nextSuggestedCustNo = 'C0083',
}: AddCustomerModalProps) {
  const router = useRouter();

  const [custNo, setCustNo] = useState(nextSuggestedCustNo);
  const [custName, setCustName] = useState('');
  const [address, setAddress] = useState('');
  const [payTerms, setPayTerms] = useState<'COD' | '30D' | '45D'>('30D');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCustNo(nextSuggestedCustNo);
      setCustName('');
      setAddress('');
      setPayTerms('30D');
      setErrorMsg(null);
    }
  }, [isOpen, nextSuggestedCustNo]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCustNo = custNo.trim().toUpperCase();
    if (!cleanCustNo) {
      setErrorMsg('Customer number is required.');
      return;
    }
    if (cleanCustNo.length > 5) {
      setErrorMsg('Customer number cannot exceed 5 characters (Schema limit: VARCHAR(5)).');
      return;
    }

    if (!custName.trim()) {
      setErrorMsg('Customer name is required.');
      return;
    }
    if (custName.trim().length > 20) {
      setErrorMsg('Customer name cannot exceed 20 characters (Schema limit: VARCHAR(20)).');
      return;
    }

    if (!address.trim()) {
      setErrorMsg('Customer address is required.');
      return;
    }
    if (address.trim().length > 50) {
      setErrorMsg('Address cannot exceed 50 characters (Schema limit: VARCHAR(50)).');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addCustomerAction({
        custNo: cleanCustNo,
        custName: custName.trim(),
        address: address.trim(),
        payTerms,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
      <div
        className="w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-5"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-[#041a24] dark:text-slate-200" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Add Customer
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
          {/* Customer Number */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-slate-800 dark:text-slate-200">
                Customer No. <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Max 5 chars (PK)</span>
            </div>
            <input
              type="text"
              required
              maxLength={5}
              value={custNo}
              onChange={(e) => setCustNo(e.target.value.toUpperCase())}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono uppercase text-slate-900 dark:text-slate-100 focus:border-[#041a24] focus:ring-1 focus:ring-[#041a24]/30 focus:outline-none transition-all"
              placeholder="e.g. C0083"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Canonical Hope format: C followed by 4 digits (e.g. C0001 to C0082).
            </p>
          </div>

          {/* Customer Name */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-slate-800 dark:text-slate-200">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[10px] font-mono ${custName.length >= 20 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                {custName.length}/20
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={20}
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-[#041a24] focus:ring-1 focus:ring-[#041a24]/30 focus:outline-none transition-all"
              placeholder="e.g. Acme Corporation"
            />
          </div>

          {/* Address */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-slate-800 dark:text-slate-200">
                Address <span className="text-rose-500">*</span>
              </label>
              <span className={`text-[10px] font-mono ${address.length >= 50 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                {address.length}/50
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={50}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-[#041a24] focus:ring-1 focus:ring-[#041a24]/30 focus:outline-none transition-all"
              placeholder="e.g. 123 Main St, Metro City"
            />
          </div>

          {/* Payment Terms */}
          <div className="space-y-1">
            <label className="block font-semibold text-slate-800 dark:text-slate-200">
              Payment Terms <span className="text-rose-500">*</span>
            </label>
            <select
              value={payTerms}
              onChange={(e) => setPayTerms(e.target.value as any)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-[#041a24] focus:ring-1 focus:ring-[#041a24]/30 focus:outline-none transition-all"
            >
              <option value="30D">Net 30 (30D)</option>
              <option value="45D">Net 45 (45D)</option>
              <option value="COD">Cash on Delivery (COD)</option>
            </select>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Enforced by database check constraint: payterm IN (&apos;COD&apos;, &apos;30D&apos;, &apos;45D&apos;).
            </p>
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
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="bg-[#001A2B] hover:bg-[#00263E] text-white transition-colors"
            >
              {isSubmitting ? 'Saving...' : isReadOnly() ? 'Add Customer (Read-Only)' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
