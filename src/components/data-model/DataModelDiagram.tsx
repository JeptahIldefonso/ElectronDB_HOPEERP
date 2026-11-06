'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  DATA_MODEL_TABLES,
  DATA_MODEL_RELATIONSHIPS,
  MODULE_THEMES,
  WEBSITE_FUNCTIONS,
  type TableDefinition,
  type RelationshipDefinition,
  type ModuleKey,
} from '@/lib/data-model';

interface DataModelDiagramProps {
  viewMode: 'module' | 'function';
  selectedFunctionId: string | null;
  selectedModuleKey?: ModuleKey | null;
  selectedTable: string | null;
  selectedRelationshipId: string | null;
  onSelectTable: (tableName: string | null) => void;
  onSelectRelationship: (relId: string | null) => void;
  rowCounts: Record<string, number>;
}

export function DataModelDiagram({
  viewMode,
  selectedFunctionId,
  selectedModuleKey,
  selectedTable,
  selectedRelationshipId,
  onSelectTable,
  onSelectRelationship,
  rowCounts,
}: DataModelDiagramProps) {
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [hoveredRelationship, setHoveredRelationship] = useState<string | null>(null);

  // Keyboard navigation & Esc clearing
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onSelectTable(null);
        onSelectRelationship(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectTable, onSelectRelationship]);

  // Active website function when in function view
  const activeFunction =
    viewMode === 'function' && selectedFunctionId
      ? WEBSITE_FUNCTIONS.find((f) => f.id === selectedFunctionId) || null
      : null;

  const isTableHighlighted = (tableName: string) => {
    if (selectedTable) return selectedTable === tableName;
    if (selectedRelationshipId) {
      const rel = DATA_MODEL_RELATIONSHIPS.find((r) => r.id === selectedRelationshipId);
      return rel?.parent === tableName || rel?.child === tableName;
    }
    if (hoveredRelationship) {
      const rel = DATA_MODEL_RELATIONSHIPS.find((r) => r.id === hoveredRelationship);
      return rel?.parent === tableName || rel?.child === tableName;
    }
    if (hoveredTable) {
      if (hoveredTable === tableName) return true;
      return DATA_MODEL_RELATIONSHIPS.some(
        (r) =>
          (r.parent === hoveredTable && r.child === tableName) ||
          (r.child === hoveredTable && r.parent === tableName)
      );
    }
    if (activeFunction) {
      return activeFunction.involvedTableNames.includes(tableName);
    }
    if (viewMode === 'module' && selectedModuleKey) {
      return DATA_MODEL_TABLES[tableName]?.module === selectedModuleKey;
    }
    return true;
  };

  const isTableDimmed = (tableName: string) => {
    if (selectedTable) return selectedTable !== tableName;
    if (selectedRelationshipId) {
      const rel = DATA_MODEL_RELATIONSHIPS.find((r) => r.id === selectedRelationshipId);
      return rel?.parent !== tableName && rel?.child !== tableName;
    }
    if (hoveredRelationship) {
      const rel = DATA_MODEL_RELATIONSHIPS.find((r) => r.id === hoveredRelationship);
      return rel?.parent !== tableName && rel?.child !== tableName;
    }
    if (hoveredTable) {
      if (hoveredTable === tableName) return false;
      const isConnected = DATA_MODEL_RELATIONSHIPS.some(
        (r) =>
          (r.parent === hoveredTable && r.child === tableName) ||
          (r.child === hoveredTable && r.parent === tableName)
      );
      return !isConnected;
    }
    if (activeFunction) {
      return !activeFunction.involvedTableNames.includes(tableName);
    }
    if (viewMode === 'module' && selectedModuleKey) {
      return DATA_MODEL_TABLES[tableName]?.module !== selectedModuleKey;
    }
    return false;
  };

  const isRelHighlighted = (rel: RelationshipDefinition) => {
    if (selectedRelationshipId) return selectedRelationshipId === rel.id;
    if (selectedTable) return rel.parent === selectedTable || rel.child === selectedTable;
    if (hoveredRelationship) return hoveredRelationship === rel.id;
    if (hoveredTable) return rel.parent === hoveredTable || rel.child === hoveredTable;
    if (activeFunction) {
      return activeFunction.involvedRelationshipIds.includes(rel.id);
    }
    if (viewMode === 'module' && selectedModuleKey) {
      const parentMod = DATA_MODEL_TABLES[rel.parent]?.module;
      const childMod = DATA_MODEL_TABLES[rel.child]?.module;
      return parentMod === selectedModuleKey || childMod === selectedModuleKey;
    }
    return false;
  };

  const isRelDimmed = (rel: RelationshipDefinition) => {
    if (selectedRelationshipId) return selectedRelationshipId !== rel.id;
    if (selectedTable) return rel.parent !== selectedTable && rel.child !== selectedTable;
    if (hoveredRelationship) return hoveredRelationship !== rel.id;
    if (hoveredTable) return rel.parent !== hoveredTable && rel.child !== hoveredTable;
    if (activeFunction) {
      return !activeFunction.involvedRelationshipIds.includes(rel.id);
    }
    if (viewMode === 'module' && selectedModuleKey) {
      const parentMod = DATA_MODEL_TABLES[rel.parent]?.module;
      const childMod = DATA_MODEL_TABLES[rel.child]?.module;
      return parentMod !== selectedModuleKey && childMod !== selectedModuleKey;
    }
    return false;
  };

  const tablesList = Object.values(DATA_MODEL_TABLES);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-white dark:bg-surface-1 flex items-center justify-center select-none p-1 sm:p-2">
      <svg
        id="hope-erd-svg"
        viewBox="20 38 860 690"
        className="w-full h-full max-h-full max-w-full font-sans select-none"
        preserveAspectRatio="xMidYMid meet"
        aria-label="HOPE, Inc. Relational Entity-Relationship Diagram"
      >
        <defs>
          {/* Subtle drop shadow for table cards */}
          <filter id="card-shadow" x="-5%" y="-5%" width="115%" height="115%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
          </filter>
          <filter id="card-shadow-active" x="-10%" y="-10%" width="125%" height="125%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#3b82f6" floodOpacity="0.25" />
          </filter>

          {/* Module Color Header Gradients */}
          {Object.entries(MODULE_THEMES).map(([key, theme]) => (
            <linearGradient key={key} id={`header-grad-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.hex} stopOpacity="0.22" />
              <stop offset="100%" stopColor={theme.hex} stopOpacity="0.08" />
            </linearGradient>
          ))}
        </defs>

        {/* ── 1. Relationships Layer (Drawn Behind Table Cards) ── */}
        <g id="relationships-layer">
          {DATA_MODEL_RELATIONSHIPS.map((rel) => {
            const isSelectedRel = selectedRelationshipId === rel.id;
            const isHighlighted = isRelHighlighted(rel);
            const isDimmed = isRelDimmed(rel);
            const parentTable = DATA_MODEL_TABLES[rel.parent];
            const theme = parentTable ? MODULE_THEMES[parentTable.module] : MODULE_THEMES.sales;

            // Stroke styling based on highlight / selection / active function
            let strokeColor = 'var(--text-faint, #94a3b8)';
            let strokeWidth = 1.5;
            let strokeDash = 'none';

            if (isSelectedRel) {
              strokeColor = '#2563eb';
              strokeWidth = 3;
              strokeDash = 'none';
            } else if (activeFunction && activeFunction.involvedRelationshipIds.includes(rel.id)) {
              strokeColor = activeFunction.color;
              strokeDash = activeFunction.dashArray;
              strokeWidth = 2.5;
            } else if (isHighlighted) {
              strokeColor = theme.hex;
              strokeWidth = 2.5;
            }

            return (
              <g
                key={rel.id}
                role="button"
                tabIndex={0}
                aria-label={`Relationship: ${rel.label}. ${rel.plainSentence}`}
                onClick={() => onSelectRelationship(rel.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectRelationship(rel.id);
                  }
                }}
                onMouseEnter={() => setHoveredRelationship(rel.id)}
                onMouseLeave={() => setHoveredRelationship(null)}
                className="cursor-pointer transition-opacity duration-150 group"
                opacity={isDimmed ? 0.15 : 1}
              >
                {/* Thick invisible hit target for easy clicking */}
                <path
                  d={rel.pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="18"
                  strokeLinecap="round"
                />

                {/* Main relationship path line */}
                <path
                  d={rel.pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDash}
                  className="transition-colors duration-150"
                />

                {/* Relationship Verb Label Pill */}
                <g transform={`translate(${rel.labelPos.x}, ${rel.labelPos.y})`}>
                  <rect
                    x="-32"
                    y="-10"
                    width="64"
                    height="20"
                    rx="10"
                    style={{
                      fill: isSelectedRel ? 'var(--surface-1, #ffffff)' : 'var(--surface-2, #ffffff)',
                      stroke: isSelectedRel ? '#2563eb' : isHighlighted ? (activeFunction?.color || theme.hex) : 'var(--border, #cbd5e1)',
                    }}
                    strokeWidth={isSelectedRel ? '2' : isHighlighted ? '1.5' : '1'}
                    className="shadow-xs transition-colors duration-150"
                  />
                  <text
                    x="0"
                    y="3.5"
                    textAnchor="middle"
                    style={{ fill: isSelectedRel ? '#2563eb' : 'var(--text, #334155)' }}
                    className="font-mono text-[9.5px] font-bold pointer-events-none select-none tracking-tight"
                  >
                    {rel.verb}
                  </text>
                </g>
              </g>
            );
          })}
        </g>

        {/* ── 2. Table Cards Layer ── */}
        <g id="tables-layer">
          {tablesList.map((table) => {
            const theme = MODULE_THEMES[table.module];
            const isHighlighted = isTableHighlighted(table.name);
            const isDimmed = isTableDimmed(table.name);
            const isSelected = selectedTable === table.name;
            const liveRows = rowCounts[table.name] ?? table.fallbackRowCount;

            return (
              <g
                key={table.name}
                role="button"
                tabIndex={0}
                aria-label={`Table ${table.name}. ${table.description}. Live rows: ${liveRows}`}
                transform={`translate(${table.x}, ${table.y})`}
                onClick={() => onSelectTable(table.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectTable(table.name);
                  }
                }}
                onMouseEnter={() => setHoveredTable(table.name)}
                onMouseLeave={() => setHoveredTable(null)}
                className="cursor-pointer transition-opacity duration-150 group outline-none"
                opacity={isDimmed ? 0.2 : 1}
              >
                {/* Table Card Body Background using CSS Theme Variable */}
                <rect
                  x="0"
                  y="0"
                  width={table.width}
                  height={table.height}
                  rx="8"
                  ry="8"
                  style={{
                    fill: 'var(--surface-1, #ffffff)',
                    stroke: isSelected
                      ? theme.hex
                      : isHighlighted
                      ? (activeFunction?.color || theme.hex)
                      : 'var(--border-muted, #e2e8f0)',
                  }}
                  strokeWidth={isSelected ? '2.5' : isHighlighted ? '2' : '1.2'}
                  filter={isSelected ? 'url(#card-shadow-active)' : 'url(#card-shadow)'}
                  className="transition-colors duration-150"
                />

                {/* Module Header Band */}
                <path
                  d={`M 0 8 Q 0 0 8 0 L ${table.width - 8} 0 Q ${table.width} 0 ${table.width} 8 L ${table.width} 32 L 0 32 Z`}
                  fill={`url(#header-grad-${table.module})`}
                  stroke={theme.hex}
                  strokeWidth="0.5"
                  strokeOpacity="0.4"
                />

                {/* Table Name Title */}
                <text
                  x="10"
                  y="21"
                  style={{ fill: 'var(--text, #0f172a)' }}
                  className="font-mono text-[12px] font-bold tracking-wider select-none"
                >
                  {table.name}
                </text>

                {/* Live Row Count Badge */}
                <g transform={`translate(${table.width - 48}, 9)`}>
                  <rect
                    x="0"
                    y="0"
                    width="40"
                    height="15"
                    rx="3"
                    fill={theme.hex}
                    fillOpacity="0.18"
                  />
                  <text
                    x="20"
                    y="11"
                    textAnchor="middle"
                    style={{ fill: 'var(--text, #334155)' }}
                    className="font-mono text-[9px] font-bold select-none"
                  >
                    {liveRows}
                  </text>
                </g>

                {/* Header Divider Line */}
                <line
                  x1="0"
                  y1="32"
                  x2={table.width}
                  y2="32"
                  stroke={theme.hex}
                  strokeWidth="1.2"
                  strokeOpacity="0.4"
                />

                {/* Columns List - tightened row spacing */}
                <g transform="translate(10, 48)">
                  {table.columns.map((col, idx) => {
                    const rowY = idx * 20; // tightened from 22 to 20 for viewport lock
                    return (
                      <g key={col.name} transform={`translate(0, ${rowY})`}>
                        {/* PK Icon / Underline Indicator */}
                        {col.isPk ? (
                          <text
                            x="0"
                            y="0"
                            textDecoration="underline"
                            style={{ fill: 'var(--text, #0f172a)' }}
                            className="font-mono text-[10.5px] font-semibold select-none"
                          >
                            {col.name}
                          </text>
                        ) : (
                          <text
                            x="0"
                            y="0"
                            style={{ fill: 'var(--text-muted, #475569)' }}
                            className="font-mono text-[10.5px] font-normal select-none"
                          >
                            {col.name}
                          </text>
                        )}

                        {/* Composite PK or FK Marker Badge */}
                        {col.isCompositePk ? (
                          <text
                            x={table.width - 24}
                            y="-1"
                            textAnchor="end"
                            className="font-mono text-[8.5px] font-bold fill-amber-500 select-none"
                          >
                            PK*
                          </text>
                        ) : col.isPk ? (
                          <text
                            x={table.width - 24}
                            y="-1"
                            textAnchor="end"
                            className="font-mono text-[8.5px] font-bold fill-blue-500 select-none"
                          >
                            PK
                          </text>
                        ) : col.isFk ? (
                          <text
                            x={table.width - 24}
                            y="-1"
                            textAnchor="end"
                            style={{ fill: 'var(--text-faint, #94a3b8)' }}
                            className="font-mono text-[8.5px] font-medium select-none"
                          >
                            FK
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                </g>

                {/* Soft Delete & Audit Indicator footer bar */}
                <g transform={`translate(8, ${table.height - 10})`}>
                  <text
                    x="0"
                    y="0"
                    style={{ fill: 'var(--text-faint, #94a3b8)' }}
                    className="font-mono text-[8px] select-none uppercase tracking-wider"
                  >
                    + is_deleted, stamp
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Dynamic Status / Verification Chip inside ERD canvas at bottom-2.5 right-3 */}
      <div className="absolute bottom-2.5 right-3 z-10 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-white/95 dark:bg-surface-1/95 backdrop-blur-xs text-[10.5px] font-sans shadow-xs text-text-muted pointer-events-auto select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <span className="truncate max-w-[320px]">
          {activeFunction
            ? activeFunction.tagline
            : '3NF Relational Architecture • 10 Tables • 9 Relationships'}
        </span>
      </div>
    </div>
  );
}
