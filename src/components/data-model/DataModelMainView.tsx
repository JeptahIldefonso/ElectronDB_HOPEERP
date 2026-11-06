'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  Workflow,
  Download,
  Image as ImageIcon,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Lock,
  X,
} from 'lucide-react';
import { DataModelDiagram } from './DataModelDiagram';
import {
  DATA_MODEL_TABLES,
  DATA_MODEL_RELATIONSHIPS,
  MODULE_THEMES,
  WEBSITE_FUNCTIONS,
  TABLE_PLAIN_ENGLISH,
  type ModuleKey,
  type TableDefinition,
} from '@/lib/data-model';
import { canAccess } from '@/lib/permissions';

interface DataModelMainViewProps {
  userRole?: string | null;
  userRights?: string[];
}

function isPageAllowed(
  href: string,
  userRole?: string | null,
  userRights: string[] = []
): boolean {
  if (href === '/') return true; // Home is always allowed
  if (href.startsWith('/sales')) return canAccess(userRole, 'sales', userRights);
  if (href.startsWith('/customers')) return canAccess(userRole, 'customer', userRights);
  if (href.startsWith('/payments') || href.startsWith('/receipts'))
    return canAccess(userRole, 'payments', userRights);
  if (href.startsWith('/products')) return canAccess(userRole, 'products', userRights);
  if (href.startsWith('/employees') || href.startsWith('/human-resources'))
    return canAccess(userRole, 'human-resources', userRights);
  if (href.startsWith('/reports')) return canAccess(userRole, 'reports', userRights);
  if (href.startsWith('/users') || href.startsWith('/user-management'))
    return canAccess(userRole, 'user-management', userRights);
  return true;
}

export function DataModelMainView({ userRole, userRights = [] }: DataModelMainViewProps) {
  const [viewMode, setViewMode] = useState<'module' | 'function'>('module');
  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(
    WEBSITE_FUNCTIONS[0].id
  );
  const [selectedModuleKey, setSelectedModuleKey] = useState<ModuleKey | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);
  const [rowCounts, setRowCounts] = useState<Record<string, number>>({});
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);

  // Active website function
  const activeFunction =
    WEBSITE_FUNCTIONS.find((f) => f.id === selectedFunctionId) || WEBSITE_FUNCTIONS[0];

  // Active relationship
  const selectedRelationship = DATA_MODEL_RELATIONSHIPS.find(
    (r) => r.id === selectedRelationshipId
  );

  // Global Esc key listener to dismiss table or relationship selection
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedTable(null);
        setSelectedRelationshipId(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch live row counts client-side after initial render
  useEffect(() => {
    let active = true;
    fetch('/api/health/db')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.tables && Array.isArray(data.tables)) {
          const counts: Record<string, number> = {};
          data.tables.forEach((t: { name: string; rows: number }) => {
            counts[t.name] = t.rows;
          });
          setRowCounts(counts);
        }
      })
      .catch(() => {
        // Non-blocking fallback to schema fallback counts
      });

    return () => {
      active = false;
    };
  }, []);

  // Export SVG handler
  const handleDownloadSvg = () => {
    const svgElem = document.getElementById('hope-erd-svg');
    if (!svgElem) return;

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElem);

    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hope-erd-relational-model.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export PNG handler (Zero third-party dependencies using native canvas)
  const handleDownloadPng = async () => {
    const svgElem = document.getElementById('hope-erd-svg');
    if (!svgElem) return;

    try {
      setIsDownloadingPng(true);
      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svgElem);
      if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1800; // 2x presentation resolution
        canvas.height = 1500;
        const context = canvas.getContext('2d');
        if (context) {
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);

          const pngUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = 'hope-erd-relational-model.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        URLObj.revokeObjectURL(blobURL);
        setIsDownloadingPng(false);
      };
      image.src = blobURL;
    } catch {
      setIsDownloadingPng(false);
    }
  };

  // Module tables list for left inspector in module mode
  const allTablesList = Object.values(DATA_MODEL_TABLES);
  const displayTablesList = selectedModuleKey
    ? allTablesList.filter((t) => t.module === selectedModuleKey)
    : allTablesList;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden font-sans select-none bg-bg text-text">
      {/* ── 1. COMPACT SINGLE-ROW HEADER & VIEW SWITCHER (48px height) ── */}
      <header className="h-12 px-5 py-2 border-b border-border bg-white dark:bg-surface-1 flex items-center justify-between shrink-0 select-none">
        {/* Left: Title + Inline Mono Spec Badge */}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-editorial italic font-normal text-text tracking-tight leading-none">
            Data Model
          </h1>
          <span className="text-[11px] font-mono text-slate-500 dark:text-text-muted px-2 py-0.5 rounded border border-border bg-surface-2 leading-none">
            10 TABLES &bull; 9 RELATIONSHIPS
          </span>
        </div>

        {/* Right: Slim Segmented Mode Toggle & Slim Export Buttons */}
        <div className="flex items-center gap-2">
          {/* Segmented Mode Switch */}
          <div className="flex items-center p-0.5 rounded-lg bg-surface-2 border border-border">
            <button
              type="button"
              onClick={() => {
                setViewMode('module');
              }}
              className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'module'
                  ? 'bg-surface-1 text-text shadow-2xs font-semibold'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Group by Module</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode('function');
                if (!selectedFunctionId) {
                  setSelectedFunctionId(WEBSITE_FUNCTIONS[0].id);
                }
              }}
              className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'function'
                  ? 'bg-surface-1 text-text shadow-2xs font-semibold'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>Group by Function</span>
            </button>
          </div>

          {/* Slim Export Buttons */}
          <button
            type="button"
            onClick={handleDownloadSvg}
            title="Download vector SVG diagram"
            aria-label="Download SVG"
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-surface-2 hover:bg-surface-3 text-text text-xs font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3 text-text-muted" />
            <span className="hidden sm:inline">Download SVG</span>
            <span className="sm:hidden">SVG</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={isDownloadingPng}
            title="Download 2x PNG diagram"
            aria-label="Download PNG"
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border bg-surface-2 hover:bg-surface-3 text-text text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <ImageIcon className="w-3 h-3 text-text-muted" />
            <span className="hidden sm:inline">
              {isDownloadingPng ? 'PNG...' : 'Download PNG'}
            </span>
            <span className="sm:hidden">PNG</span>
          </button>
        </div>
      </header>

      {/* ── 2. UNIFIED FILTER & MODULE BAR (38px height) ── */}
      <div className="h-[38px] px-5 py-1 border-b border-border bg-slate-50/70 dark:bg-surface-2/40 flex items-center justify-between gap-2 shrink-0 select-none overflow-x-auto">
        {/* Left Side: Filter Pills (Functions or Modules in the exact same 38px slot) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {viewMode === 'function' ? (
            <>
              <span className="font-mono text-[10px] uppercase tracking-wider text-text-faint font-semibold shrink-0">
                FUNCTIONS:
              </span>
              {WEBSITE_FUNCTIONS.map((fn) => {
                const isSelected = selectedFunctionId === fn.id;
                return (
                  <button
                    key={fn.id}
                    type="button"
                    onClick={() => setSelectedFunctionId(fn.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                      isSelected
                        ? 'border-transparent text-white shadow-2xs font-semibold'
                        : 'border-border bg-surface-1 text-text-muted hover:text-text hover:bg-surface-2'
                    }`}
                    style={isSelected ? { backgroundColor: fn.color } : {}}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: isSelected ? '#ffffff' : fn.color }}
                    />
                    <span>{fn.name}</span>
                    {isSelected && <Check className="w-3 h-3 shrink-0 stroke-[2.5]" />}
                  </button>
                );
              })}
            </>
          ) : (
            <>
              <span className="font-mono text-[10px] uppercase tracking-wider text-text-faint font-semibold shrink-0">
                MODULES:
              </span>
              {Object.values(MODULE_THEMES).map((m) => {
                const isSelected = selectedModuleKey === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() =>
                      setSelectedModuleKey(isSelected ? null : m.key)
                    }
                    className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                      isSelected
                        ? 'border-transparent text-white shadow-2xs font-semibold'
                        : 'border-border bg-surface-1 text-text-muted hover:text-text hover:bg-surface-2'
                    }`}
                    style={isSelected ? { backgroundColor: m.hex } : {}}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: isSelected ? '#ffffff' : m.hex }}
                    />
                    <span>{m.name}</span>
                    {isSelected && <Check className="w-3 h-3 shrink-0 stroke-[2.5]" />}
                  </button>
                );
              })}
              {selectedModuleKey && (
                <button
                  type="button"
                  onClick={() => setSelectedModuleKey(null)}
                  className="text-[10px] text-text-faint hover:text-text font-mono underline ml-1 cursor-pointer shrink-0"
                >
                  Show all
                </button>
              )}
            </>
          )}
        </div>

        {/* Right Side: Dynamic Status Chip */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-dashed border-border bg-surface-1 text-[11px] text-text-muted font-sans shrink-0 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="truncate max-w-[340px]">
            {viewMode === 'function' && activeFunction
              ? activeFunction.tagline
              : 'Reports read across all 10 canonical tables dynamically'}
          </span>
        </div>
      </div>

      {/* ── 3. SIDE-BY-SIDE SPLIT WORKBENCH ── */}
      <div className="flex-1 min-h-0 grid grid-cols-[280px_1fr] gap-3 p-3 overflow-hidden">
        {/* ── A. LEFT INSPECTOR PANEL ── */}
        <aside className="w-[280px] h-full overflow-y-auto rounded-lg border border-border bg-white dark:bg-surface-1 p-3 flex flex-col gap-2 font-sans select-none shadow-2xs">
          {viewMode === 'function' && activeFunction ? (
            <>
              {/* Function Flow Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: activeFunction.color }}
                  />
                  <h3 className="font-editorial italic text-[15px] text-text font-normal truncate">
                    {activeFunction.name}
                  </h3>
                </div>
                <span className="font-mono text-[9.5px] uppercase px-1.5 py-0.5 rounded bg-surface-2 text-text-muted shrink-0 font-semibold">
                  {activeFunction.steps.length} STEPS
                </span>
              </div>

              {/* Vertical Step Sequence List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                {activeFunction.steps.map((st) => (
                  <div
                    key={st.step}
                    className="p-2 rounded-lg border border-border bg-surface-2/40 text-xs flex flex-col gap-1 hover:border-border-emphasis transition-colors"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-4 h-4 rounded-full text-white font-mono font-bold text-[9px] flex items-center justify-center shrink-0 shadow-2xs"
                          style={{ backgroundColor: activeFunction.color }}
                        >
                          {st.step}
                        </span>
                        <span className="font-semibold text-text text-[11.5px] truncate">
                          {st.title}
                        </span>
                      </div>
                      <span className="font-mono text-[8.5px] uppercase px-1.5 py-0.5 rounded bg-surface-3 text-text font-bold shrink-0">
                        {st.table}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-snug">
                      {st.description}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Module Breakdown Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                    style={{
                      backgroundColor: selectedModuleKey
                        ? MODULE_THEMES[selectedModuleKey].hex
                        : '#3b82f6',
                    }}
                  />
                  <h3 className="font-editorial italic text-[15px] text-text font-normal truncate">
                    {selectedModuleKey
                      ? MODULE_THEMES[selectedModuleKey].name
                      : 'All Module Tables'}
                  </h3>
                </div>
                <span className="font-mono text-[9.5px] uppercase px-1.5 py-0.5 rounded bg-surface-2 text-text-muted shrink-0 font-semibold">
                  {displayTablesList.length} TABLES
                </span>
              </div>

              {/* Vertical Tables List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 pt-1">
                {displayTablesList.map((table) => {
                  const theme = MODULE_THEMES[table.module];
                  const isSelected = selectedTable === table.name;
                  const liveCount =
                    rowCounts[table.name] ?? table.fallbackRowCount;
                  const plainEnglish = TABLE_PLAIN_ENGLISH[table.name];

                  return (
                    <div
                      key={table.name}
                      className={`rounded-lg border text-xs transition-all overflow-hidden ${
                        isSelected
                          ? 'border-accent bg-surface-1 shadow-2xs ring-1 ring-accent/30'
                          : 'border-border bg-surface-2/40 hover:bg-surface-2 hover:border-border-emphasis'
                      }`}
                    >
                      {/* Compact Header Row */}
                      <button
                        type="button"
                        id={`table-btn-${table.name}`}
                        aria-expanded={isSelected}
                        aria-controls={`table-desc-${table.name}`}
                        onClick={() => {
                          setSelectedTable(isSelected ? null : table.name);
                          setSelectedRelationshipId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setSelectedTable(null);
                          }
                        }}
                        className="w-full p-2.5 flex items-center justify-between gap-2 text-left cursor-pointer transition-colors outline-none focus-visible:ring-1 focus-visible:ring-accent"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: theme.hex }}
                          />
                          <span className="font-mono font-bold text-text text-[12px] tracking-tight truncate">
                            {table.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-surface-3 text-text-muted">
                            {liveCount} rows
                          </span>
                          {isSelected ? (
                            <ChevronUp className="w-3.5 h-3.5 text-accent shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-text-faint shrink-0" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Inline Plain-English Summary */}
                      {isSelected && plainEnglish && (
                        <div
                          id={`table-desc-${table.name}`}
                          role="region"
                          aria-labelledby={`table-btn-${table.name}`}
                          className="px-3 pb-3 pt-1 border-t border-border/50 flex flex-col gap-2.5 bg-surface-1 text-text animate-in fade-in duration-150"
                        >
                          {/* 1. How it is used (Plain English) */}
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-[9px] uppercase tracking-wider text-text-faint font-semibold">
                              How it is used
                            </span>
                            <p className="text-[11.5px] text-text leading-snug font-normal">
                              {plainEnglish.howItIsUsed}
                            </p>
                          </div>

                          {/* 2. Where to find it on the website */}
                          <div className="flex flex-col gap-1.5">
                            <span className="font-mono text-[9px] uppercase tracking-wider text-text-faint font-semibold">
                              Where to find it on website
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {plainEnglish.whereToFind.map((dest) => {
                                const allowed = isPageAllowed(dest.href, userRole, userRights);
                                return allowed ? (
                                  <Link
                                    key={dest.label}
                                    href={dest.href}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-surface-2 hover:bg-surface-3 text-text border border-border transition-colors hover:border-border-emphasis group"
                                  >
                                    <span>{dest.label}</span>
                                    <ExternalLink className="w-2.5 h-2.5 text-text-faint group-hover:text-accent shrink-0" />
                                  </Link>
                                ) : (
                                  <span
                                    key={dest.label}
                                    title="Not granted. Contact an Admin."
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-surface-2 text-text-muted/60 border border-border/60 cursor-not-allowed select-none"
                                  >
                                    <Lock className="w-2.5 h-2.5 text-text-muted/70 shrink-0" />
                                    <span>{dest.label}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </aside>

        {/* ── B. RIGHT FULL-HEIGHT ERD CANVAS (Unobstructed & Wide) ── */}
        <main className="h-full w-full min-h-0 flex flex-col overflow-hidden rounded-lg bg-surface-1 border border-border">
          {/* Normal page-flow callout bar when a Table is Selected (pushes diagram down) */}
          {selectedTable && TABLE_PLAIN_ENGLISH[selectedTable] && (
            <div className="shrink-0 border-b border-border bg-slate-50/90 dark:bg-surface-2/60 px-3.5 py-2 flex items-center justify-between gap-3 text-xs transition-all animate-in fade-in duration-150">
              {/* Left: Table Name Pill + Plain-English Description */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="px-2 py-0.5 rounded font-mono font-bold text-[11px] shrink-0 text-white"
                  style={{
                    backgroundColor:
                      MODULE_THEMES[DATA_MODEL_TABLES[selectedTable]?.module || 'sales']?.hex ||
                      '#3b82f6',
                  }}
                >
                  {selectedTable}
                </span>
                <p className="text-xs text-text truncate font-normal">
                  {TABLE_PLAIN_ENGLISH[selectedTable].howItIsUsed}
                </p>
              </div>

              {/* Right: Where to find it navigation chips + Close (X) button */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="hidden xl:inline font-mono text-[9.5px] uppercase tracking-wider text-text-faint font-semibold mr-1">
                  Found in:
                </span>
                {TABLE_PLAIN_ENGLISH[selectedTable].whereToFind.map((dest) => {
                  const allowed = isPageAllowed(dest.href, userRole, userRights);
                  return allowed ? (
                    <Link
                      key={dest.label}
                      href={dest.href}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-surface-2 hover:bg-surface-3 text-text border border-border transition-colors hover:border-border-emphasis"
                    >
                      <span>{dest.label}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-text-faint shrink-0" />
                    </Link>
                  ) : (
                    <span
                      key={dest.label}
                      title="Not granted. Contact an Admin."
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-surface-2 text-text-muted/60 border border-border/60 cursor-not-allowed select-none"
                    >
                      <Lock className="w-2.5 h-2.5 text-text-muted/70 shrink-0" />
                      <span>{dest.label}</span>
                    </span>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSelectedTable(null)}
                  title="Dismiss table info (Esc)"
                  aria-label="Dismiss table info"
                  className="ml-1.5 p-1 rounded hover:bg-surface-3 text-text-muted hover:text-text cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Normal page-flow callout bar when a Relationship is Selected (pushes diagram down) */}
          {!selectedTable && selectedRelationship && (
            <div className="shrink-0 border-b border-border bg-slate-50/90 dark:bg-surface-2/60 px-3.5 py-2 flex items-center justify-between gap-3 text-xs transition-all animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] shrink-0 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  {selectedRelationship.parent} &rarr; {selectedRelationship.child}
                </span>
                <p className="text-xs text-text font-normal truncate">
                  {selectedRelationship.plainSentence}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRelationshipId(null)}
                title="Dismiss relationship info (Esc)"
                aria-label="Dismiss relationship info"
                className="p-1 rounded hover:bg-surface-3 text-text-muted hover:text-text cursor-pointer transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Diagram Area (fills remainder of height without overlay) */}
          <div className="flex-1 min-h-0 relative overflow-hidden">
            <DataModelDiagram
              viewMode={viewMode}
              selectedFunctionId={selectedFunctionId}
              selectedModuleKey={selectedModuleKey}
              selectedTable={selectedTable}
              selectedRelationshipId={selectedRelationshipId}
              onSelectTable={(name) => {
                setSelectedTable(name);
                setSelectedRelationshipId(null);
              }}
              onSelectRelationship={(id) => {
                setSelectedRelationshipId(id);
                setSelectedTable(null);
              }}
              rowCounts={rowCounts}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
