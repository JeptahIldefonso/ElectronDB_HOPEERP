'use client';

import React from 'react';
import Image from 'next/image';

interface TeamMember {
  role: string;
  name: string;
  handle: string;
  initials: string;
  avatar?: string;
}

const MEMBERS: TeamMember[] = [
  {
    role: 'ScrumMaster',
    name: 'DE LEON, Sean Arrul',
    handle: '@seanarrul',
    initials: 'SD',
    avatar: '/avatars/default-avatar.jpg',
  },
  {
    role: 'DB Admin',
    name: 'DELA CRUZ, Veil',
    handle: '@veil',
    initials: 'VD',
    avatar: '/avatars/default-avatar.jpg',
  },
  {
    role: 'Tester',
    name: 'ECHAGUE, Arielle',
    handle: '@arielle',
    initials: 'AE',
    avatar: '/avatars/default-avatar.jpg',
  },
  {
    role: 'UI Designer',
    name: 'CASING, Christian Jay',
    handle: '@christianjay',
    initials: 'CC',
    avatar: '/avatars/default-avatar.jpg',
  },
  {
    role: 'Developer',
    name: 'Ildefonso, Jeptah Ashley',
    handle: '@jeptah',
    initials: 'JI',
    avatar: '/avatars/default-avatar.jpg',
  },
];

const DISPLAY_NAMES: Record<string, string> = {
  '@seanarrul': 'Sean Arrul De Leon',
  '@veil': 'Veil Dela Cruz',
  '@arielle': 'Arielle Echague',
  '@christianjay': 'Christian Jay Casing',
  '@jeptah': 'Jeptah Ashley Ildefonso',
};

export function ProjectTeamCard() {
  return (
    <article
      aria-label="Project Team Credits"
      className="w-full min-h-[440px] p-5 sm:p-6 rounded-[16px] border border-panel-border bg-panel-navy shadow-[0_1px_2px_rgba(0,0,0,0.20),0_16px_40px_-16px_rgba(6,15,25,0.55)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.40)] flex flex-col justify-between font-sans transition-colors duration-150 animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none select-none"
    >
      {/* ── 1. Formal Header ── */}
      <div className="pb-4 mb-4 border-b border-panel-border select-none">
        <span className="block font-mono text-[10px] tracking-[0.16em] uppercase text-panel-text-muted leading-none">
          PROJECT TEAM
        </span>
        <h2 className="font-editorial italic text-[18px] text-panel-text font-normal leading-tight mt-1.5">
          Group 4 ElectronDB
        </h2>
        <p className="font-mono text-[10.5px] text-panel-text-muted mt-1 leading-tight tracking-tight">
          2 BSCS 1 &bull; 5 contributors
        </p>
      </div>

      {/* ── 2. Members Vertical Timeline ── */}
      <div className="relative my-auto py-1">
        {/* Continuous 1px vertical hairline connecting the avatars */}
        <div
          className="absolute left-[17.5px] top-4 bottom-4 w-px bg-white/[0.15]"
          aria-hidden="true"
        />

        <div className="space-y-4">
          {MEMBERS.map((member) => {
            const displayName = DISPLAY_NAMES[member.handle] || member.name;
            return (
              <div
                key={member.handle}
                title={`${displayName} (${member.handle}) — ${member.role}`}
                className="group relative flex items-center gap-3.5 px-2 py-1.5 -mx-2 rounded-lg hover:bg-white/[0.04] transition-colors duration-150 cursor-default select-none min-h-[56px]"
              >
                {/* 36px circular avatar with permanent default avatar image */}
                <div className="relative z-10 w-9 h-9 rounded-full ring-1 ring-white/[0.18] group-hover:ring-panel-accent bg-panel-navy-raised overflow-hidden shrink-0 shadow-2xs transition-colors duration-150">
                  <Image
                    src={member.avatar || '/avatars/default-avatar.jpg'}
                    alt={displayName}
                    width={36}
                    height={36}
                    className="w-full h-full object-cover select-none pointer-events-none"
                    priority
                  />
                </div>

                {/* Name & Monospace Role */}
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                  <span className="text-[13.5px] font-medium text-panel-text leading-snug truncate">
                    {displayName}
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-panel-text-muted leading-tight mt-0.5 truncate">
                    {member.role}
                  </span>
                </div>

                {/* @handle Tooltip: dark navy background, light text, matching border */}
                <div
                  role="tooltip"
                  className="pointer-events-none absolute left-12 bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-30 px-2 py-0.5 rounded-[4px] text-[10.5px] font-mono tracking-tight whitespace-nowrap bg-panel-navy text-panel-text border border-panel-border shadow-[0_4px_12px_rgba(0,0,0,0.45)]"
                >
                  {member.handle}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. Subtle Monospace Footer ── */}
      <div className="pt-4 mt-4 border-t border-panel-border flex items-center justify-center select-none">
        <span className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-panel-text-muted/70">
          ELECTRONDB &bull; HOPEERP
        </span>
      </div>
    </article>
  );
}
