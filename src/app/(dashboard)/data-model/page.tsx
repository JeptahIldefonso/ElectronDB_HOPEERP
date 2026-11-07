import React from 'react';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';

export const metadata: Metadata = {
  title: 'Data Model — HOPE, Inc. Relational Architecture',
  description:
    'Interactive 3NF relational data model diagram for HOPE, Inc. ERP, mapping 10 canonical tables and 9 foreign key relationships.',
};

// Code-split heavy data-model SVG diagram and export tools to optimize bundle size (PERFORMANCE.md)
const DataModelMainView = dynamic(
  () => import('@/components/data-model/DataModelMainView').then((mod) => mod.DataModelMainView),
  {
    loading: () => (
      <div className="flex h-full w-full items-center justify-center p-8 bg-surface-1">
        <div className="animate-pulse font-mono text-xs text-text-muted">Loading Data Model Diagram...</div>
      </div>
    ),
  }
);

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
