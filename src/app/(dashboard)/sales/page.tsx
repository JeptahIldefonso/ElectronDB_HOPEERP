import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { getSalesPageData } from '@/lib/data/sales';
import { canAccess } from '@/lib/permissions';
import { SalesMainView } from '@/components/sales/SalesMainView';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ action?: string; code?: string; view?: string }>;
}

export default async function SalesPage({ searchParams }: PageProps) {
  const [user, params] = await Promise.all([
    getCurrentUser(),
    searchParams,
  ]);

  if (!user) {
    redirect('/login');
  }

  // Route Guard: Sales module access
  if (!canAccess(user.role, 'sales', user.rights || [])) {
    redirect('/?denied=1');
  }

  const data = await getSalesPageData();
  const userRole = user?.role || 'user';
  const shouldOpenNewSale = params.action === 'new';

  return (
    <div className="space-y-6">
      <SalesMainView
        initialSales={data.sales}
        initialLines={data.lines}
        metrics={data.metrics}
        lookups={data.lookups}
        recentAudits={data.recentAudits}
        userRole={userRole}
        userRights={user?.rights || []}
        initialOpenNewSale={shouldOpenNewSale}
      />
    </div>
  );
}
