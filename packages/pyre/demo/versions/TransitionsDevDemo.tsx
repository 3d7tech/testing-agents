import { TDeplete } from '../../versions/transitions-dev/t-deplete';
import { TRollover } from '../../versions/transitions-dev/t-rollover';
import { TRelight } from '../../versions/transitions-dev/t-relight';
import { usePyre } from '../../src/pyre-core';

export function TransitionsDevDemo() {
  const reading = usePyre({ rate: 'second' });
  const glass = reading?.glass;

  return (
    <div className="demo-card" style={{ gap: '1.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>t-deplete (current glass)</span>
        <TDeplete
          fraction={glass ? glass.fraction : 1}
          style={{ width: 96, height: 96, color: 'hsl(var(--chart-3))', ['--t-deplete-track' as string]: 'hsl(var(--muted))' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>t-rollover (glasses left)</span>
        <TRelight trigger={glass?.remaining} style={{ fontSize: '2.5rem', fontWeight: 700 }}>
          <TRollover value={glass ? glass.remaining : 0} />
        </TRelight>
      </div>

      <p className="demo-note" style={{ maxWidth: '20rem' }}>
        t-relight fires whenever the glass rolls over (every 14m 24s) —
        watch the number for the burst.
      </p>
    </div>
  );
}
