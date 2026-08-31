// MIT License. Copyright (c) Pyre contributors.
//
// glass-clock.tsx — the canonical, shadcn-registry-shaped rendering of
// pyre-core.ts. SVG only, no dependencies beyond React, every colour comes
// from a CSS custom property so the host's theme (and dark mode) wins.
//
// Install into a shadcn project with:
//   npx shadcn add https://yourdomain/r/glass-clock.json

import * as React from 'react';
import {
  PYRE_RING_UNITS,
  readPyre,
  usePyre,
  type PyreReading,
  type PyreUnit,
  type PyreUnitReading,
} from '@/lib/pyre-core';

export type RingKey = Exclude<PyreUnit, 'year'>;

const DEFAULT_RINGS = [...PYRE_RING_UNITS] as RingKey[];

const RING_LABELS: Record<RingKey, string> = {
  mote: 'Mote',
  grain: 'Grain',
  glass: 'Glass',
  day: 'Day',
  span: 'Span',
};

// --chart-1..5, --muted and --foreground follow the shadcn convention of
// storing a raw "H S% L%" triplet, consumed as hsl(var(--token)) — the same
// tokens shadcn/ui's own chart components and `components.json` theme use.
const RING_CHART_VAR: Record<RingKey, string> = {
  mote: 'hsl(var(--chart-1))',
  grain: 'hsl(var(--chart-2))',
  glass: 'hsl(var(--chart-3))',
  day: 'hsl(var(--chart-4))',
  span: 'hsl(var(--chart-5))',
};
const TRACK_COLOR = 'hsl(var(--muted))';
const FOREGROUND_COLOR = 'hsl(var(--foreground))';

const srOnlyStyle: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return reduced;
}

function unitReading(reading: PyreReading, ring: RingKey): PyreUnitReading {
  return reading[ring];
}

export interface GlassClockDialProps {
  /** The reading to render. Pass `null` for the SSR/first-paint skeleton. */
  reading: PyreReading | null;
  /** Pixel size of the (square) dial. Default 320. */
  size?: number;
  /** Which rings to draw, innermost to outermost. Default: all five. */
  rings?: RingKey[];
  /** Show the "glasses left" numeral in the centre. Default true. */
  showNumbers?: boolean;
  /**
   * When true, disables the 120ms stroke-dasharray transition so the dial
   * jumps to the exact reading on every tick instead of easing toward it.
   * Useful for screenshots, tests, and print. Default false.
   */
  strict?: boolean;
  className?: string;
}

export const GlassClockDial = React.forwardRef<SVGSVGElement, GlassClockDialProps>(
  function GlassClockDial(
    { reading, size = 320, rings = DEFAULT_RINGS, showNumbers = true, strict = false, className },
    ref,
  ) {
    const reducedMotion = usePrefersReducedMotion();
    const orderedRings = DEFAULT_RINGS.filter((r) => rings.includes(r));

    const strokeWidth = Math.max(2, size / 40);
    const gap = strokeWidth * 0.6;
    const maxRadius = size / 2 - strokeWidth;
    const center = size / 2;

    const glassReading = reading?.glass;
    const glassesLeftLabel = glassReading
      ? `${glassReading.remaining} of ${glassReading.capacity} glasses left today`
      : 'Loading countdown';

    // Live region updates at most once per glass (never per mote/grain),
    // so a screen reader is never flooded with sub-second churn.
    const [announced, setAnnounced] = React.useState<string | null>(null);
    const lastGlassRemaining = React.useRef<number | null>(null);
    React.useEffect(() => {
      if (!glassReading) return;
      if (lastGlassRemaining.current !== glassReading.remaining) {
        lastGlassRemaining.current = glassReading.remaining;
        setAnnounced(glassesLeftLabel);
      }
    }, [glassReading, glassesLeftLabel]);

    const transition =
      strict || reducedMotion ? 'none' : 'stroke-dasharray 120ms linear';

    return (
      <div
        className={className}
        style={{ position: 'relative', width: size, height: size }}
      >
        <svg
          ref={ref}
          role="img"
          aria-label={glassesLeftLabel}
          aria-busy={reading === null}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ display: 'block', fontVariantNumeric: 'tabular-nums' }}
        >
          {orderedRings.map((ring, i) => {
            const radius = maxRadius - i * (strokeWidth + gap);
            const u = reading ? unitReading(reading, ring) : null;
            const fraction = u ? u.fraction : 1;
            return (
              <g
                key={ring}
                transform={`rotate(-90 ${center} ${center})`}
              >
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={TRACK_COLOR}
                  strokeWidth={strokeWidth}
                  pathLength={100}
                />
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={RING_CHART_VAR[ring]}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray={`${fraction * 100} 100`}
                  style={{ transition }}
                />
              </g>
            );
          })}
          {showNumbers && (
            <text
              x={center}
              y={center}
              textAnchor="middle"
              dominantBaseline="central"
              fill={FOREGROUND_COLOR}
              style={{ fontVariantNumeric: 'tabular-nums', fontSize: size / 6, fontWeight: 600 }}
            >
              {glassReading ? glassReading.remaining : '--'}
            </text>
          )}
        </svg>
        <span style={srOnlyStyle} aria-live="polite">
          {announced ?? glassesLeftLabel}
        </span>
      </div>
    );
  },
);

export interface GlassClockLegendProps {
  reading: PyreReading | null;
  rings?: RingKey[];
  className?: string;
}

export function GlassClockLegend({
  reading,
  rings = DEFAULT_RINGS,
  className,
}: GlassClockLegendProps) {
  const orderedRings = DEFAULT_RINGS.filter((r) => rings.includes(r));

  return (
    <dl
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        columnGap: '0.5rem',
        rowGap: '0.25rem',
        alignItems: 'center',
        margin: 0,
      }}
    >
      {orderedRings.map((ring) => {
        const u = reading ? unitReading(reading, ring) : null;
        return (
          <React.Fragment key={ring}>
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: '0.6rem',
                height: '0.6rem',
                borderRadius: '9999px',
                background: RING_CHART_VAR[ring],
              }}
            />
            <dt style={{ color: FOREGROUND_COLOR }}>{RING_LABELS[ring]}</dt>
            <dd
              style={{
                margin: 0,
                fontVariantNumeric: 'tabular-nums',
                color: FOREGROUND_COLOR,
              }}
            >
              {u ? `${u.remaining} / ${u.capacity}` : '-- / --'}
            </dd>
          </React.Fragment>
        );
      })}
    </dl>
  );
}

export interface GlassClockProps {
  size?: number;
  rings?: RingKey[];
  showNumbers?: boolean;
  strict?: boolean;
  className?: string;
  /** Also render the textual legend below the dial. Default false. */
  legend?: boolean;
}

export function GlassClock({
  size = 320,
  rings = DEFAULT_RINGS,
  showNumbers = true,
  strict = false,
  className,
  legend = false,
}: GlassClockProps) {
  const needsFast = rings.includes('mote') || rings.includes('grain');

  // Only the two innermost rings need raf; the rest run at one tick/second.
  const fastReading = usePyre({ rate: needsFast ? 'raf' : 'second' });
  const slowReading = usePyre({ rate: 'second' });

  const reading = React.useMemo<PyreReading | null>(() => {
    if (!fastReading || !slowReading) return null;
    return {
      ...slowReading,
      mote: fastReading.mote,
      grain: fastReading.grain,
    };
  }, [fastReading, slowReading]);

  return (
    <div className={className}>
      <GlassClockDial
        reading={reading}
        size={size}
        rings={rings}
        showNumbers={showNumbers}
        strict={strict}
      />
      {legend && <GlassClockLegend reading={reading} rings={rings} />}
    </div>
  );
}

// Re-exported so a consumer that only took glass-clock.tsx can still read
// a snapshot without importing pyre-core.ts directly.
export { readPyre };
export type { PyreReading, PyreUnitReading, PyreUnit };
