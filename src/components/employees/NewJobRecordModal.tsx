'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { addJobRecordAction } from '@/app/actions/employees';
import { formatPHP, formatDate } from '@/lib/utils';
import type { DepartmentItem, JobItem } from '@/lib/data/employees';
import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NewJobRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  empNo: number;
  currentAssignment: {
    jobCode: string;
    jobDesc: string;
    deptCode: string;
    deptName: string;
    salary: number | null;
    effDate: string;
  };
  latestSaleDate: string | null;
  departments: DepartmentItem[];
  jobs: JobItem[];
  onSuccess?: () => void;
}

export function NewJobRecordModal({
  isOpen,
  onClose,
  empNo,
  currentAssignment,
  latestSaleDate,
  departments,
  jobs,
  onSuccess,
}: NewJobRecordModalProps) {
  const router = useRouter();
  const getToday = () => new Date().toISOString().slice(0, 10);

  const [jobCode, setJobCode] = useState(jobs[0]?.jobCode || currentAssignment.jobCode);
  const [deptCode, setDeptCode] = useState(departments[0]?.deptCode || currentAssignment.deptCode);
  const [effDate, setEffDate] = useState(getToday());
  const [salary, setSalary] = useState(
    currentAssignment.salary ? String(currentAssignment.salary) : '25000'
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await addJobRecordAction({
        empNo,
        jobCode,
        deptCode,
        effDate,
        salary: Number(salary),
      });

      if (res.error) {
        setErrorMsg(res.error);
        setIsSubmitting(false);
      } else {
        setIsSubmitting(false);
        onClose();
        if (onSuccess) onSuccess();
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to add job record.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Job Record"
      description="Record a promotion, transfer, or salary adjustment. This appends a permanent record to JOBHISTORY."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="flex items-start gap-2.5 rounded-md border border-[#FDECEA] bg-[#FDECEA]/60 p-3 text-xs text-[#B42318]">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#B42318] mt-0.5" />
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Current Assignment Reference Block */}
        <div className="bg-[#FAFBFA] border border-[#DDE3DE] rounded-md p-3 text-xs space-y-1">
          <span className="text-[11px] font-semibold text-[#52615B] uppercase tracking-wider block mb-1">
            Current Assignment Reference
          </span>
          <div className="grid grid-cols-2 gap-2 text-[#52615B]">
            <div>
              <span className="text-[#7A8781]">Position:</span>{' '}
              <span className="font-medium text-[#17231F]">{currentAssignment.jobDesc}</span>
            </div>
            <div>
              <span className="text-[#7A8781]">Department:</span>{' '}
              <span className="font-medium text-[#17231F]">{currentAssignment.deptName}</span>
            </div>
            <div>
              <span className="text-[#7A8781]">Current Salary:</span>{' '}
              <span className="font-mono font-medium text-[#17231F]">
                {currentAssignment.salary != null ? formatPHP(currentAssignment.salary) : '—'}
              </span>
            </div>
            <div>
              <span className="text-[#7A8781]">Effective Date:</span>{' '}
              <span className="font-mono text-[#17231F]">{formatDate(currentAssignment.effDate)}</span>
            </div>
          </div>
          {latestSaleDate && (
            <p className="text-[11px] text-[#956316] mt-1 pt-1 border-t border-[#DDE3DE]">
              * Employee has sales dated up to {formatDate(latestSaleDate)}. The effective date must be after this date to preserve historic departmental revenue attribution.
            </p>
          )}
        </div>

        {/* Form Fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[#17231F] mb-1">
              New Job Position <span className="text-red-500">*</span>
            </label>
            <select
              value={jobCode}
              onChange={(e) => setJobCode(e.target.value)}
              className="w-full h-9 rounded-md border border-[#CCD5CD] px-3 text-xs text-[#17231F] bg-white focus:outline-none focus:border-[#245B48] focus:ring-1 focus:ring-[#245B48]/30 transition-all"
            >
              {jobs.map((j) => (
                <option key={j.jobCode} value={j.jobCode}>
                  {j.jobDesc} ({j.jobCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#17231F] mb-1">
              New Department <span className="text-red-500">*</span>
            </label>
            <select
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value)}
              className="w-full h-9 rounded-md border border-[#CCD5CD] px-3 text-xs text-[#17231F] bg-white focus:outline-none focus:border-[#245B48] focus:ring-1 focus:ring-[#245B48]/30 transition-all"
            >
              {departments.map((d) => (
                <option key={d.deptCode} value={d.deptCode}>
                  {d.deptName} ({d.deptCode})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#17231F] mb-1">
                Effective Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={effDate}
                onChange={(e) => setEffDate(e.target.value)}
                className="w-full h-9 rounded-md border border-[#CCD5CD] px-3 text-xs text-[#17231F] focus:outline-none focus:border-[#245B48] focus:ring-1 focus:ring-[#245B48]/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#17231F] mb-1">
                Salary (PHP) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="30000.00"
                className="w-full h-9 rounded-md border border-[#CCD5CD] px-3 text-xs font-mono text-[#17231F] focus:outline-none focus:border-[#245B48] focus:ring-1 focus:ring-[#245B48]/30 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DDE3DE]">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            {isSubmitting ? 'Recording...' : 'Add Job Record'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
