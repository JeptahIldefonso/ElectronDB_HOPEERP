'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, AlertCircle, Loader2 } from 'lucide-react';
import { updateJobHistoryAction } from '@/app/actions/employees';
import type { JobHistoryRecord, DepartmentItem } from '@/lib/data/employees';

interface EditJobHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: JobHistoryRecord;
  departments: DepartmentItem[];
}

export function EditJobHistoryModal({
  isOpen,
  onClose,
  record,
  departments,
}: EditJobHistoryModalProps) {
  const router = useRouter();

  const [deptCode, setDeptCode] = useState(record.deptCode || departments[0]?.deptCode || '');
  const [salary, setSalary] = useState(String(record.salary || ''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const salNum = parseFloat(salary);
    if (isNaN(salNum) || salNum <= 0) {
      setError('Salary must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateJobHistoryAction({
        empNo: record.empNo,
        jobCode: record.jobCode,
        effDate: record.effDate,
        salary: salNum,
        deptCode,
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
      setError('Failed to update job history record.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden font-sans">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
              Edit Job History
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {record.empNo} &bull; {record.jobDesc} &bull; {record.effDate}
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
                Effective Date
              </label>
              <input
                type="text"
                disabled
                value={record.effDate}
                className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-850 px-3 py-1.5 text-xs text-slate-500 font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Job Position
              </label>
              <input
                type="text"
                disabled
                value={`${record.jobCode} — ${record.jobDesc}`}
                className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-850 px-3 py-1.5 text-xs text-slate-500 cursor-not-allowed truncate"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Department <span className="text-rose-500">*</span>
            </label>
            <select
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none"
            >
              {departments.filter((d) => !d.isDeleted).map((d) => (
                <option key={d.deptCode} value={d.deptCode}>
                  {d.deptCode} — {d.deptName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Monthly Salary (PHP) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-7 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none"
              />
            </div>
          </div>

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
              <span>Update Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
