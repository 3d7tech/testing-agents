import * as React from 'react';
import { usePyre } from '../../src/pyre-core';
import { findBlockAtBeat, loadBlocks, type DayBlock } from '../lib/blocks';
import { formatClockTime, formatDayLabel } from '../lib/format';

const GROUP_SIZE = 10;
const GROUPS = 10;
const ROW_WIDTH = 'min(360px, 82vw)';

interface RowCell {
  isPast: boolean;
  isCurrent: boolean;
}

function cellsForGroup(positionInGroup: number): RowCell[] {
  return Array.from({ length: GROUP_SIZE }, (_, i) => ({
    isPast: i < positionInGroup,
    isCurrent: i === positionInGroup,
  }));
}

function DepleteGrid({
  positionInGroup,
  height,
  colorForCell,
  animate,
  ariaLabel,
}: {
  positionInGroup: number;
  height: number;
  colorForCell: (index: number) => string;
  animate: boolean;
  ariaLabel: string;
}) {
  const cells = cellsForGroup(positionInGroup);
  return (
    <div className="flex gap-1.5" role="img" aria-label={ariaLabel}>
      {cells.map((cell, i) => (
        <div
          key={i}
          className={`flex-1 rounded-full ${cell.isCurrent && animate ? 'motion-safe:animate-pulse' : ''}`}
          style={{
            height,
            background: colorForCell(i),
            opacity: cell.isPast ? 0.22 : 1,
            transition: 'opacity 300ms linear',
          }}
        />
      ))}
    </div>
  );
}

export interface NowViewProps {
  /** Show the conventional date/time alongside a matching beat-notation
   * line, so it's easy to learn the mapping between the two. When false,
   * both are hidden — just the beat headline and grids remain. */
  showRealDate: boolean;
}

export function NowView({ showRealDate }: NowViewProps) {
  const reading = usePyre({ rate: 'second' });
  const [now, setNow] = React.useState<Date | null>(null);
  const [todaysBlocks, setTodaysBlocks] = React.useState<DayBlock[]>([]);

  const hasReadOnce = React.useRef(false);
  const isFirstReading = reading !== null && !hasReadOnce.current;
  if (reading !== null) hasReadOnce.current = true;

  React.useEffect(() => {
    const nowDate = new Date();
    setNow(nowDate);
    setTodaysBlocks(loadBlocks(nowDate));
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const beatsLeft = reading?.beat.remaining ?? null;
  const grainsLeft = reading?.grain.remaining ?? null;

  const elapsedBeats = reading ? 100 - reading.beat.remaining : 0;
  const beatGroupIndex = Math.floor(elapsedBeats / GROUP_SIZE);
  const beatPositionInGroup = elapsedBeats % GROUP_SIZE;

  const elapsedGrains = reading ? 100 - reading.grain.remaining : 0;
  const grainPositionInGroup = elapsedGrains % GROUP_SIZE;

  const currentBlock = reading ? findBlockAtBeat(todaysBlocks, elapsedBeats) : undefined;

  const beatNotation =
    reading && now
      ? `beat ${reading.beat.remaining}/100, day ${reading.day.remaining}/${reading.day.capacity}, ${now.getFullYear()}`
      : null;

  const beatCellColor = React.useCallback(
    (indexInGroup: number) => {
      const absoluteBeat = beatGroupIndex * GROUP_SIZE + indexInGroup;
      const block = findBlockAtBeat(todaysBlocks, absoluteBeat);
      return block ? block.color : 'var(--accent)';
    },
    [beatGroupIndex, todaysBlocks],
  );

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 px-6 py-16">
      {showRealDate && (
        <div
          className="flex flex-col items-center gap-1 text-xs uppercase tracking-[0.2em]"
          style={{ color: 'var(--fg-faint)' }}
        >
          <span className="tabular">{now ? formatClockTime(now) : ' '}</span>
          <span>{now ? formatDayLabel(now) : ' '}</span>
          <span className="tabular normal-case tracking-normal" style={{ color: 'var(--fg-muted)' }}>
            {beatNotation ?? ' '}
          </span>
        </div>
      )}

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

      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-col gap-1.5" style={{ width: ROW_WIDTH }}>
          <div className="flex items-baseline justify-between text-xs" style={{ color: 'var(--fg-faint)' }}>
            <span className="uppercase tracking-[0.15em]">Beat</span>
            <span className="tabular">
              {beatGroupIndex + 1} of {GROUPS}
            </span>
          </div>
          <DepleteGrid
            positionInGroup={beatPositionInGroup}
            height={12}
            colorForCell={beatCellColor}
            animate={!isFirstReading}
            ariaLabel={`Beat ${elapsedBeats + 1} of 100`}
          />
        </div>

        <div className="flex flex-col gap-1.5" style={{ width: ROW_WIDTH }}>
          <div className="text-xs tabular" style={{ color: 'var(--fg-faint)' }}>
            {grainsLeft !== null ? `grain ${grainsLeft}` : ' '}
          </div>
          <DepleteGrid
            positionInGroup={grainPositionInGroup}
            height={5}
            colorForCell={() => 'var(--accent)'}
            animate={!isFirstReading}
            ariaLabel={`Grain ${grainsLeft ?? '—'} left this beat`}
          />
        </div>
      </div>

      {currentBlock && (
        <div
          className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
          style={{ background: currentBlock.color, color: 'var(--bg)' }}
        >
          <span>Now: {currentBlock.label}</span>
        </div>
      )}
    </div>
  );
}
