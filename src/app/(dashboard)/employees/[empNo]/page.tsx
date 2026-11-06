import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { getCurrentUser } from '@/app/actions/auth';
import { canAccess } from '@/lib/permissions';
import {
  getEmployeeDetailPageData,
  getDepartmentsAndJobsLookups,
} from '@/lib/data/employees';
import { EmployeeDetailView } from '@/components/employees/EmployeeDetailView';

export const dynamic = 'force-dynamic';

interface EmployeeDetailPageProps {
  params: Promise<{ empNo: string }>;
}

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (!canAccess(user.role, 'human-resources', user.rights || [])) {
    redirect('/?denied=1');
  }

  const resolvedParams = await params;

  // Validate empNo with Zod as a positive integer (Section 6, T-18)
  const empNoParsed = z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().positive())
    .safeParse(resolvedParams.empNo);

  if (!empNoParsed.success) {
    notFound();
  }

  const empNo = empNoParsed.data;

  const [data, lookups] = await Promise.all([
    getEmployeeDetailPageData(empNo, 'admin'),
    getDepartmentsAndJobsLookups(),
  ]);

  if (!data) {
    notFound();
  }

  return (
    <EmployeeDetailView
      data={data}
      departments={lookups.departments}
      jobs={lookups.jobs}
    />
  );
}
