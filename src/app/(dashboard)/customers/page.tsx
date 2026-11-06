import React from 'react';
import { redirect } from 'next/navigation';
import { getCustomersPageData } from '@/lib/data/customers';
import { getCurrentUser } from '@/app/actions/auth';
import { canAccess } from '@/lib/permissions';
import { CustomersMainView } from '@/components/customers/CustomersMainView';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Route Guard: verify role/rights permission (A5)
  if (!canAccess(user.role, 'customer', user.rights || [])) {
    redirect('/?denied=1');
  }

  const userRole = user?.role || 'user';
  const pageData = await getCustomersPageData();

  return (
    <div className="space-y-6">
      <CustomersMainView
        initialCustomers={pageData.customers}
        metrics={pageData.metrics}
        recentAudits={pageData.recentAudits}
        userRole={userRole}
        userRights={user?.rights || []}
      />
    </div>
  );
}
