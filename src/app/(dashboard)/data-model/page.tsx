import React from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { DataModelMainView } from '@/components/data-model/DataModelMainView';

export const metadata: Metadata = {
  title: 'Data Model — HOPE, Inc. Relational Architecture',
  description:
    'Interactive 3NF relational data model diagram for HOPE, Inc. ERP, mapping 10 canonical tables and 9 foreign key relationships.',
};

export default async function DataModelPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="fixed top-14 bottom-0 left-0 lg:left-64 right-0 z-20 bg-bg flex flex-col overflow-hidden h-[calc(100vh-56px)]">
      <DataModelMainView
        userRole={user.role}
        userRights={user.rights || []}
      />
    </div>
  );
}
