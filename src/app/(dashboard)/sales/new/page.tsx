import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { canAccess } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export default async function NewSalePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!canAccess(user.role, 'sales', user.rights || [])) {
    redirect('/?denied=1');
  }
  redirect('/sales');
}
