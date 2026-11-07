import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { canAccess } from '@/lib/permissions';
import {
  getTopCustomers,
  getProductMasterList,
  getTopProducts,
  getActiveEmployees,
  getAllEmployeesReport,
  getTopSales,
  getEmployeesListForDropdown,
  getEmployeeJobHistoryReport,
} from '@/lib/data/reports';
import { ReportsMainView } from '@/components/reports/ReportsMainView';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Route Guard: Reports module access (A5)
  if (!canAccess(user.role, 'reports', user.rights || [])) {
    redirect('/?denied=1');
  }

  const employeesList = await getEmployeesListForDropdown();
  const firstEmpNo = employeesList[0]?.empNo || '00001';

  // Pre-fetch reports dataset
  const [
    topCustomers,
    productMaster,
    topProducts,
    activeEmployees,
    allEmployees,
    topSales,
    initialJobHistory,
  ] = await Promise.all([
    getTopCustomers('2010-01-01', '2026-12-31', 10),
    getProductMasterList(),
    getTopProducts('2010-01-01', '2026-12-31', 10),
    getActiveEmployees(),
    getAllEmployeesReport(),
    getTopSales('2010-01-01', '2026-12-31', 10),
    getEmployeeJobHistoryReport(firstEmpNo),
  ]);

  return (
    <div className="space-y-6">
      <ReportsMainView
        initialTopCustomers={topCustomers}
        initialProductMaster={productMaster}
        initialTopProducts={topProducts}
        initialActiveEmployees={activeEmployees}
        initialAllEmployees={allEmployees}
        initialTopSales={topSales}
        initialJobHistory={initialJobHistory}
        employeesList={employeesList}
        userRights={user.rights || []}
        userRole={user.role || 'User'}
      />
    </div>
  );
}
