import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { canAccess } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ orNo: string }>;
}

export default async function LegacyPaymentReceiptPage({ params }: PageProps) {
  const [user, { orNo }] = await Promise.all([getCurrentUser(), params]);

  if (!user) redirect('/login');
  if (!canAccess(user.role, 'payments', user.rights || [])) {
    redirect('/?denied=1');
  }

  redirect(`/receipts/${orNo}`);
}
