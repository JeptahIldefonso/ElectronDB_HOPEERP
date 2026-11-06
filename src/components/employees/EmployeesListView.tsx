'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Briefcase,
  Building2,
  Search,
  Plus,
  History,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
  Info,
} from 'lucide-react';
import {
  deleteEmployeeAction,
  restoreEmployeeAction,
  deleteJobAction,
  restoreJobAction,
  deleteDepartmentAction,
  restoreDepartmentAction,
} from '@/app/actions/employees';
import { RightSideKpiPanel, type KpiCardItem } from '@/components/ui/RightSideKpiPanel';
import { AddEmployeeModal } from './AddEmployeeModal';
import { EditEmployeeModal } from './EditEmployeeModal';
import { AddJobModal } from './AddJobModal';
import { EditJobModal } from './EditJobModal';
import { AddDepartmentModal } from './AddDepartmentModal';
import { EditDepartmentModal } from './EditDepartmentModal';
import { JobHistoryModal } from './JobHistoryModal';
import { HumanResourcesAuditModal } from './HumanResourcesAuditModal';
import type {
  EmployeeItem,
  JobItem,
  DepartmentItem,
  JobHistoryRecord,
  HumanResourcesMetrics,
  HumanResourcesAuditItem,
} from '@/lib/data/employees';

interface EmployeesListViewProps {
  initialEmployees?: EmployeeItem[];
  initialJobs?: JobItem[];
  initialDepartments?: DepartmentItem[];
  initialJobHistory?: JobHistoryRecord[];
  metrics?: HumanResourcesMetrics;
  recentAudits?: HumanResourcesAuditItem[];
  userRole?: string;
  userRights?: string[];
  // Legacy props fallback
  departments?: any;
  departmentLookups?: any;
  jobLookups?: any;
  totalActiveCount?: number;
}

type TabType = 'employees' | 'jobs' | 'departments';
type StatusFilter = 'active' | 'inactive' | 'all';

export function EmployeesListView({
  initialEmployees = [],
  initialJobs = [],
  initialDepartments = [],
  initialJobHistory = [],
  metrics,
  recentAudits = [],
  userRole = 'admin',
  userRights = [],
}: EmployeesListViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const roleUpper = userRole.toUpperCase();
  const isAdmin = userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'superadmin';
  const canModify = isAdmin;

  // Individual permissions
  const canAddEmployee = isAdmin || userRights.includes('add_employee');
  const canEditEmployee = isAdmin || userRights.includes('edit_employee');
  const canDeleteEmployee = isAdmin || userRights.includes('delete_employee');
  const canViewJobHistory = isAdmin || userRights.includes('view_job_history');

  const canAddJob = isAdmin || userRights.includes('add_job');
  const canEditJob = isAdmin || userRights.includes('edit_job');
  const canDeleteJob = isAdmin || userRights.includes('delete_job');

  const canAddDepartment = isAdmin || userRights.includes('add_department');
  const canEditDepartment = isAdmin || userRights.includes('edit_department');
  const canDeleteDepartment = isAdmin || userRights.includes('delete_department');

  // Active Main Tab: Employees (default), Jobs, Departments
  const [activeTab, setActiveTab] = useState<TabType>('employees');

  // Status Filter: Active, Inactive, All
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  // Search input per tab
  const [empSearch, setEmpSearch] = useState('');
  const [jobSearch, setJobSearch] = useState('');
  const [deptSearch, setDeptSearch] = useState('');

  // Pagination per tab
  const [empPage, setEmpPage] = useState(1);
  const [empPageSize, setEmpPageSize] = useState<number>(10);

  const [jobPage, setJobPage] = useState(1);
  const [jobPageSize, setJobPageSize] = useState<number>(10);

  const [deptPage, setDeptPage] = useState(1);
  const [deptPageSize, setDeptPageSize] = useState<number>(10);

  // Modals state
  const [isAddEmpOpen, setIsAddEmpOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<EmployeeItem | null>(null);
  const [historyEmp, setHistoryEmp] = useState<EmployeeItem | null>(null);

  const [isAddJobOpen, setIsAddJobOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobItem | null>(null);

  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Deletion Confirmation Modal
  type DeleteTarget =
    | { type: 'employee'; data: EmployeeItem }
    | { type: 'job'; data: JobItem }
    | { type: 'department'; data: DepartmentItem }
    | null;
  const [deletingTarget, setDeletingTarget] = useState<DeleteTarget>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ========================================================================
  // FILTERING & TAB COMPUTATIONS
  // ========================================================================

  // 1. Employees Tab Filter
  const filteredEmployees = useMemo(() => {
    let list = initialEmployees;
    if (isAdmin) {
      if (statusFilter === 'active') {
        list = list.filter((e) => e.status === 'Active');
      } else if (statusFilter === 'inactive') {
        list = list.filter((e) => e.status === 'Inactive');
      }
    } else {
      list = list.filter((e) => e.status === 'Active');
    }

    const q = empSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        return (
          e.empNo.toLowerCase().includes(q) ||
          e.lastName.toLowerCase().includes(q) ||
          e.firstName.toLowerCase().includes(q) ||
          e.fullName.toLowerCase().includes(q) ||
          (e.currentJobDesc && e.currentJobDesc.toLowerCase().includes(q)) ||
          (e.currentDeptName && e.currentDeptName.toLowerCase().includes(q)) ||
          (e.stamp && e.stamp.toLowerCase().includes(q))
        );
      });
    }
    return list;
  }, [initialEmployees, statusFilter, empSearch, isAdmin]);

  // 2. Jobs Tab Filter
  const filteredJobs = useMemo(() => {
    let list = initialJobs;
    if (isAdmin) {
      if (statusFilter === 'active') {
        list = list.filter((j) => !j.isDeleted);
      } else if (statusFilter === 'inactive') {
        list = list.filter((j) => j.isDeleted);
      }
    } else {
      list = list.filter((j) => !j.isDeleted);
    }

    const q = jobSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((j) => {
        return (
          j.jobCode.toLowerCase().includes(q) ||
          j.jobDesc.toLowerCase().includes(q) ||
          (j.stamp && j.stamp.toLowerCase().includes(q))
        );
      });
    }
    return list;
  }, [initialJobs, statusFilter, jobSearch, isAdmin]);

  // 3. Departments Tab Filter
  const filteredDepartments = useMemo(() => {
    let list = initialDepartments;
    if (isAdmin) {
      if (statusFilter === 'active') {
        list = list.filter((d) => !d.isDeleted);
      } else if (statusFilter === 'inactive') {
        list = list.filter((d) => d.isDeleted);
      }
    } else {
      list = list.filter((d) => !d.isDeleted);
    }

    const q = deptSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((d) => {
        return (
          d.deptCode.toLowerCase().includes(q) ||
          d.deptName.toLowerCase().includes(q) ||
          (d.stamp && d.stamp.toLowerCase().includes(q))
        );
      });
    }
    return list;
  }, [initialDepartments, statusFilter, deptSearch, isAdmin]);

  // Counts for current tab status pills
  const currentTabCounts = useMemo(() => {
    if (activeTab === 'employees') {
      const active = initialEmployees.filter((e) => e.status === 'Active').length;
      const inactive = initialEmployees.filter((e) => e.status === 'Inactive').length;
      return { active, inactive, total: initialEmployees.length };
    }
    if (activeTab === 'jobs') {
      const active = initialJobs.filter((j) => !j.isDeleted).length;
      const inactive = initialJobs.filter((j) => j.isDeleted).length;
      return { active, inactive, total: initialJobs.length };
    }
    const active = initialDepartments.filter((d) => !d.isDeleted).length;
    const inactive = initialDepartments.filter((d) => d.isDeleted).length;
    return { active, inactive, total: initialDepartments.length };
  }, [activeTab, initialEmployees, initialJobs, initialDepartments]);

  // Paginated Slices
  const paginatedEmployees = useMemo(() => {
    if (empPageSize === 0) return filteredEmployees;
    const start = (empPage - 1) * empPageSize;
    return filteredEmployees.slice(start, start + empPageSize);
  }, [filteredEmployees, empPage, empPageSize]);

  const paginatedJobs = useMemo(() => {
    if (jobPageSize === 0) return filteredJobs;
    const start = (jobPage - 1) * jobPageSize;
    return filteredJobs.slice(start, start + jobPageSize);
  }, [filteredJobs, jobPage, jobPageSize]);

  const paginatedDepartments = useMemo(() => {
    if (deptPageSize === 0) return filteredDepartments;
    const start = (deptPage - 1) * deptPageSize;
    return filteredDepartments.slice(start, start + deptPageSize);
  }, [filteredDepartments, deptPage, deptPageSize]);

  // ========================================================================
  // ACTIONS: SOFT-DELETE & RESTORE
  // ========================================================================

  const handleConfirmDelete = async () => {
    if (!deletingTarget) return;
    setIsSubmitting(true);
    setActionError(null);

    try {
      let res: { success?: boolean; error?: string };
      if (deletingTarget.type === 'employee') {
        res = await deleteEmployeeAction(deletingTarget.data.empNo);
      } else if (deletingTarget.type === 'job') {
        res = await deleteJobAction(deletingTarget.data.jobCode);
      } else {
        res = await deleteDepartmentAction(deletingTarget.data.deptCode);
      }

      if (res.error) {
        setActionError(res.error);
        setIsSubmitting(false);
        return;
      }

      setDeletingTarget(null);
      setIsSubmitting(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setActionError(`Failed to soft-delete ${deletingTarget.type}.`);
      setIsSubmitting(false);
    }
  };

  const handleRestoreEmployee = async (emp: EmployeeItem) => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const res = await restoreEmployeeAction(emp.empNo);
      if (res.error) {
        setActionError(res.error);
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setActionError('Failed to restore employee.');
      setIsSubmitting(false);
    }
  };

  const handleRestoreJob = async (job: JobItem) => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const res = await restoreJobAction(job.jobCode);
      if (res.error) {
        setActionError(res.error);
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setActionError('Failed to restore job.');
      setIsSubmitting(false);
    }
  };

  const handleRestoreDepartment = async (dept: DepartmentItem) => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      const res = await restoreDepartmentAction(dept.deptCode);
      if (res.error) {
        setActionError(res.error);
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setActionError('Failed to restore department.');
      setIsSubmitting(false);
    }
  };

  // ========================================================================
  // RIGHT SIDE KPI PANEL DEDICATED TO HUMAN RESOURCES
  // ========================================================================

  const totalEmployeesCount = metrics?.totalEmployees ?? initialEmployees.length;
  const activeEmployeesCount =
    metrics?.activeEmployees ?? initialEmployees.filter((e) => e.status === 'Active').length;
  const inactiveEmployeesCount =
    metrics?.inactiveEmployees ?? initialEmployees.filter((e) => e.status === 'Inactive').length;

  const totalJobsCount = metrics?.totalJobs ?? initialJobs.length;
  const activeJobsCount = metrics?.activeJobs ?? initialJobs.filter((j) => !j.isDeleted).length;
  const inactiveJobsCount = metrics?.inactiveJobs ?? initialJobs.filter((j) => j.isDeleted).length;

  const totalDeptsCount = metrics?.totalDepartments ?? initialDepartments.length;
  const activeDeptsCount =
    metrics?.activeDepartments ?? initialDepartments.filter((d) => !d.isDeleted).length;
  const inactiveDeptsCount =
    metrics?.inactiveDepartments ?? initialDepartments.filter((d) => d.isDeleted).length;

  const statBarCards: KpiCardItem[] = useMemo(
    () => [
      {
        id: 'total-employees',
        title: 'TOTAL REGISTERED',
        value: totalEmployeesCount,
        subtext: `${activeEmployeesCount} active · ${inactiveEmployeesCount} inactive`,
        icon: Users,
        onClick: () => setIsAuditModalOpen(true),
        clickable: true,
      },
      {
        id: 'total-jobs',
        title: 'TOTAL JOBS',
        value: totalJobsCount,
        subtext: `${activeJobsCount} active · ${inactiveJobsCount} inactive`,
        icon: Briefcase,
        onClick: () => {
          setActiveTab('jobs');
          setStatusFilter('active');
        },
        clickable: true,
      },
      {
        id: 'total-departments',
        title: 'DEPARTMENTS',
        value: totalDeptsCount,
        subtext: `${activeDeptsCount} active · ${inactiveDeptsCount} inactive`,
        icon: Building2,
        onClick: () => {
          setActiveTab('departments');
          setStatusFilter('active');
        },
        clickable: true,
      },
    ],
    [
      totalEmployeesCount,
      activeEmployeesCount,
      inactiveEmployeesCount,
      totalJobsCount,
      activeJobsCount,
      inactiveJobsCount,
      totalDeptsCount,
      activeDeptsCount,
      inactiveDeptsCount,
    ]
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Row with Title and Role */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="font-editorial italic text-2xl sm:text-3xl font-normal text-text tracking-tight">
            Human Resources
          </h1>
          <p className="font-sans text-xs text-text-muted mt-1">
            Section 3.5: Employees, job titles, departments and each employee&apos;s job/salary history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAuditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm cursor-pointer"
          >
            <History className="h-3.5 w-3.5 text-slate-500" />
            <span>Audit Trail</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-semibold uppercase rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <ShieldCheck className="h-3.5 w-3.5 text-[#041a24] dark:text-slate-300" />
            <span>{roleUpper}</span>
          </div>
        </div>
      </div>

      {/* Action Error Banner */}
      {actionError && (
        <div className="rounded-md border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs underline hover:no-underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main 3-Tab Navigator (Figures 15, 18, 19) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab('employees');
            setStatusFilter('active');
          }}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'employees'
              ? 'bg-[#001A2B] text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Employees
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('jobs');
            setStatusFilter('active');
          }}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'jobs'
              ? 'bg-[#001A2B] text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Jobs
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('departments');
            setStatusFilter('active');
          }}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'departments'
              ? 'bg-[#001A2B] text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Departments
        </button>
      </div>

      {/* Main Content Area: Left CRUD Table + Right Stat Bar */}
      <div className="flex flex-col xl:flex-row gap-5 items-start">
        {/* Left Column: Tab Data & Table */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Controls Bar (Status Filters + Search + Primary Button with #001A2B) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Status Filter Pills (Admin only per Figures 15, 18, 19) */}
            {isAdmin ? (
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-md text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('active');
                    if (activeTab === 'employees') setEmpPage(1);
                    if (activeTab === 'jobs') setJobPage(1);
                    if (activeTab === 'departments') setDeptPage(1);
                  }}
                  className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                    statusFilter === 'active'
                      ? 'bg-white dark:bg-slate-700 text-[#041a24] dark:text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Active ({currentTabCounts.active})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('inactive');
                    if (activeTab === 'employees') setEmpPage(1);
                    if (activeTab === 'jobs') setJobPage(1);
                    if (activeTab === 'departments') setDeptPage(1);
                  }}
                  className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                    statusFilter === 'inactive'
                      ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-300 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Inactive ({currentTabCounts.inactive})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    if (activeTab === 'employees') setEmpPage(1);
                    if (activeTab === 'jobs') setJobPage(1);
                    if (activeTab === 'departments') setDeptPage(1);
                  }}
                  className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  All ({currentTabCounts.total})
                </button>
              </div>
            ) : (
              <div />
            )}

            {/* Right Controls: Search bar with #001A2B outline + Primary button with #001A2B */}
            <div className="flex items-center gap-2 flex-1 md:justify-end">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                {activeTab === 'employees' && (
                  <input
                    type="text"
                    value={empSearch}
                    onChange={(e) => {
                      setEmpSearch(e.target.value);
                      setEmpPage(1);
                    }}
                    placeholder="Search employees..."
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none transition-all"
                  />
                )}
                {activeTab === 'jobs' && (
                  <input
                    type="text"
                    value={jobSearch}
                    onChange={(e) => {
                      setJobSearch(e.target.value);
                      setJobPage(1);
                    }}
                    placeholder="Search jobs..."
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none transition-all"
                  />
                )}
                {activeTab === 'departments' && (
                  <input
                    type="text"
                    value={deptSearch}
                    onChange={(e) => {
                      setDeptSearch(e.target.value);
                      setDeptPage(1);
                    }}
                    placeholder="Search departments..."
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-[#001A2B] focus:ring-1 focus:ring-[#001A2B]/40 focus:outline-none transition-all"
                  />
                )}
              </div>

              {/* Add buttons conditioned on tab and rights */}
              {activeTab === 'employees' && canAddEmployee && (
                <button
                  type="button"
                  onClick={() => setIsAddEmpOpen(true)}
                  className="bg-[#001A2B] hover:bg-[#00263E] text-white shrink-0 text-xs px-3.5 py-1.5 font-medium rounded-md flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Employee</span>
                </button>
              )}
              {activeTab === 'jobs' && canAddJob && (
                <button
                  type="button"
                  onClick={() => setIsAddJobOpen(true)}
                  className="bg-[#001A2B] hover:bg-[#00263E] text-white shrink-0 text-xs px-3.5 py-1.5 font-medium rounded-md flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Job</span>
                </button>
              )}
              {activeTab === 'departments' && canAddDepartment && (
                <button
                  type="button"
                  onClick={() => setIsAddDeptOpen(true)}
                  className="bg-[#001A2B] hover:bg-[#00263E] text-white shrink-0 text-xs px-3.5 py-1.5 font-medium rounded-md flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Department</span>
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: EMPLOYEES TABLE (Figure 15 & 20) */}
          {activeTab === 'employees' && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 dark:bg-slate-850/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3.5 py-3">EMP NO</th>
                      <th className="px-3.5 py-3">LAST NAME</th>
                      <th className="px-3.5 py-3">FIRST NAME</th>
                      <th className="px-3.5 py-3">GENDER</th>
                      <th className="px-3.5 py-3">BIRTH DATE</th>
                      <th className="px-3.5 py-3">HIRE DATE</th>
                      <th className="px-3.5 py-3">SEP DATE</th>
                      {isAdmin && <th className="px-3.5 py-3">STATUS</th>}
                      {isAdmin && <th className="px-3.5 py-3">STAMP</th>}
                      <th className="px-3.5 py-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {paginatedEmployees.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isAdmin ? 10 : 8}
                          className="px-4 py-8 text-center text-xs text-slate-400"
                        >
                          No employee records match the current filter.
                        </td>
                      </tr>
                    ) : (
                      paginatedEmployees.map((emp) => {
                        const isInactive = emp.status === 'Inactive';
                        return (
                          <tr
                            key={emp.empNo}
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                              isInactive ? 'bg-rose-50/20 dark:bg-rose-950/10 opacity-75' : ''
                            }`}
                          >
                            <td className="px-3.5 py-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              {emp.empNo}
                            </td>
                            <td className="px-3.5 py-3 font-semibold text-slate-800 dark:text-slate-200">
                              {emp.lastName}
                            </td>
                            <td className="px-3.5 py-3 text-slate-800 dark:text-slate-200">
                              {emp.firstName}
                            </td>
                            <td className="px-3.5 py-3 text-slate-600 dark:text-slate-300">
                              {emp.gender}
                            </td>
                            <td className="px-3.5 py-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {emp.birthDate}
                            </td>
                            <td className="px-3.5 py-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {emp.hireDate}
                            </td>
                            <td className="px-3.5 py-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              {emp.sepDate || '—'}
                            </td>

                            {isAdmin && (
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium font-sans ${
                                    isInactive
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  }`}
                                >
                                  {emp.status}
                                </span>
                              </td>
                            )}

                            {isAdmin && (
                              <td className="px-3.5 py-3 font-mono text-[10.5px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {emp.stamp || '—'}
                              </td>
                            )}

                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* History Button: opens JOBHISTORY modal */}
                                {canViewJobHistory && (
                                  <button
                                    type="button"
                                    onClick={() => setHistoryEmp(emp)}
                                    className="px-2.5 py-1 text-xs rounded border border-[#041a24]/20 dark:border-slate-700 bg-[#041a24]/5 dark:bg-slate-800 text-[#041a24] dark:text-slate-200 hover:bg-[#041a24]/10 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer font-medium"
                                  >
                                    History
                                  </button>
                                )}

                                {!emp.isDeleted ? (
                                  <>
                                    {canEditEmployee && (
                                      <button
                                        type="button"
                                        onClick={() => setEditingEmp(emp)}
                                        className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                    )}
                                    {canDeleteEmployee && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setDeletingTarget({ type: 'employee', data: emp })
                                        }
                                        className="px-2.5 py-1 text-xs rounded border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shadow-2xs cursor-pointer"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreEmployee(emp)}
                                      disabled={isSubmitting}
                                      className="px-2.5 py-1 text-xs rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-2xs inline-flex items-center gap-1 font-medium cursor-pointer"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                      <span>Restore</span>
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Employees Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select
                    value={empPageSize}
                    onChange={(e) => {
                      setEmpPageSize(Number(e.target.value));
                      setEmpPage(1);
                    }}
                    className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={0}>All ({filteredEmployees.length})</option>
                  </select>
                  <span className="ml-2 font-mono text-[11px]">
                    Showing{' '}
                    {filteredEmployees.length === 0
                      ? 0
                      : (empPage - 1) * (empPageSize || filteredEmployees.length) + 1}
                    &ndash;
                    {empPageSize === 0
                      ? filteredEmployees.length
                      : Math.min(empPage * empPageSize, filteredEmployees.length)}{' '}
                    of {filteredEmployees.length}
                  </span>
                </div>

                {empPageSize > 0 && Math.ceil(filteredEmployees.length / empPageSize) > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEmpPage((p) => Math.max(1, p - 1))}
                      disabled={empPage <= 1}
                      className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-2 text-xs font-mono">
                      {empPage} / {Math.ceil(filteredEmployees.length / empPageSize)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setEmpPage((p) =>
                          Math.min(Math.ceil(filteredEmployees.length / empPageSize), p + 1)
                        )
                      }
                      disabled={empPage >= Math.ceil(filteredEmployees.length / empPageSize)}
                      className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: JOBS TABLE (Figure 18) */}
          {activeTab === 'jobs' && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 dark:bg-slate-850/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3.5 py-3">JOB CODE</th>
                      <th className="px-3.5 py-3">DESCRIPTION</th>
                      {isAdmin && <th className="px-3.5 py-3">STATUS</th>}
                      {isAdmin && <th className="px-3.5 py-3">STAMP</th>}
                      <th className="px-3.5 py-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {paginatedJobs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isAdmin ? 5 : 3}
                          className="px-4 py-8 text-center text-xs text-slate-400"
                        >
                          No job records match the current filter.
                        </td>
                      </tr>
                    ) : (
                      paginatedJobs.map((job) => {
                        const isDeleted = job.isDeleted;
                        return (
                          <tr
                            key={job.jobCode}
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                              isDeleted ? 'bg-rose-50/20 dark:bg-rose-950/10 opacity-75' : ''
                            }`}
                          >
                            <td className="px-3.5 py-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              {job.jobCode}
                            </td>
                            <td className="px-3.5 py-3 font-semibold text-slate-800 dark:text-slate-200">
                              {job.jobDesc}
                            </td>

                            {isAdmin && (
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium font-sans ${
                                    isDeleted
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  }`}
                                >
                                  {isDeleted ? 'Inactive' : 'Active'}
                                </span>
                              </td>
                            )}

                            {isAdmin && (
                              <td className="px-3.5 py-3 font-mono text-[10.5px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {job.stamp || '—'}
                              </td>
                            )}

                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isDeleted ? (
                                  <>
                                    {canEditJob && (
                                      <button
                                        type="button"
                                        onClick={() => setEditingJob(job)}
                                        className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                    )}
                                    {canDeleteJob && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setDeletingTarget({ type: 'job', data: job })
                                        }
                                        className="px-2.5 py-1 text-xs rounded border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shadow-2xs cursor-pointer"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreJob(job)}
                                      disabled={isSubmitting}
                                      className="px-2.5 py-1 text-xs rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-2xs inline-flex items-center gap-1 font-medium cursor-pointer"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                      <span>Restore</span>
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Jobs Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select
                    value={jobPageSize}
                    onChange={(e) => {
                      setJobPageSize(Number(e.target.value));
                      setJobPage(1);
                    }}
                    className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={0}>All ({filteredJobs.length})</option>
                  </select>
                  <span className="ml-2 font-mono text-[11px]">
                    Showing{' '}
                    {filteredJobs.length === 0
                      ? 0
                      : (jobPage - 1) * (jobPageSize || filteredJobs.length) + 1}
                    &ndash;
                    {jobPageSize === 0
                      ? filteredJobs.length
                      : Math.min(jobPage * jobPageSize, filteredJobs.length)}{' '}
                    of {filteredJobs.length}
                  </span>
                </div>

                {jobPageSize > 0 && Math.ceil(filteredJobs.length / jobPageSize) > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setJobPage((p) => Math.max(1, p - 1))}
                      disabled={jobPage <= 1}
                      className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-2 text-xs font-mono">
                      {jobPage} / {Math.ceil(filteredJobs.length / jobPageSize)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setJobPage((p) =>
                          Math.min(Math.ceil(filteredJobs.length / jobPageSize), p + 1)
                        )
                      }
                      disabled={jobPage >= Math.ceil(filteredJobs.length / jobPageSize)}
                      className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DEPARTMENTS TABLE (Figure 19) */}
          {activeTab === 'departments' && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 dark:bg-slate-850/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3.5 py-3">DEPT CODE</th>
                      <th className="px-3.5 py-3">DEPARTMENT NAME</th>
                      {isAdmin && <th className="px-3.5 py-3">STATUS</th>}
                      {isAdmin && <th className="px-3.5 py-3">STAMP</th>}
                      <th className="px-3.5 py-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {paginatedDepartments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isAdmin ? 5 : 3}
                          className="px-4 py-8 text-center text-xs text-slate-400"
                        >
                          No department records match the current filter.
                        </td>
                      </tr>
                    ) : (
                      paginatedDepartments.map((dept) => {
                        const isDeleted = dept.isDeleted;
                        return (
                          <tr
                            key={dept.deptCode}
                            className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                              isDeleted ? 'bg-rose-50/20 dark:bg-rose-950/10 opacity-75' : ''
                            }`}
                          >
                            <td className="px-3.5 py-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              {dept.deptCode}
                            </td>
                            <td className="px-3.5 py-3 font-semibold text-slate-800 dark:text-slate-200">
                              {dept.deptName}
                            </td>

                            {isAdmin && (
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium font-sans ${
                                    isDeleted
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  }`}
                                >
                                  {isDeleted ? 'Inactive' : 'Active'}
                                </span>
                              </td>
                            )}

                            {isAdmin && (
                              <td className="px-3.5 py-3 font-mono text-[10.5px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {dept.stamp || '—'}
                              </td>
                            )}

                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isDeleted ? (
                                  <>
                                    {canEditDepartment && (
                                      <button
                                        type="button"
                                        onClick={() => setEditingDept(dept)}
                                        className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                    )}
                                    {canDeleteDepartment && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setDeletingTarget({ type: 'department', data: dept })
                                        }
                                        className="px-2.5 py-1 text-xs rounded border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shadow-2xs cursor-pointer"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreDepartment(dept)}
                                      disabled={isSubmitting}
                                      className="px-2.5 py-1 text-xs rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-2xs inline-flex items-center gap-1 font-medium cursor-pointer"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                      <span>Restore</span>
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Departments Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select
                    value={deptPageSize}
                    onChange={(e) => {
                      setDeptPageSize(Number(e.target.value));
                      setDeptPage(1);
                    }}
                    className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={0}>All ({filteredDepartments.length})</option>
                  </select>
                  <span className="ml-2 font-mono text-[11px]">
                    Showing{' '}
                    {filteredDepartments.length === 0
                      ? 0
                      : (deptPage - 1) * (deptPageSize || filteredDepartments.length) + 1}
                    &ndash;
                    {deptPageSize === 0
                      ? filteredDepartments.length
                      : Math.min(deptPage * deptPageSize, filteredDepartments.length)}{' '}
                    of {filteredDepartments.length}
                  </span>
                </div>

                {deptPageSize > 0 && Math.ceil(filteredDepartments.length / deptPageSize) > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDeptPage((p) => Math.max(1, p - 1))}
                      disabled={deptPage <= 1}
                      className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-2 text-xs font-mono">
                      {deptPage} / {Math.ceil(filteredDepartments.length / deptPageSize)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setDeptPage((p) =>
                          Math.min(Math.ceil(filteredDepartments.length / deptPageSize), p + 1)
                        )
                      }
                      disabled={deptPage >= Math.ceil(filteredDepartments.length / deptPageSize)}
                      className="p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Stat Bar Dashboard dedicated to Human Resources (Image 2 style) */}
        <aside className="w-full xl:w-[248px] shrink-0 space-y-3">
          <RightSideKpiPanel
            title="HR Stats Bar"
            subtitle="LIVE"
            cards={statBarCards}
          />

          {/* Department Breakdown Card (matching Image 2 distribution) */}
          <div className="rounded-[12px] border border-[#E2E7E4] dark:border-border bg-white dark:bg-surface-1 p-3 shadow-2xs font-sans">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Staffing Distribution
              </span>
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="space-y-1.5 text-xs">
              {initialDepartments.slice(0, 5).map((d) => (
                <div
                  key={d.deptCode}
                  className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                    {d.deptName}
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {d.activeStaffCount}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Next ID Sequence Card (matching Image 2 bottom box) */}
          <div className="rounded-[12px] border border-[#041a24]/15 dark:border-slate-800 bg-[#041a24]/5 dark:bg-slate-800/50 p-3 text-xs font-sans">
            <div className="flex items-center gap-1.5 text-[#041a24] dark:text-slate-200 font-semibold mb-1">
              <Info className="w-3.5 h-3.5" />
              <span>Next ID Sequence</span>
            </div>
            <div className="font-mono text-sm font-bold text-[#041a24] dark:text-slate-100 mt-1">
              Auto-assigned: {metrics?.nextSuggestedEmpNo || '00065'}
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Primary key strictly follows the canonical schema pattern (VARCHAR(5)).
            </p>
          </div>
        </aside>
      </div>

      {/* Universal Soft-delete Confirmation Modal */}
      {deletingTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-5 shadow-2xl font-sans">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Confirm Soft Delete
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Are you sure you want to mark this {deletingTarget.type} record as{' '}
              <span className="font-bold text-rose-600">Inactive</span>?
            </p>
            <div className="mt-3 p-2.5 rounded bg-slate-50 dark:bg-slate-800 text-xs font-mono">
              {deletingTarget.type === 'employee' && (
                <span>
                  {deletingTarget.data.empNo} &bull; {deletingTarget.data.fullName}
                </span>
              )}
              {deletingTarget.type === 'job' && (
                <span>
                  {deletingTarget.data.jobCode} &bull; {deletingTarget.data.jobDesc}
                </span>
              )}
              {deletingTarget.type === 'department' && (
                <span>
                  {deletingTarget.data.deptCode} &bull; {deletingTarget.data.deptName}
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeletingTarget(null)}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 cursor-pointer"
              >
                {isSubmitting && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isOpen={isAddEmpOpen}
        onClose={() => setIsAddEmpOpen(false)}
        nextSuggestedEmpNo={metrics?.nextSuggestedEmpNo}
        jobs={initialJobs}
        departments={initialDepartments}
      />

      {/* Edit Employee Modal */}
      {editingEmp && (
        <EditEmployeeModal
          isOpen={Boolean(editingEmp)}
          onClose={() => setEditingEmp(null)}
          employee={editingEmp}
        />
      )}

      {/* Job History Modal (Figures 16 & 17) */}
      {historyEmp && (
        <JobHistoryModal
          isOpen={Boolean(historyEmp)}
          onClose={() => setHistoryEmp(null)}
          employee={historyEmp}
          historyRecords={initialJobHistory}
          jobs={initialJobs}
          departments={initialDepartments}
          userRole={userRole}
        />
      )}

      {/* Add Job Modal */}
      <AddJobModal
        isOpen={isAddJobOpen}
        onClose={() => setIsAddJobOpen(false)}
        nextSuggestedCode={metrics?.nextSuggestedJobCode}
      />

      {/* Edit Job Modal */}
      {editingJob && (
        <EditJobModal
          isOpen={Boolean(editingJob)}
          onClose={() => setEditingJob(null)}
          job={editingJob}
        />
      )}

      {/* Add Department Modal */}
      <AddDepartmentModal
        isOpen={isAddDeptOpen}
        onClose={() => setIsAddDeptOpen(false)}
        nextSuggestedCode={metrics?.nextSuggestedDeptCode}
      />

      {/* Edit Department Modal */}
      {editingDept && (
        <EditDepartmentModal
          isOpen={Boolean(editingDept)}
          onClose={() => setEditingDept(null)}
          department={editingDept}
        />
      )}

      {/* Human Resources Audit Modal */}
      <HumanResourcesAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        audits={recentAudits}
      />
    </div>
  );
}
