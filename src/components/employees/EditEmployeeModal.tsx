'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { updateEmployeeAction } from '@/app/actions/employees';
import type { EmployeeItem } from '@/lib/data/employees';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: {
    empNo: string | number;
    lastName: string;
    firstName: string;
    gender: string;
    birthDate: string;
    hireDate: string;
    sepDate?: string | null;
  };
}

export function EditEmployeeModal({
  isOpen,
  onClose,
  employee,
}: EditEmployeeModalProps) {
  const router = useRouter();

  const [lastName, setLastName] = useState(employee.lastName);
  const [firstName, setFirstName] = useState(employee.firstName);
  const [gender, setGender] = useState<'M' | 'F'>(employee.gender === 'F' ? 'F' : 'M');
  const [birthDate, setBirthDate] = useState(employee.birthDate);
  const [hireDate, setHireDate] = useState(employee.hireDate);
  const [sepDate, setSepDate] = useState(employee.sepDate || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await updateEmployeeAction({
        empNo: String(employee.empNo),
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        gender,
        birthDate,
        hireDate,
        sepDate: sepDate.trim() ? sepDate.trim() : null,
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
      setError('An unexpected error occurred while updating employee.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
              Edit Employee — {employee.empNo}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Update personal information and status
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={15}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={15}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Gender <span className="text-rose-500">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'M' | 'F')}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none"
              >
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Birth Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Hire Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Separation Date (Leave empty if still currently employed)
            </label>
            <input
              type="date"
              value={sepDate}
              onChange={(e) => setSepDate(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Setting a separation date will transition this employee status to Inactive.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-2">
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
              <span>Update Employee</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
