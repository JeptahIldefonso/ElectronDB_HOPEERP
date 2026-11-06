'use client';

import React from 'react';
import { formatPHP, formatDate } from '@/lib/utils';

interface PricePoint {
  effDate: string;
  unitPrice: number;
}

interface ProductPriceTrendProps {
  records: PricePoint[];
  unit: string;
}

export function ProductPriceTrend({ records, unit }: ProductPriceTrendProps) {
  // Sort chronologically ascending
  const sorted = [...records].sort((a, b) => a.effDate.localeCompare(b.effDate));

  if (sorted.length < 2) {
    return null;
  }

  const prices = sorted.map((r) => r.unitPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  // Dimensions
  const width = 340;
  const height = 110;
  const padLeft = 46;
  const padRight = 24;
  const padTop = 18;
  const padBottom = 24;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Calculate points for step line
  const points = sorted.map((r, i) => {
    const x = padLeft + (i / (sorted.length - 1)) * chartW;
    const y = padTop + chartH - ((r.unitPrice - minPrice) / priceRange) * chartH;
    return { x, y, effDate: r.effDate, unitPrice: r.unitPrice };
  });

  // Step-line path: horizontal step to next x, then vertical to next y
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const nextPoint = points[i + 1];
    pathD += ` H ${nextPoint.x} V ${nextPoint.y}`;
  }

  const firstDate = sorted[0].effDate;
  const lastDate = sorted[sorted.length - 1].effDate;

  return (
    <div className="rounded-[4px] border border-[#DDE3DE] dark:border-border bg-white dark:bg-surface-1 p-3.5 space-y-2 shadow-2xs font-sans">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[#17231F] dark:text-text">Price trend</span>
        <span className="text-[11px] text-[#52615B] dark:text-text-muted tabular-nums">
          {sorted.length} price records ({unit})
        </span>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto text-[#17231F]"
          role="img"
          aria-label={`Price trend from ${formatPHP(sorted[0].unitPrice)} on ${firstDate} to ${formatPHP(sorted[sorted.length - 1].unitPrice)} on ${lastDate}`}
        >
          {/* Background grid lines */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={width - padRight}
            y2={padTop}
            stroke="#E9EDEA"
            strokeDasharray="2,2"
          />
          <line
            x1={padLeft}
            y1={padTop + chartH / 2}
            x2={width - padRight}
            y2={padTop + chartH / 2}
            stroke="#E9EDEA"
            strokeDasharray="2,2"
          />
          <line
            x1={padLeft}
            y1={padTop + chartH}
            x2={width - padRight}
            y2={padTop + chartH}
            stroke="#DDE3DE"
          />

          {/* Y Axis min & max labels */}
          <text
            x={padLeft - 6}
            y={padTop + 3}
            textAnchor="end"
            fontSize="9"
            fill="#52615B"
            fontFamily="monospace"
          >
            {minPrice === maxPrice ? '' : `₱${Math.round(maxPrice)}`}
          </text>
          <text
            x={padLeft - 6}
            y={padTop + chartH + 3}
            textAnchor="end"
            fontSize="9"
            fill="#52615B"
            fontFamily="monospace"
          >
            ₱${Math.round(minPrice)}
          </text>

          {/* Step line */}
          <path
            d={pathD}
            fill="none"
            stroke="#245B48"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle
                cx={p.x}
                cy={p.y}
                r={idx === points.length - 1 ? 4 : 3}
                fill={idx === points.length - 1 ? '#245B48' : '#FFFFFF'}
                stroke="#245B48"
                strokeWidth="1.5"
              />
            </g>
          ))}

          {/* X Axis dates */}
          <text
            x={padLeft}
            y={height - 6}
            textAnchor="start"
            fontSize="9"
            fill="#52615B"
            fontFamily="monospace"
          >
            {formatDate(firstDate)}
          </text>
          <text
            x={width - padRight}
            y={height - 6}
            textAnchor="end"
            fontSize="9"
            fill="#52615B"
            fontFamily="monospace"
          >
            {formatDate(lastDate)}
          </text>
        </svg>
      </div>
    </div>
  );
}
