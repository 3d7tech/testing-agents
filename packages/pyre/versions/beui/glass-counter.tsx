// MIT License. Copyright (c) Pyre contributors.
//
// @beui/glass-counter — the motion-first variant of the glass clock.
// Springs, not durations, everywhere: every ring's burn head is a spring
// chasing its target angle (so it lags very slightly and settles instead
// of reading as a progress bar), digits roll per-slot on rollover with a
// right-to-left stagger, and a radial bloom sweeps the rings once per
// glass (every 14m 24s — often enough to be an event, rare enough to stay
// one). See llms.txt for the plain-text "when to reach for this" summary
// a coding agent reads instead of the gallery.

import * as React from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import {
  PYRE_RING_UNITS,
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

const RING_CHART_VAR: Record<RingKey, string> = {
  mote: 'hsl(var(--chart-1))',
  grain: 'hsl(var(--chart-2))',
  glass: 'hsl(var(--chart-3))',
  day: 'hsl(var(--chart-4))',
  span: 'hsl(var(--chart-5))',
};

export interface SpringConfig {
  stiffness: number;
  damping: number;
}

const DEFAULT_SPRING: SpringConfig = { stiffness: 90, damping: 16 };

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

/**
 * A continuously-increasing angle (never wraps back to 0), so the spring
 * chasing it always moves forward through a rollover instead of spinning
 * backward the "short way" when the target resets from ~360deg to 0deg.
 */
function useContinuousAngle(u: PyreUnitReading | undefined): number {
  const revolutions = React.useRef(0);
  const prevRemaining = React.useRef<number | undefined>(u?.remaining);

  if (u && prevRemaining.current !== undefined && u.remaining > prevRemaining.current) {
    revolutions.current += 1;
  }
  if (u) prevRemaining.current = u.remaining;

  if (!u) return 0;
  const lapProgress = (u.capacity - u.remaining + (1 - u.fraction)) / u.capacity;
  return (revolutions.current + lapProgress) * 360;
}

function RingHead({
  radius,
  center,
  angleDeg,
  size,
  color,
  spring,
}: {
  radius: number;
  center: number;
  angleDeg: number;
  size: number;
  color: string;
  spring: SpringConfig;
}) {
  const target = useMotionValue(angleDeg);
  React.useEffect(() => {
    target.set(angleDeg);
  }, [angleDeg, target]);
  const angle = useSpring(target, { stiffness: spring.stiffness, damping: spring.damping });
  const x = useTransform(angle, (a) => center + radius * Math.sin((a * Math.PI) / 180));
  const y = useTransform(angle, (a) => center - radius * Math.cos((a * Math.PI) / 180));

  return <motion.circle cx={x} cy={y} r={size} fill={color} />;
}

const digitSlotStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-block',
  width: '0.62em',
  height: '1em',
  overflow: 'hidden',
};

function DigitColumn({
  digit,
  delay,
  spring,
  mode,
}: {
  digit: string;
  delay: number;
  spring: SpringConfig;
  mode: 'roll' | 'fade' | 'none';
}) {
  if (mode === 'none') {
    return <span style={digitSlotStyle}>{digit}</span>;
  }
  const travel = mode === 'roll' ? '100%' : 0;
  return (
    <span style={digitSlotStyle}>
      <AnimatePresence initial={false}>
        <motion.span
          key={digit}
          initial={{ y: travel, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: mode === 'roll' ? '-100%' : 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: spring.stiffness, damping: spring.damping, delay }}
          style={{ position: 'absolute', inset: 0, textAlign: 'center' }}
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function DigitRoll({
  value,
  digits = 2,
  spring,
  mode,
  stagger = 0.05,
}: {
  value: number;
  digits?: number;
  spring: SpringConfig;
  mode: 'roll' | 'fade' | 'none';
  stagger?: number;
}) {
  const str = String(Math.max(0, Math.trunc(value))).padStart(digits, '0').slice(-digits);
  const chars = str.split('');
  return (
    <span style={{ display: 'inline-flex', fontVariantNumeric: 'tabular-nums' }}>
      {chars.map((ch, i) => (
        <DigitColumn
          key={i}
          digit={ch}
          delay={mode === 'roll' ? (chars.length - 1 - i) * stagger : 0}
          spring={spring}
          mode={mode}
        />
      ))}
    </span>
  );
}

/** Fires (increments) whenever `remaining` rolls over (jumps back up). */
function useRolloverTick(remaining: number | undefined): number {
  const [tick, setTick] = React.useState(0);
  const prev = React.useRef(remaining);
  React.useEffect(() => {
    if (remaining == null) return;
    if (prev.current != null && remaining > prev.current) {
      setTick((t) => t + 1);
    }
    prev.current = remaining;
  }, [remaining]);
  return tick;
}

function Bloom({ tick, radii, center, color }: { tick: number; radii: number[]; center: number; color: string }) {
  if (tick === 0) return null;
  return (
    <>
      {radii.map((r, i) => (
        <motion.circle
          key={`${tick}-${i}`}
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={2}
          initial={{ opacity: 0.9, scale: 0.85 }}
          animate={{ opacity: 0, scale: 1.15 }}
          transition={{ duration: 0.7, delay: i * 0.06, ease: 'easeOut' }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />
      ))}
    </>
  );
}

export interface GlassCounterProps {
  size?: number;
  rings?: RingKey[];
  spring?: SpringConfig;
  rollover?: 'roll' | 'fade' | 'none';
  bloom?: boolean;
  className?: string;
}

export function GlassCounter({
  size = 320,
  rings = DEFAULT_RINGS,
  spring = DEFAULT_SPRING,
  rollover = 'roll',
  bloom = true,
  className,
}: GlassCounterProps) {
  const reducedMotion = usePrefersReducedMotion();
  const needsFast = rings.includes('mote') || rings.includes('grain');
  const fast = usePyre({ rate: needsFast ? 'raf' : 'second' });
  const slow = usePyre({ rate: 'second' });

  const reading = React.useMemo<PyreReading | null>(() => {
    if (!fast || !slow) return null;
    return { ...slow, mote: fast.mote, grain: fast.grain };
  }, [fast, slow]);

  const orderedRings = DEFAULT_RINGS.filter((r) => rings.includes(r));
  const strokeWidth = Math.max(2, size / 40);
  const gap = strokeWidth * 0.6;
  const maxRadius = size / 2 - strokeWidth;
  const center = size / 2;

  const glassRemaining = reading?.glass.remaining;
  const bloomTick = useRolloverTick(bloom && !reducedMotion ? glassRemaining : undefined);
  const bloomRadii = orderedRings.map((_, i) => maxRadius - i * (strokeWidth + gap));

  const effectiveRolloverMode = reducedMotion ? 'none' : rollover;

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <svg
        role="img"
        aria-label={
          reading ? `${reading.glass.remaining} of ${reading.glass.capacity} glasses left today` : 'Loading countdown'
        }
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: 'block' }}
      >
        {orderedRings.map((ring, i) => {
          const radius = maxRadius - i * (strokeWidth + gap);
          const u = reading?.[ring];
          const fraction = u ? u.fraction : 1;
          return (
            <g key={ring} transform={`rotate(-90 ${center} ${center})`}>
              <circle cx={center} cy={center} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} pathLength={100} />
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
              />
            </g>
          );
        })}
        {bloom && <Bloom tick={bloomTick} radii={bloomRadii} center={center} color="hsl(var(--chart-3))" />}
        {!reducedMotion &&
          orderedRings.map((ring, i) => {
            const radius = maxRadius - i * (strokeWidth + gap);
            const u = reading?.[ring];
            return (
              <HeadForRing
                key={ring}
                unit={u}
                radius={radius}
                center={center}
                size={strokeWidth * 0.55}
                color={RING_CHART_VAR[ring]}
                spring={spring}
              />
            );
          })}
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          fill="hsl(var(--foreground))"
          style={{ fontVariantNumeric: 'tabular-nums', fontSize: size / 6, fontWeight: 600 }}
        >
          {reading ? reading.glass.remaining : '--'}
        </text>
      </svg>

      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '1.1rem' }}>
        {orderedRings.map((ring) => {
          const u = reading?.[ring];
          return (
            <div key={ring} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
              <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{RING_LABELS[ring]}</span>
              <span style={{ color: RING_CHART_VAR[ring] }}>
                <DigitRoll value={u ? u.remaining : 0} spring={spring} mode={effectiveRolloverMode} />
              </span>
            </div>
          );
        })}
      </div>
      <span
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
        aria-live="polite"
      >
        {reading ? `${reading.glass.remaining} of ${reading.glass.capacity} glasses left today` : ''}
      </span>
    </div>
  );
}

function HeadForRing({
  unit,
  radius,
  center,
  size,
  color,
  spring,
}: {
  unit: PyreUnitReading | undefined;
  radius: number;
  center: number;
  size: number;
  color: string;
  spring: SpringConfig;
}) {
  const angle = useContinuousAngle(unit);
  return <RingHead radius={radius} center={center} angleDeg={angle} size={size} color={color} spring={spring} />;
}
