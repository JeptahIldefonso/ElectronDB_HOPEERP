'use client';

import React from 'react';
import {
  Layers,
  Workflow,
  Download,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { WEBSITE_FUNCTIONS, type WebsiteFunction } from '@/lib/data-model';

interface DataModelToolbarProps {
  viewMode: 'module' | 'function';
  onViewModeChange: (mode: 'module' | 'function') => void;
  selectedFunctionId: string | null;
  onSelectFunctionId: (id: string | null) => void;
  onDownloadSvg: () => void;
  onDownloadPng: () => void;
  isDownloadingPng?: boolean;
}

export function DataModelToolbar({
  viewMode,
  onViewModeChange,
  selectedFunctionId,
  onSelectFunctionId,
  onDownloadSvg,
  onDownloadPng,
  isDownloadingPng = false,
}: DataModelToolbarProps) {
  return (
    <div className="space-y-3 font-sans select-none">
      {/* ── Upper Control Bar: Mode Toggle & Export Buttons ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-xl border border-border bg-surface-1 shadow-2xs">
        {/* View Mode Segmented Switch */}
        <div className="flex items-center p-1 rounded-lg bg-surface-2 border border-border">
          <button
            type="button"
            onClick={() => {
              onViewModeChange('module');
              onSelectFunctionId(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'module'
                ? 'bg-surface-1 text-text shadow-xs font-semibold'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Group by Module</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onViewModeChange('function');
              if (!selectedFunctionId) {
                onSelectFunctionId(WEBSITE_FUNCTIONS[0].id);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'function'
                ? 'bg-surface-1 text-text shadow-xs font-semibold'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>Group by Function</span>
          </button>
        </div>

        {/* Export / Presentation Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDownloadSvg}
            title="Download vector SVG diagram for presentations"
            aria-label="Download SVG diagram"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 text-text text-xs font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-text-muted" />
            <span>Download SVG</span>
          </button>

          <button
            type="button"
            onClick={onDownloadPng}
            disabled={isDownloadingPng}
            title="Download high-resolution PNG diagram"
            aria-label="Download PNG diagram"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 text-text text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <ImageIcon className="w-3.5 h-3.5 text-text-muted" />
            <span>{isDownloadingPng ? 'Generating PNG...' : 'Download PNG'}</span>
          </button>
        </div>
      </div>

      {/* ── Function View Filter Chips ── */}
      {viewMode === 'function' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 animate-in fade-in-50 duration-150">
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-faint shrink-0 pl-1">
            FUNCTIONS:
          </span>
          {WEBSITE_FUNCTIONS.map((fn) => {
            const isSelected = selectedFunctionId === fn.id;
            return (
              <button
                key={fn.id}
                type="button"
                onClick={() => onSelectFunctionId(isSelected ? null : fn.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'border-transparent text-white shadow-xs'
                    : 'border-border bg-surface-1 text-text-muted hover:text-text hover:bg-surface-2'
                }`}
                style={isSelected ? { backgroundColor: fn.color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: isSelected ? '#ffffff' : fn.color }}
                />
                <span>{fn.name}</span>
                {isSelected && <Check className="w-3 h-3 shrink-0 stroke-[2.5]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
