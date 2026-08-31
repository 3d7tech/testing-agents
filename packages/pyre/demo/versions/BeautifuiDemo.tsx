import * as React from 'react';
import { DepleteDial, type DepleteLevel } from '../../versions/beautifui/deplete-dial';
import { PYRE_RING_UNITS, usePyre, type PyreUnit } from '../../src/pyre-core';

function useClockLevels(): DepleteLevel[] {
  const reading = usePyre({ rate: 'second' });
  return React.useMemo(() => {
    if (!reading) return [];
    return (PYRE_RING_UNITS as readonly PyreUnit[]).map((unit) => {
      const u = reading[unit];
      return { label: unit, remaining: u.remaining, total: u.capacity, fraction: u.fraction };
    });
  }, [reading]);
}

// A non-time demo: the exact same component and CSS, fed a quarterly
// budget burn-down instead of a clock reading. Nothing about DepleteDial
// changes.
const BUDGET_LEVELS: DepleteLevel[] = [
  { label: 'Q1 budget', remaining: 42_000, total: 120_000, fraction: 42_000 / 120_000 },
  { label: 'Marketing bucket', remaining: 8_400, total: 30_000, fraction: 8_400 / 30_000 },
  { label: 'Infra bucket', remaining: 19_500, total: 25_000, fraction: 19_500 / 25_000 },
];

export function BeautifuiDemo() {
  const clockLevels = useClockLevels();
  return (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <div className="demo-card">
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Clock demo</h2>
        <DepleteDial levels={clockLevels} />
      </div>
      <div className="demo-card">
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Non-time demo: budget burn-down</h2>
        <DepleteDial levels={BUDGET_LEVELS} showCenterValue={false} />
      </div>
    </div>
  );
}
