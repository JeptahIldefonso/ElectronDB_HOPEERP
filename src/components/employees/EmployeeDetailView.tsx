'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatPHP, formatDate } from '@/lib/utils';
import type {
  EmployeeDetailPageData,
  DepartmentItem,
  JobItem,
} from '@/lib/data/employees';

const NewJobRecordModal = dynamic(
  () => import('./NewJobRecordModal').then((mod) => mod.NewJobRecordModal),
  { ssr: false }
);

const EditEmployeeModal = dynamic(
  () => import('./EditEmployeeModal').then((mod) => mod.EditEmployeeModal),
  { ssr: false }
);

const SeparateEmployeeModal = dynamic(
  () => import('./SeparateEmployeeModal').then((mod) => mod.SeparateEmployeeModal),
  { ssr: false }
);
import {
  ArrowLeft,
  Plus,
  Edit2,
  UserX,
  Briefcase,
  Building2,
  Calendar,
  DollarSign,
  Clock,
  Shield,
  Info,
} from 'lucide-react';

interface EmployeeDetailViewProps {
  data: EmployeeDetailPageData;
  departments: DepartmentItem[];
  jobs: JobItem[];
}

export function EmployeeDetailView({
  data,
  departments,
  jobs,
}: EmployeeDetailViewProps) {
  const { employee, currentAssignment, history, latestSaleDate } = data;
  const isSeparated = employee.employmentStatus === 'Separated';

  // Modals state
  const [isNewJobOpen, setIsNewJobOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSeparateOpen, setIsSeparateOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* 8.1 Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DDE3DE] pb-4">
        <div>
          <Link
            href="/employees"
            className="inline-flex items-center text-xs text-[#52615B] hover:text-[#17231F] mb-2 transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Employees
          </Link>

          <div className="flex items-center gap-3">
            <h1 className="font-editorial italic text-2xl sm:text-3xl font-normal text-text tracking-tight">
              {employee.lastName}, {employee.firstName}
            </h1>
            <span
              className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-medium border uppercase tracking-wider ${
                isSeparated
                  ? 'bg-[#F0F3F0] text-[#52615B] border-[#DDE3DE]'
                  : 'bg-[#E8F4EC] text-[#24734D] border-[#D5DDD6]'
              }`}
            >
              {employee.employmentStatus}
            </span>
          </div>

          <p className="text-xs text-[#52615B] font-mono mt-0.5">
            Employee no. {employee.empNo}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* New Job Record button */}
          <div className="relative group">
            <Button
              variant="outline"
              size="sm"
              disabled={isSeparated}
              onClick={() => setIsNewJobOpen(true)}
              className="h-9 px-3 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New job record
            </Button>
            {isSeparated && (
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-[#17231F] text-white text-[11px] py-1 px-2 rounded whitespace-nowrap z-10 shadow">
                Separated employees cannot receive new job records
              </span>
            )}
          </div>

          {/* Edit Employee button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="h-9 px-3 text-xs"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1.5" />
            Edit employee
          </Button>

          {/* Separate Employee button */}
          <div className="relative group">
            <Button
              variant="destructive"
              size="sm"
              disabled={isSeparated}
              onClick={() => setIsSeparateOpen(true)}
              className="h-9 px-3 text-xs"
            >
              <UserX className="w-3.5 h-3.5 mr-1.5" />
              Separate employee
            </Button>
            {isSeparated && (
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-[#17231F] text-white text-[11px] py-1 px-2 rounded whitespace-nowrap z-10 shadow">
                Employee is already marked as separated
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Two Top Cards: Employee Info + Current Assignment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 8.2 Card: Employee information (All 7 fields in exact specified order) */}
        <Card className="border border-[#DDE3DE] bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-[#DDE3DE] bg-[#FAFBFA] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#17231F] tracking-tight">
              Employee information
            </span>
            <span className="text-[11px] font-mono text-[#7A8781]">
              EMPLOYEE Table (7 columns)
            </span>
          </div>

          <div className="p-4 space-y-3 text-xs">
            {/* 1. Employee no. */}
            <div className="flex items-center justify-between py-1.5 border-b border-[#E9EDEA]">
              <span className="text-[#52615B] font-medium">Employee no.</span>
              <span className="font-mono font-semibold text-[#17231F]">
                {employee.empNo}
              </span>
            </div>

            {/* 2. Last name */}
            <div className="flex items-center justify-between py-1.5 border-b border-[#E9EDEA]">
              <span className="text-[#52615B] font-medium">Last name</span>
              <span className="font-medium text-[#17231F]">{employee.lastName}</span>
            </div>

            {/* 3. First name */}
            <div className="flex items-center justify-between py-1.5 border-b border-[#E9EDEA]">
              <span className="text-[#52615B] font-medium">First name</span>
              <span className="font-medium text-[#17231F]">{employee.firstName}</span>
            </div>

            {/* 4. Gender */}
            <div className="flex items-center justify-between py-1.5 border-b border-[#E9EDEA]">
              <span className="text-[#52615B] font-medium">Gender</span>
              <span className="text-[#17231F]">{employee.genderDisplay}</span>
            </div>

            {/* 5. Birth date */}
            <div className="flex items-center justify-between py-1.5 border-b border-[#E9EDEA]">
              <span className="text-[#52615B] font-medium">Birth date</span>
              <span className="font-mono text-[#17231F]">{formatDate(employee.birthDate)}</span>
            </div>

            {/* 6. Hire date + tenure */}
            <div className="flex items-center justify-between py-1.5 border-b border-[#E9EDEA]">
              <span className="text-[#52615B] font-medium">Hire date</span>
              <div className="text-right">
                <span className="font-mono text-[#17231F]">{formatDate(employee.hireDate)}</span>
                <span className="text-[11px] text-[#52615B] ml-2">
                  ({employee.tenureText})
                </span>
              </div>
            </div>

            {/* 7. Separation date */}
            <div className="flex items-center justify-between py-1.5">
              <span className="text-[#52615B] font-medium">Separation date</span>
              <span className="font-mono text-[#17231F]">
                {employee.sepDate ? formatDate(employee.sepDate) : '—'}
              </span>
            </div>
          </div>
        </Card>

        {/* 8.3 Card: Current assignment */}
        <Card className="border border-[#DDE3DE] bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-[#DDE3DE] bg-[#FAFBFA] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#17231F] tracking-tight">
              Current assignment
            </span>
            <span className="text-[11px] font-mono text-[#7A8781]">
              Latest Effective Appointment
            </span>
          </div>

          <div className="p-4 space-y-3 text-xs">
            {/* Job */}
            <div className="flex items-center justify-between py-1.5 border-b border-[#E9EDEA]">
              <span className="text-[#52615B] font-medium">Job position</span>
              <div className="text-right">
                <span className="font-medium text-[#17231F]">{currentAssignment.jobDesc}</span>
                <span className="font-mono text-[10px] text-[#7A8781] ml-1.5">
                  ({currentAssignment.jobCode})
                </span>
              </div>
            </div>

            {/* Department */}
            <div className="flex items-center justify-between py-1.5 border-b border-[#E9EDEA]">
              <span className="text-[#52615B] font-medium">Department</span>
              <div className="text-right">
                <span className="font-medium text-[#17231F]">{currentAssignment.deptName}</span>
                <span className="font-mono text-[10px] text-[#7A8781] ml-1.5">
                  ({currentAssignment.deptCode})
                </span>
              </div>
            </div>

            {/* Salary */}
            <div className="flex items-center justify-between py-1.5 border-b border-[#E9EDEA]">
              <span className="text-[#52615B] font-medium">Salary</span>
              <span className="font-mono font-semibold tabular-nums text-base text-[#17231F]">
                {currentAssignment.salary != null ? formatPHP(currentAssignment.salary) : '—'}
              </span>
            </div>

            {/* Effective date */}
            <div className="flex items-center justify-between py-1.5">
              <span className="text-[#52615B] font-medium">Effective date</span>
              <span className="font-mono text-[#17231F]">{formatDate(currentAssignment.effDate)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 8.4 Table: Job history */}
      <Card className="border border-[#DDE3DE] bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#DDE3DE] bg-[#FAFBFA] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#17231F] tracking-tight">
              Job history
            </h2>
            <p className="text-xs text-[#52615B] mt-0.5">
              Complete chronological record of appointments, departmental transfers, and salary changes (newest first).
            </p>
          </div>
          <span className="text-xs font-mono text-[#52615B]">
            {history.length} {history.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAFBFA] border-b border-[#DDE3DE] text-[#17231F] font-semibold">
              <tr>
                <th className="py-2.5 px-3 w-28">Employee no.</th>
                <th className="py-2.5 px-3 w-24">Job code</th>
                <th className="py-2.5 px-3">Job description</th>
                <th className="py-2.5 px-3 w-32">Effective date</th>
                <th className="py-2.5 px-3 w-28">Department code</th>
                <th className="py-2.5 px-3">Department name</th>
                <th className="py-2.5 px-3 w-32 text-right">Salary</th>
                <th className="py-2.5 px-3 w-20 text-center">Current</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E9EDEA]">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#52615B]">
                    No job records found.
                  </td>
                </tr>
              ) : (
                history.map((rec, idx) => (
                  <tr
                    key={`${rec.empNo}-${rec.jobCode}-${rec.effDate}-${idx}`}
                    className={`hover:bg-[#F5F6F4] transition-colors ${
                      rec.isCurrent ? 'bg-[#FAFBFA]' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono text-[#17231F]">
                      {rec.empNo}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-[#17231F]">
                      {rec.jobCode}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#17231F]">
                      {rec.jobDesc}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#52615B]">
                      {formatDate(rec.effDate)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#17231F]">
                      {rec.deptCode}
                    </td>
                    <td className="py-2.5 px-3 text-[#17231F]">
                      {rec.deptName}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium tabular-nums text-right text-[#17231F]">
                      {rec.salary != null ? formatPHP(rec.salary) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {rec.isCurrent ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#E8F4EC] text-[#24734D] border border-[#D5DDD6] uppercase">
                          Current
                        </span>
                      ) : (
                        <span className="text-[#A0AAA4] font-mono">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals */}
      <NewJobRecordModal
        isOpen={isNewJobOpen}
        onClose={() => setIsNewJobOpen(false)}
        empNo={employee.empNo}
        currentAssignment={currentAssignment}
        latestSaleDate={latestSaleDate}
        departments={departments}
        jobs={jobs}
      />

      <EditEmployeeModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        employee={employee}
      />

      <SeparateEmployeeModal
        isOpen={isSeparateOpen}
        onClose={() => setIsSeparateOpen(false)}
        employee={employee}
        latestSaleDate={latestSaleDate}
      />
    </div>
  );
}
