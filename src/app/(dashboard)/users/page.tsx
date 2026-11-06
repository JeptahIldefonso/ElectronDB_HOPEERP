import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { canAccess } from '@/lib/permissions';
import { getAllUsers } from '@/lib/auth-db';
import { UserManagementView } from '@/components/users/UserManagementView';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Route Guard: User Management access (Superadmin & Admin only - A5)
  if (!canAccess(user.role, 'user-management', user.rights || [])) {
    redirect('/?denied=1');
  }

  const users = getAllUsers(user.role);

  return (
    <div className="space-y-6">
      <UserManagementView
        initialUsers={users}
        currentUserRole={user.role}
      />
    </div>
  );
}
