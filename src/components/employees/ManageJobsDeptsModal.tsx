'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  addDepartmentAction,
  renameDepartmentAction,
  addJobAction,
  renameJobAction,
} from '@/app/actions/employees';
import type { DepartmentItem, JobItem } from '@/lib/data/employees';
import { Building2, Briefcase, Plus, Edit2, Check, X, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ManageJobsDeptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: DepartmentItem[];
  jobs: JobItem[];
  onSuccess?: () => void;
}

export function ManageJobsDeptsModal({
  isOpen,
  onClose,
  departments,
  jobs,
  onSuccess,
}: ManageJobsDeptsModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'departments' | 'jobs'>('departments');

  // Add forms state
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newJobCode, setNewJobCode] = useState('');
  const [newJobDesc, setNewJobDesc] = useState('');

  // Editing state
  const [editingDeptCode, setEditingDeptCode] = useState<string | null>(null);
  const [renameDeptName, setRenameDeptName] = useState('');

  const [editingJobCode, setEditingJobCode] = useState<string | null>(null);
  const [renameJobDesc, setRenameJobDesc] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Department
  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await addDepartmentAction(newDeptCode, newDeptName);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setNewDeptCode('');
        setNewDeptName('');
        if (onSuccess) onSuccess();
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to add department');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rename Department
  const handleRenameDepartment = async (deptCode: string) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await renameDepartmentAction(deptCode, renameDeptName);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setEditingDeptCode(null);
        if (onSuccess) onSuccess();
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to rename department');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Job
  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await addJobAction(newJobCode, newJobDesc);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setNewJobCode('');
        setNewJobDesc('');
        if (onSuccess) onSuccess();
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to add job');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rename Job
  const handleRenameJob = async (jobCode: string) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await renameJobAction(jobCode, renameJobDesc);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setEditingJobCode(null);
        if (onSuccess) onSuccess();
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to rename job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Departments & Jobs"
      description="Manage organizational departments and job classification titles."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="flex items-start gap-2.5 rounded-md border border-[#FDECEA] bg-[#FDECEA]/60 p-3 text-xs text-[#B42318]">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#B42318] mt-0.5" />
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex border-b border-[#DDE3DE]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('departments');
              setErrorMsg(null);
            }}
            className={`flex items-center gap-2 py-2 px-4 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'departments'
                ? 'border-[#245B48] text-[#245B48] font-semibold'
                : 'border-transparent text-[#52615B] hover:text-[#17231F]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Departments ({departments.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('jobs');
              setErrorMsg(null);
            }}
            className={`flex items-center gap-2 py-2 px-4 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'jobs'
                ? 'border-[#245B48] text-[#245B48] font-semibold'
                : 'border-transparent text-[#52615B] hover:text-[#17231F]'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Jobs ({jobs.length})
          </button>
        </div>

        {/* DEPARTMENTS TAB */}
        {activeTab === 'departments' && (
          <div className="space-y-4">
            {/* Add Department Form */}
            <form onSubmit={handleAddDepartment} className="bg-[#FAFBFA] p-3 rounded-md border border-[#DDE3DE] space-y-2">
              <span className="text-xs font-semibold text-[#17231F] block">Add Department</span>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    placeholder="Code (e.g. DEPT-MKT)"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value.toUpperCase())}
                    className="w-full h-8 rounded-md border border-[#CCD5CD] px-2.5 text-xs font-mono text-[#17231F] uppercase focus:outline-none focus:border-[#245B48] focus:ring-1 focus:ring-[#245B48]/30 transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    placeholder="Department Name"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="w-full h-8 rounded-md border border-[#CCD5CD] px-2.5 text-xs text-[#17231F] focus:outline-none focus:border-[#245B48] focus:ring-1 focus:ring-[#245B48]/30 transition-all"
                  />
                </div>
                <div className="sm:col-span-1">
                  <Button type="submit" variant="primary" size="sm" className="w-full h-8" disabled={isSubmitting}>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-[#52615B]">
                Department codes are permanent and cannot be modified or deleted once created.
              </p>
            </form>

            {/* Departments Table */}
            <div className="border border-[#DDE3DE] rounded-md overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFBFA] border-b border-[#DDE3DE] text-[#17231F] font-semibold">
                  <tr>
                    <th className="py-2 px-3 w-28">Code</th>
                    <th className="py-2 px-3">Department Name</th>
                    <th className="py-2 px-3 w-24 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9EDEA]">
                  {departments.map((dept) => (
                    <tr key={dept.deptCode} className="hover:bg-[#F5F6F4]">
                      <td className="py-2 px-3 font-mono font-medium text-[#17231F]">
                        {dept.deptCode}
                      </td>
                      <td className="py-2 px-3 text-[#17231F]">
                        {editingDeptCode === dept.deptCode ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={renameDeptName}
                              onChange={(e) => setRenameDeptName(e.target.value)}
                              className="h-7 px-2 border border-[#245B48] rounded text-xs w-full focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleRenameDepartment(dept.deptCode)}
                              disabled={isSubmitting}
                              className="p-1 text-[#24734D] hover:bg-[#E8F4EC] rounded"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDeptCode(null)}
                              className="p-1 text-[#52615B] hover:bg-[#F0F3F0] rounded"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="font-medium">{dept.deptName}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {editingDeptCode !== dept.deptCode && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[11px]"
                            onClick={() => {
                              setEditingDeptCode(dept.deptCode);
                              setRenameDeptName(dept.deptName);
                            }}
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Rename
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* JOBS TAB */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            {/* Add Job Form */}
            <form onSubmit={handleAddJob} className="bg-[#FAFBFA] p-3 rounded-md border border-[#DDE3DE] space-y-2">
              <span className="text-xs font-semibold text-[#17231F] block">Add Job Position</span>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    placeholder="Code (e.g. JOB-ENGR)"
                    value={newJobCode}
                    onChange={(e) => setNewJobCode(e.target.value.toUpperCase())}
                    className="w-full h-8 rounded-md border border-[#CCD5CD] px-2.5 text-xs font-mono text-[#17231F] uppercase focus:outline-none focus:border-[#245B48] focus:ring-1 focus:ring-[#245B48]/30 transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    placeholder="Job Description"
                    value={newJobDesc}
                    onChange={(e) => setNewJobDesc(e.target.value)}
                    className="w-full h-8 rounded-md border border-[#CCD5CD] px-2.5 text-xs text-[#17231F] focus:outline-none focus:border-[#245B48] focus:ring-1 focus:ring-[#245B48]/30 transition-all"
                  />
                </div>
                <div className="sm:col-span-1">
                  <Button type="submit" variant="primary" size="sm" className="w-full h-8" disabled={isSubmitting}>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-[#52615B]">
                Job codes are permanent and cannot be modified or deleted once created.
              </p>
            </form>

            {/* Jobs Table */}
            <div className="border border-[#DDE3DE] rounded-md overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFBFA] border-b border-[#DDE3DE] text-[#17231F] font-semibold">
                  <tr>
                    <th className="py-2 px-3 w-28">Code</th>
                    <th className="py-2 px-3">Job Description</th>
                    <th className="py-2 px-3 w-24 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9EDEA]">
                  {jobs.map((job) => (
                    <tr key={job.jobCode} className="hover:bg-[#F5F6F4]">
                      <td className="py-2 px-3 font-mono font-medium text-[#17231F]">
                        {job.jobCode}
                      </td>
                      <td className="py-2 px-3 text-[#17231F]">
                        {editingJobCode === job.jobCode ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={renameJobDesc}
                              onChange={(e) => setRenameJobDesc(e.target.value)}
                              className="h-7 px-2 border border-[#245B48] rounded text-xs w-full focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleRenameJob(job.jobCode)}
                              disabled={isSubmitting}
                              className="p-1 text-[#24734D] hover:bg-[#E8F4EC] rounded"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingJobCode(null)}
                              className="p-1 text-[#52615B] hover:bg-[#F0F3F0] rounded"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="font-medium">{job.jobDesc}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {editingJobCode !== job.jobCode && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[11px]"
                            onClick={() => {
                              setEditingJobCode(job.jobCode);
                              setRenameJobDesc(job.jobDesc);
                            }}
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Rename
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end pt-3 border-t border-[#DDE3DE]">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
