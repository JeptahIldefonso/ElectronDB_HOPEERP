'use client';

import React from 'react';
import {
  X,
  GitCommit,
  Code2,
  FileText,
  Workflow,
  CheckCircle2,
} from 'lucide-react';
import {
  DATA_MODEL_RELATIONSHIPS,
  DATA_MODEL_TABLES,
  MODULE_THEMES,
  WEBSITE_FUNCTIONS,
  type RelationshipDefinition,
} from '@/lib/data-model';

interface RelationshipDetailDrawerProps {
  relationshipId: string | null;
  onClose: () => void;
}

export function RelationshipDetailDrawer({
  relationshipId,
  onClose,
}: RelationshipDetailDrawerProps) {
  if (!relationshipId) return null;
  const rel = DATA_MODEL_RELATIONSHIPS.find((r) => r.id === relationshipId);
  if (!rel) return null;

  const parentTable = DATA_MODEL_TABLES[rel.parent];
  const childTable = DATA_MODEL_TABLES[rel.child];
  const parentTheme = parentTable ? MODULE_THEMES[parentTable.module] : MODULE_THEMES.sales;
  const childTheme = childTable ? MODULE_THEMES[childTable.module] : MODULE_THEMES.sales;

  const involvedFunctions = WEBSITE_FUNCTIONS.filter((f) =>
    f.involvedRelationshipIds.includes(rel.id)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Relationship details for ${rel.label}`}
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[300px] max-w-[300px] bg-surface-1 border-l border-border shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-200"
    >
      {/* ── 1. Drawer Header ── */}
      <div className="p-3.5 border-b border-border flex items-start justify-between gap-2.5 bg-surface-2/40">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-mono text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#041a24]/10 text-[#041a24] dark:bg-slate-800 dark:text-slate-200">
              FOREIGN KEY RELATION
            </span>
            <span className="font-mono text-[9.5px] text-text-muted">
              1 : {rel.childCardinality}
            </span>
          </div>
          <h2 className="font-editorial italic text-base font-normal text-text tracking-tight truncate">
            {rel.parent} &rarr; {rel.child}
          </h2>
          <p className="font-sans text-[11px] text-text-muted mt-0.5 leading-snug">
            {rel.cardinalityText}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-3 transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── 2. Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs">
        {/* Parent & Child Entity Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg border border-border bg-surface-2/30 space-y-0.5">
            <span className="font-mono text-[8.5px] uppercase tracking-wider text-text-faint font-semibold block">
              PARENT (ONE)
            </span>
            <span className="font-mono text-[12px] font-bold text-text block truncate">
              {rel.parent}
            </span>
            <span className={`inline-block px-1.5 py-0.2 rounded text-[8.5px] font-mono font-medium ${parentTheme.badgeBg} ${parentTheme.badgeText}`}>
              {parentTheme.name}
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-border bg-surface-2/30 space-y-0.5">
            <span className="font-mono text-[8.5px] uppercase tracking-wider text-text-faint font-semibold block">
              CHILD (MANY)
            </span>
            <span className="font-mono text-[12px] font-bold text-text block truncate">
              {rel.child}
            </span>
            <span className={`inline-block px-1.5 py-0.2 rounded text-[8.5px] font-mono font-medium ${childTheme.badgeBg} ${childTheme.badgeText}`}>
              {childTheme.name}
            </span>
          </div>
        </div>

        {/* Foreign Key Constraint */}
        <div className="p-2.5 rounded-lg border border-border bg-surface-2/40 space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-text-faint font-semibold block">
            FOREIGN KEY DEFINITION
          </span>
          <div className="font-mono text-[11px] font-semibold text-text bg-surface-1 p-1.5 rounded border border-border">
            {rel.fkCols}
          </div>
          <p className="text-[10px] text-text-muted">
            Enforced with <code className="font-mono">PRAGMA foreign_keys = ON</code>.
          </p>
        </div>

        {/* Implementation in Code (SQL JOIN & File Reference) */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-text-faint font-semibold">
            <Code2 className="w-3 h-3" />
            <span>SQL JOIN IN APP CODE</span>
          </div>
          <div className="rounded-lg border border-border bg-[#0d1520] p-2 text-white font-mono text-[10px] leading-relaxed overflow-x-auto">
            <code>{rel.joinSQL}</code>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <FileText className="w-3 h-3 text-text-faint" />
            <span>Citation: </span>
            <span className="font-mono font-medium text-text">{rel.codeCitation}</span>
          </div>
        </div>

        {/* Pages Utilizing This Relationship */}
        <div className="space-y-1.5">
          <span className="font-mono text-[9px] uppercase tracking-wider text-text-faint font-semibold block">
            PAGES & ROUTES USING JOIN
          </span>
          <div className="flex flex-wrap gap-1">
            {rel.usedByPages.map((page) => (
              <span
                key={page}
                className="font-mono text-[9.5px] px-2 py-0.5 rounded border border-border bg-surface-2 text-text"
              >
                {page}
              </span>
            ))}
          </div>
        </div>

        {/* Involved Functions */}
        {involvedFunctions.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-text-faint font-semibold">
              <Workflow className="w-3 h-3" />
              <span>INVOLVED IN FUNCTIONS</span>
            </div>
            <div className="space-y-1">
              {involvedFunctions.map((fn) => (
                <div
                  key={fn.id}
                  className="p-2 rounded-lg border border-border bg-surface-2/30 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-1">
                    <span className="font-medium text-[11px] text-text block truncate">{fn.name}</span>
                    <span className="text-[9.5px] text-text-muted block truncate">{fn.tagline}</span>
                  </div>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: fn.color }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. Drawer Footer ── */}
      <div className="px-3.5 py-2.5 border-t border-border bg-surface-2/30 flex items-center justify-between">
        <span className="font-mono text-[9.5px] text-text-muted">
          Crow&apos;s Foot Notation
        </span>
        <button
          type="button"
          onClick={onClose}
          className="px-2.5 py-1 text-xs font-medium rounded-md bg-surface-3 hover:bg-surface-4 text-text transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}
