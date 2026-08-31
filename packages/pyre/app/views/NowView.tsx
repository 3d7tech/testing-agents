import * as React from 'react';
import { usePyre } from '../../src/pyre-core';
import { formatClockTime, formatDayLabel } from '../lib/format';

const SIZE = 420;
const STROKE = 3;
const RADIUS = SIZE / 2 - STROKE * 4;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function NowView() {
  const reading = usePyre({ rate: 'second' });
  const [now, setNow] = React.useState<Date | null>(null);

  // The very first real reading should render in place, not animate in from
  // the "full" skeleton state — only *subsequent* live updates should ease.
  const hasReadOnce = React.useRef(false);
  const isFirstReading = reading !== null && !hasReadOnce.current;
  if (reading !== null) hasReadOnce.current = true;

  React.useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const beatsLeft = reading?.beat.remaining ?? null;
  const dayFractionLeft = reading?.day.fraction ?? 1;
  const spanRemaining = reading?.span.remaining ?? null;
  const yearPercentSpent = reading ? Math.round((1 - reading.year.fraction) * 100) : null;
  const daysLeftInSpan = reading?.day.remaining ?? null;

  const dashOffset = CIRCUMFERENCE * (1 - dayFractionLeft);

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-16">
      <div
        className="flex flex-col items-center gap-1 text-xs uppercase tracking-[0.2em]"
        style={{ color: 'var(--fg-faint)' }}
      >
        <span className="tabular">{now ? formatClockTime(now) : ' '}</span>
        <span>{now ? formatDayLabel(now) : ' '}</span>
      </div>

      <div
        className="relative mt-10 flex items-center justify-center"
        style={{ width: 'min(420px, 88vw)', height: 'min(420px, 88vw)' }}
      >
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={beatsLeft !== null ? `${beatsLeft} of 100 beats left today` : 'Loading'}
        >
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--line)"
            strokeWidth={STROKE}
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            style={{ transition: isFirstReading ? 'none' : 'stroke-dashoffset 500ms linear' }}
          />
        </svg>

        <div className="flex flex-col items-center">
          <div
            className="tabular font-semibold leading-none"
            style={{ fontSize: 'clamp(5.5rem, 16vw, 9rem)', letterSpacing: '-0.04em' }}
          >
            {beatsLeft !== null ? beatsLeft : '—'}
          </div>
          <div
            className="mt-3 text-sm font-medium uppercase tracking-[0.18em]"
            style={{ color: 'var(--accent)' }}
          >
            beats left today
          </div>
        </div>
      </div>

      <div
        className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm tabular"
        style={{ color: 'var(--fg-muted)' }}
      >
        <span className="whitespace-nowrap">
          {daysLeftInSpan !== null ? `${daysLeftInSpan} days left this span` : ' '}
        </span>
        <span aria-hidden="true" className="hidden sm:inline" style={{ color: 'var(--fg-faint)' }}>
          ·
        </span>
        <span className="whitespace-nowrap">
          {spanRemaining !== null ? `span ${5 - spanRemaining} of 4` : ' '}
        </span>
        <span aria-hidden="true" className="hidden sm:inline" style={{ color: 'var(--fg-faint)' }}>
          ·
        </span>
        <span className="whitespace-nowrap">
          {yearPercentSpent !== null ? `${yearPercentSpent}% of year spent` : ' '}
        </span>
      </div>
    </div>
  );
}
