import * as React from 'react';
import { usePyre } from '../../src/pyre-core';
import { formatClockTime, formatDayLabel } from '../lib/format';

const BAR_WIDTH = 'min(360px, 82vw)';

function DepleteBar({
  fraction,
  height,
  animate,
  trackOpacity = 1,
}: {
  fraction: number;
  height: number;
  animate: boolean;
  trackOpacity?: number;
}) {
  return (
    <div
      className="w-full overflow-hidden rounded-full"
      style={{ width: BAR_WIDTH, height, background: 'var(--line)', opacity: trackOpacity }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(1, Math.max(0, fraction)) * 100}%`,
          background: 'var(--accent)',
          transition: animate ? 'width 900ms linear' : 'none',
        }}
      />
    </div>
  );
}

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
  const beatFraction = reading?.beat.fraction ?? 1;
  const grainRemaining = reading?.grain.remaining ?? null;
  const grainFraction = reading?.grain.fraction ?? 1;
  const spanRemaining = reading?.span.remaining ?? null;
  const yearPercentSpent = reading ? Math.round((1 - reading.year.fraction) * 100) : null;
  const daysLeftInSpan = reading?.day.remaining ?? null;

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-16">
      <div
        className="flex flex-col items-center gap-1 text-xs uppercase tracking-[0.2em]"
        style={{ color: 'var(--fg-faint)' }}
      >
        <span className="tabular">{now ? formatClockTime(now) : ' '}</span>
        <span>{now ? formatDayLabel(now) : ' '}</span>
      </div>

      <div
        className="mt-10 flex flex-col items-center"
        role="img"
        aria-label={beatsLeft !== null ? `${beatsLeft} of 100 beats left today` : 'Loading'}
      >
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

        <div className="mt-6">
          <DepleteBar fraction={beatFraction} height={10} animate={!isFirstReading} />
        </div>

        <div className="mt-3 flex items-center gap-3" style={{ width: BAR_WIDTH }}>
          <DepleteBar fraction={grainFraction} height={4} animate={!isFirstReading} trackOpacity={0.6} />
          <span
            className="tabular shrink-0 text-xs"
            style={{ color: 'var(--fg-faint)', minWidth: '4.5ch', textAlign: 'right' }}
          >
            {grainRemaining !== null ? `${grainRemaining} grain` : ' '}
          </span>
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
