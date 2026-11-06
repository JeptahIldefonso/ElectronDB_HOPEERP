import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { getHumanResourcesPageData } from '@/lib/data/employees';
import { EmployeesListView } from '@/components/employees/EmployeesListView';
import { canAccess } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Route Guard: Human Resources module access (A5)
  if (!canAccess(user.role, 'human-resources', user.rights || [])) {
    redirect('/?denied=1');
  }

  const role =
    user.role === 'Superadmin' || user.role === 'Admin' || user.role === 'admin'
      ? 'admin'
      : 'user';

  const hrData = await getHumanResourcesPageData(role);

  return (
    <EmployeesListView
      initialEmployees={hrData.employees}
      initialJobs={hrData.jobs}
      initialDepartments={hrData.departments}
      initialJobHistory={hrData.jobHistory}
      metrics={hrData.metrics}
      recentAudits={hrData.recentAudits}
      userRole={role}
      userRights={user?.rights || []}
    />
  );
}
