import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { ChangePasswordForm } from './ChangePasswordForm';

export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <ChangePasswordForm
      email={user.email}
      fullName={user.fullName || 'User'}
      mustChangePassword={Boolean(user.mustChangePassword)}
    />
  );
}
