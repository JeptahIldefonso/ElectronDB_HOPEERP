'use client';

import React, { memo } from 'react';
import { ExternalLink, Info } from 'lucide-react';

export interface KpiCardItem {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  subtext: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  clickable?: boolean;
}

export interface RightSideKpiPanelProps {
  title?: string;
  subtitle?: string;
  cards: KpiCardItem[];
  className?: string;
  layout?: 'vertical' | 'grid';
}

export const RightSideKpiPanel = memo(function RightSideKpiPanel({
  title = 'Stats Bar',
  subtitle,
  cards,
  className = '',
  layout = 'vertical',
}: RightSideKpiPanelProps) {
  const isGrid = layout === 'grid';

  return (
    <div
      className={`${isGrid ? 'w-full font-sans' : 'w-full xl:w-[248px] shrink-0 font-sans'} ${className}`}
      aria-label={title}
    >
      {/* Slim Header */}
      {title && (
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#E2E7E4] dark:border-border">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F8B6B] animate-pulse shrink-0" />
            <h3 className="font-mono text-[10px] uppercase tracking-[0.12em] font-semibold text-[#6B7280] dark:text-text-muted truncate">
              {title}
            </h3>
          </div>
          {subtitle ? (
            <span className="font-mono text-[9px] text-[#6B7280] dark:text-text-muted shrink-0">
              {subtitle}
            </span>
          ) : (
            <span className="font-mono text-[9px] text-[#4F8B6B] bg-[#4F8B6B]/10 px-1.5 py-0.5 rounded-[2px] font-medium shrink-0">
              LIVE
            </span>
          )}
        </div>
      )}

      {/* KPI Cards Container */}
      <div className={isGrid ? 'grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3' : 'grid grid-cols-1 sm:grid-cols-2 xl:flex xl:flex-col gap-2.5'}>
        {cards.map((card) => {
          const Icon = card.icon;
          const isClickable = Boolean(card.onClick || card.clickable);

          const cardContent = (
            <div className="flex flex-col justify-between h-full min-h-[92px] px-3.5 py-2.5 sm:px-3.5 sm:py-3">
              {/* TOP: Small circular icon + Metric label + optional info/audit icon */}
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5.5 h-5.5 rounded-full bg-[#4F8B6B]/10 dark:bg-[#4F8B6B]/20 flex items-center justify-center text-[#4F8B6B] shrink-0">
                    <Icon className="w-3 h-3" />
                  </div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] dark:text-text-muted truncate">
                    {card.title}
                  </span>
                </div>

                {isClickable ? (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-mono text-[#0B1F2A] dark:text-white flex items-center gap-0.5 bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-[2px] shrink-0">
                    <span>Audit</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                ) : (
                  <Info className="w-2.5 h-2.5 text-[#6B7280]/40 dark:text-text-muted/40 shrink-0" />
                )}
              </div>

              {/* MIDDLE: Large metric value, 21-23px for slim profile */}
              <div className="mt-1.5 mb-0.5">
                <div className="flex items-baseline">
                  <span className="text-[21px] sm:text-[23px] font-bold font-mono tracking-tight text-[#0B1F2A] dark:text-white leading-none tabular-nums">
                    {card.value}
                  </span>
                  {card.unit && (
                    <span className="text-xs font-normal text-[#6B7280] dark:text-slate-400 ml-1 font-sans">
                      {card.unit}
                    </span>
                  )}
                </div>
              </div>

              {/* BOTTOM: Small descriptive supporting text in muted gray */}
              <div className="text-[10.5px] text-[#6B7280] dark:text-slate-400 font-sans truncate">
                {card.subtext}
              </div>
            </div>
          );

          if (isClickable) {
            return (
              <button
                key={card.id}
                type="button"
                onClick={card.onClick}
                className="group text-left rounded-[12px] border border-[#E2E7E4] dark:border-border bg-white dark:bg-surface-1 shadow-2xs hover:shadow-xs hover:border-[#4F8B6B]/40 dark:hover:border-white/30 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#4F8B6B]"
                title="Click to view calculation audit breakdown"
              >
                {cardContent}
              </button>
            );
          }

          return (
            <div
              key={card.id}
              className="rounded-[12px] border border-[#E2E7E4] dark:border-border bg-white dark:bg-surface-1 shadow-2xs transition-colors"
            >
              {cardContent}
            </div>
          );
        })}
      </div>
    </div>
  );
});
