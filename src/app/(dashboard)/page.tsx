import React from 'react';
import { getCurrentUser } from '@/app/actions/auth';
import { getHomeSummary } from '@/lib/data/home';
import { HomeMainView } from '@/components/home/HomeMainView';
import { ProjectTeamCard } from '@/components/home/ProjectTeamCard';
import { redirect } from 'next/navigation';

export const revalidate = 30;

interface PageProps {
  searchParams: Promise<{ forceFailure?: string; view?: string; denied?: string }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const [user, params] = await Promise.all([
    getCurrentUser(),
    searchParams,
  ]);

  if (!user) {
    redirect('/login');
  }

  const forceFailure = params?.forceFailure === '1';
  const deniedNotice = params?.denied === '1';
  const summary = await getHomeSummary(forceFailure);
  const data = summary.data;

  return (
    <div className="flex flex-col min-[1200px]:grid min-[1200px]:grid-cols-[minmax(0,1fr)_288px] min-[1200px]:gap-x-10 gap-y-8 max-w-[1440px] mx-auto pb-10 font-sans items-start">
      {/* ── Main Content Column (Role-Aware Welcome, DB Status Pill, KPIs, Quick Actions) ── */}
      <div className="min-w-0 w-full space-y-4 sm:space-y-5">
        <HomeMainView
          fullName={user.fullName || 'User'}
          userRole={user.role}
          userRights={user.rights || []}
          deniedNotice={deniedNotice}
          kpis={data?.kpis || null}
        />
      </div>

      {/* ── Right Rail: Dedicated Team Credits Panel Only (Clean & Focused) ── */}
      <aside
        aria-label="Team Credits"
        className="w-full max-w-[480px] min-[1200px]:max-w-[288px] min-[1200px]:w-[288px] shrink-0 min-[1200px]:sticky min-[1200px]:top-24 min-[1200px]:mr-6 self-start"
      >
        <ProjectTeamCard />
      </aside>
    </div>
  );
}
