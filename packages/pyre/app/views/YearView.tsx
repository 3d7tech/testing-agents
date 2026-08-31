import { daysInYear, usePyre } from '../../src/pyre-core';

const SPAN_COUNT = 4;
const SPAN_LABELS = ['Span 1', 'Span 2', 'Span 3', 'Span 4 (seam)'];

export function YearView() {
  const reading = usePyre({ rate: 'second' });
  const year = new Date().getFullYear();

  const spanRemaining = reading?.span.remaining ?? SPAN_COUNT;
  const currentSpanIndex = SPAN_COUNT - spanRemaining; // 0-indexed
  const daySpanFraction = reading?.day.fraction ?? 1;
  const daysLeftInSpan = reading?.day.remaining ?? null;
  const yearFractionLeft = reading?.year.fraction ?? 1;
  const yearPercentSpent = Math.round((1 - yearFractionLeft) * 100);
  const daysLeftInYear = reading ? Math.ceil(yearFractionLeft * daysInYear(year)) : null;

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-12 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-sm font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
          {year}
        </h1>
        <div className="tabular text-5xl font-semibold leading-none" style={{ letterSpacing: '-0.03em' }}>
          {yearPercentSpent}% spent
        </div>
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          A year is 100 days × 4 spans, minus the seam — the last span runs short so the year comes
          out even.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex h-4 w-full overflow-hidden rounded-full" style={{ background: 'var(--line)' }}>
          {SPAN_LABELS.map((_, i) => {
            const isCurrent = i === currentSpanIndex;
            const isPast = i < currentSpanIndex;
            const width = 100 / SPAN_COUNT;
            return (
              <div
                key={i}
                className="relative h-full"
                style={{
                  width: `${width}%`,
                  borderRight: i < SPAN_COUNT - 1 ? '2px solid var(--bg)' : undefined,
                  background: isPast ? 'var(--accent-dim)' : isCurrent ? 'var(--accent)' : 'transparent',
                }}
              >
                {isCurrent && (
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${(1 - daySpanFraction) * 100}%`,
                      background: 'var(--accent)',
                      opacity: 0.55,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs tabular" style={{ color: 'var(--fg-faint)' }}>
          {SPAN_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-4">
        <Stat label="Days left this span" value={daysLeftInSpan !== null ? String(daysLeftInSpan) : '—'} />
        <Stat
          label="Span"
          value={reading ? `${currentSpanIndex + 1} of ${SPAN_COUNT}` : '—'}
        />
        <Stat label="Days left this year" value={daysLeftInYear !== null ? String(daysLeftInYear) : '—'} />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-2xl p-4"
      style={{ background: 'var(--bg-raised)', border: '1px solid var(--line)' }}
    >
      <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-faint)' }}>
        {label}
      </span>
      <span className="tabular text-2xl font-semibold">{value}</span>
    </div>
  );
}
