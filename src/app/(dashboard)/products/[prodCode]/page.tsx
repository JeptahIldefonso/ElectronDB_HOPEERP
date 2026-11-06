import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { canAccess } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ prodCode: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const [user, { prodCode }] = await Promise.all([getCurrentUser(), params]);

  if (!user) redirect('/login');
  if (!canAccess(user.role, 'products', user.rights || [])) {
    redirect('/?denied=1');
  }

  redirect(`/products?code=${encodeURIComponent(prodCode)}`);
}
