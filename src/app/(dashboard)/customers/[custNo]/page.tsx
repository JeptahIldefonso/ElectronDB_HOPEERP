import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { canAccess } from '@/lib/permissions';

interface PageProps {
  params: Promise<{ custNo: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const [user, { custNo }] = await Promise.all([getCurrentUser(), params]);

  if (!user) redirect('/login');
  if (!canAccess(user.role, 'customer', user.rights || [])) {
    redirect('/?denied=1');
  }

  redirect(`/customers?custNo=${custNo}`);
}
