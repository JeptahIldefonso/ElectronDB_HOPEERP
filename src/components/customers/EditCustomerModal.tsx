'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateCustomerAction } from '@/app/actions/customers';
import { Button } from '@/components/ui/Button';
import { X, Edit2, AlertCircle, Lock } from 'lucide-react';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    custNo: string | number;
    custName: string;
    address: string;
    payterm?: string;
    payTerms?: string;
  };
}

export function EditCustomerModal({
  isOpen,
  onClose,
  customer,
}: EditCustomerModalProps) {
  const router = useRouter();

  const [custName, setCustName] = useState(customer.custName);
  const [address, setAddress] = useState(customer.address);
  const [payTerms, setPayTerms] = useState<'COD' | '30D' | '45D'>('30D');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCustName(customer.custName);
      setAddress(customer.address);
      const initialTerm = (customer.payterm || customer.payTerms || '30D').toUpperCase();
      if (initialTerm === 'COD' || initialTerm === '30D' || initialTerm === '45D') {
        setPayTerms(initialTerm);
      } else {
        setPayTerms('30D');
      }
      setErrorMsg(null);
    }
  }, [isOpen, customer]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

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
      const result = await updateCustomerAction({
        custNo: String(customer.custNo),
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
            <Edit2 className="h-4 w-4 text-[#041a24] dark:text-slate-200" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Edit Customer
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
          {/* Customer Number (Immutable) */}
          <div className="space-y-1">
            <label className="block font-semibold text-slate-800 dark:text-slate-200">
              Customer No. (Immutable PK)
            </label>
            <div className="flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 px-3 py-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>{customer.custNo}</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Primary key cannot be modified to preserve relational integrity.
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
