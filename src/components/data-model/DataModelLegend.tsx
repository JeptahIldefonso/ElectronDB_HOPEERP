'use client';

import React from 'react';
import { MODULE_THEMES, WEBSITE_FUNCTIONS, type ModuleKey } from '@/lib/data-model';
import { Info, ArrowRight, FileSpreadsheet } from 'lucide-react';

interface DataModelLegendProps {
  viewMode: 'module' | 'function';
  selectedFunctionId: string | null;
}

export function DataModelLegend({ viewMode, selectedFunctionId }: DataModelLegendProps) {
  const activeFunction = WEBSITE_FUNCTIONS.find((f) => f.id === selectedFunctionId);

  return (
    <div className="space-y-3 font-sans select-none">
      {/* ── 1. Module Group Legend Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border bg-surface-1 text-xs">
        {/* Module Color Pills */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-faint font-semibold">
            MODULES:
          </span>
          {Object.values(MODULE_THEMES).map((theme) => (
            <div key={theme.key} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                style={{ backgroundColor: theme.hex }}
              />
              <span className="font-medium text-text text-[11.5px]">
                {theme.name}
              </span>
            </div>
          ))}
        </div>

        {/* Cross-Cutting Reports Note */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-dashed border-pink-500/40 bg-pink-500/5 text-pink-700 dark:text-pink-300 text-[11px]">
          <FileSpreadsheet className="w-3.5 h-3.5 text-pink-500 shrink-0" />
          <span>Reports read across all 10 canonical tables dynamically</span>
        </div>
      </div>

      {/* ── 2. Numbered Flow Path (When Function Selected) ── */}
      {viewMode === 'function' && activeFunction && (
        <div className="p-4 rounded-xl border border-border bg-surface-1 shadow-2xs space-y-3 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: activeFunction.color }}
              />
              <span className="font-editorial italic text-base text-text">
                {activeFunction.name} &mdash; Data Flow Path
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase text-text-muted">
              {activeFunction.steps.length} Steps
            </span>
          </div>

          {/* Step Sequence Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {activeFunction.steps.map((st) => (
              <div
                key={st.step}
                className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-surface-2/40"
              >
                <span
                  className="w-5 h-5 rounded-full text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: activeFunction.color }}
                >
                  {st.step}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-text text-xs truncate">
                      {st.title}
                    </span>
                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-surface-3 text-text-muted">
                      {st.table}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-text-muted mt-0.5 leading-snug">
                    {st.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
