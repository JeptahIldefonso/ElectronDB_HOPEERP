'use client';

import React, { useState } from 'react';
import { WelcomeStrip } from './WelcomeStrip';
import { DashboardHeader } from './DashboardHeader';
import { DashboardKpis } from './DashboardKpis';
import { QuickActions } from './QuickActions';
import type { HomeKPIData } from '@/lib/data/home';
import type { DisplayDbStatus } from './DbStatusPill';

interface HomeMainViewProps {
  fullName: string;
  userRole?: string | null;
  userRights?: string[];
  deniedNotice?: boolean;
  kpis?: HomeKPIData | null;
}

export function HomeMainView({
  fullName,
  userRole,
  userRights = [],
  deniedNotice = false,
  kpis,
}: HomeMainViewProps) {
  const [dbStatus, setDbStatus] = useState<DisplayDbStatus>('connected');

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 1. Welcome Strip & Access Denied Notification Banner */}
      <WelcomeStrip
        fullName={fullName}
        role={userRole}
        deniedNotice={deniedNotice}
      />

      {/* 2. Dashboard Header with Click-to-Verify Status Pill */}
      <DashboardHeader onDbStatusChange={setDbStatus} />

      {/* 3. Live KPI Monitoring Cards */}
      {kpis && (
        <section aria-label="Key Performance Indicators" className="w-full">
          <DashboardKpis
            kpis={kpis}
            layout="grid"
          />
        </section>
      )}

      {/* 4. Role-Aware Quick Actions Bar (Greyed out & locked for ungranted modules) */}
      <section aria-label="Quick Navigation Shortcuts" className="w-full pt-1">
        <QuickActions userRole={userRole} userRights={userRights} />
      </section>
    </div>
  );
}
