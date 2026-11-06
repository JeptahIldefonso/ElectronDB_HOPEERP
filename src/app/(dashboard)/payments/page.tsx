import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { canAccess } from '@/lib/permissions';
import { getPaymentsLedger, getSalesForPayment, getNextORNumberPreview } from '@/lib/data/payments';
import { PaymentsMainView } from '@/components/payments/PaymentsMainView';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Route Guard: Payments module access
  if (!canAccess(user.role, 'payments', user.rights || [])) {
    redirect('/?denied=1');
  }

  const [ledgerData, salesList, nextOrPreview] = await Promise.all([
    getPaymentsLedger(),
    getSalesForPayment(),
    getNextORNumberPreview(),
  ]);

  return (
    <div className="space-y-6">
      <PaymentsMainView
        initialPayments={ledgerData.items}
        salesList={salesList}
        metrics={ledgerData.metrics}
        recentAudits={ledgerData.recentAudits}
        userRole={user.role}
        nextOrPreview={nextOrPreview}
      />
    </div>
  );
}
