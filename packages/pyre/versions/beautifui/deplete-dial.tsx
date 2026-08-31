// MIT License. Copyright (c) Pyre contributors.
//
// deplete-dial.tsx — a generic nested-depletion dial. This is deliberately
// not about time: it renders any ordered set of "this much is left" levels
// as concentric depleting rings. A countdown clock is one demo of it;
// budget burn-down, quota usage, and sprint capacity are others. Zero
// dependencies beyond React — pair with deplete-dial.css.

import * as React from 'react';
import './deplete-dial.css';

export interface DepleteLevel {
  label: string;
  remaining: number;
  total: number;
  /** 0..1, how much of this level is left. */
  fraction: number;
}

export interface DepleteDialProps {
  levels: DepleteLevel[];
  /** Show the numeral for the innermost level in the centre. Default true. */
  showCenterValue?: boolean;
  /** Render the text legend below the dial. Default true. */
  legend?: boolean;
  className?: string;
}

const RING_CLASS = ['dial__ring--1', 'dial__ring--2', 'dial__ring--3', 'dial__ring--4', 'dial__ring--5'];
const RING_FALLBACK_COLOR = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

export function DepleteDial({
  levels,
  showCenterValue = true,
  legend = true,
  className,
}: DepleteDialProps) {
  // Geometry only — every colour, size, stroke width and gap comes from
  // deplete-dial.css's token layer via className, nothing is hardcoded here.
  const viewBoxSize = 100;
  const center = viewBoxSize / 2;
  const strokeWidth = 8;
  const gap = 3;
  const maxRadius = center - strokeWidth;

  const centerLevel = levels[0];

  return (
    <div className={['dial', className].filter(Boolean).join(' ')}>
      <svg
        className="dial__svg"
        role="img"
        aria-label={levels
          .map((l) => `${l.label}: ${l.remaining} of ${l.total} left`)
          .join(', ')}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      >
        {levels.map((level, i) => {
          const radius = maxRadius - i * (strokeWidth + gap);
          if (radius <= 0) return null;
          const fraction = Math.min(1, Math.max(0, level.fraction));
          return (
            <g key={level.label} transform={`rotate(-90 ${center} ${center})`}>
              <circle className="dial__track" cx={center} cy={center} r={radius} pathLength={100} />
              <circle
                className={`dial__ring ${RING_CLASS[i % RING_CLASS.length]}`}
                cx={center}
                cy={center}
                r={radius}
                pathLength={100}
                strokeDasharray={`${fraction * 100} 100`}
              />
            </g>
          );
        })}
        {showCenterValue && centerLevel && (
          <text x={center} y={center} textAnchor="middle" dominantBaseline="central" className="dial__center" fontSize={viewBoxSize / 6}>
            {Math.max(0, Math.round(centerLevel.remaining))}
          </text>
        )}
      </svg>
      {legend && (
        <dl className="dial__legend">
          {levels.map((level, i) => (
            <React.Fragment key={level.label}>
              <span
                className="dial__swatch"
                style={{
                  background: `var(--dial-ring-${(i % RING_CLASS.length) + 1}, ${RING_FALLBACK_COLOR[i % RING_CLASS.length]})`,
                }}
                aria-hidden="true"
              />
              <dt>{level.label}</dt>
              <dd className="dial__value" style={{ margin: 0 }}>
                {level.remaining} / {level.total}
              </dd>
            </React.Fragment>
          ))}
        </dl>
      )}
    </div>
  );
}
