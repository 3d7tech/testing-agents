import * as React from 'react';
import { usePyre } from '../../src/pyre-core';
import {
  BLOCK_COLORS,
  ensureSleepPrefill,
  findBlockAtBeat,
  loadBlocks,
  makeBlockId,
  saveBlocks,
  type DayBlock,
} from '../lib/blocks';
import { beatToClockTime } from '../lib/format';

const BEATS = 100;
const COLS = 10;
const ROWS = 10;

interface EditingState {
  id: string | null;
  startBeat: number;
  endBeat: number;
  label: string;
  color: string;
  status: DayBlock['status'];
}

function stepBounds(blocks: DayBlock[], excludeId: string | null, startBeat: number, endBeat: number) {
  let min = 0;
  let max = BEATS - 1;
  for (const b of blocks) {
    if (b.id === excludeId) continue;
    if (b.endBeat < startBeat) min = Math.max(min, b.endBeat + 1);
    if (b.startBeat > endBeat) max = Math.min(max, b.startBeat - 1);
  }
  return { min, max };
}

export function DayView() {
  const reading = usePyre({ rate: 'second' });
  const currentBeatIndex = reading ? 100 - reading.beat.remaining : null;

  const [blocks, setBlocks] = React.useState<DayBlock[]>([]);
  const [today, setToday] = React.useState<Date | null>(null);
  const [editing, setEditing] = React.useState<EditingState | null>(null);

  React.useEffect(() => {
    const now = new Date();
    setToday(now);
    setBlocks(ensureSleepPrefill(now, loadBlocks(now)));
  }, []);

  const persist = (next: DayBlock[]) => {
    setBlocks(next);
    if (today) saveBlocks(today, next);
  };

  const handleCellClick = (beat: number) => {
    const existing = findBlockAtBeat(blocks, beat);
    if (existing) {
      setEditing({
        id: existing.id,
        startBeat: existing.startBeat,
        endBeat: existing.endBeat,
        label: existing.label,
        color: existing.color,
        status: existing.status,
      });
      return;
    }
    const nextColor = BLOCK_COLORS[blocks.length % BLOCK_COLORS.length];
    setEditing({ id: null, startBeat: beat, endBeat: beat, label: '', color: nextColor, status: 'pending' });
  };

  const commitEditing = () => {
    if (!editing || !editing.label.trim()) {
      setEditing(null);
      return;
    }
    const block: DayBlock = {
      id: editing.id ?? makeBlockId(),
      startBeat: editing.startBeat,
      endBeat: editing.endBeat,
      label: editing.label.trim(),
      color: editing.color,
      status: editing.status,
    };
    const withoutOverlap = blocks.filter((b) => {
      if (b.id === block.id) return false;
      return b.endBeat < block.startBeat || b.startBeat > block.endBeat;
    });
    persist([...withoutOverlap, block].sort((a, b) => a.startBeat - b.startBeat));
    setEditing(null);
  };

  const deleteEditing = () => {
    if (editing?.id) {
      persist(blocks.filter((b) => b.id !== editing.id));
    }
    setEditing(null);
  };

  const adjustStart = (delta: number) => {
    if (!editing) return;
    const { min } = stepBounds(blocks, editing.id, editing.startBeat, editing.endBeat);
    const next = Math.max(min, Math.min(editing.endBeat, editing.startBeat + delta));
    setEditing({ ...editing, startBeat: next });
  };

  const adjustEnd = (delta: number) => {
    if (!editing) return;
    const { max } = stepBounds(blocks, editing.id, editing.startBeat, editing.endBeat);
    const next = Math.min(max, Math.max(editing.startBeat, editing.endBeat + delta));
    setEditing({ ...editing, endBeat: next });
  };

  const unplannedCount = BEATS - blocks.reduce((sum, b) => sum + (b.endBeat - b.startBeat + 1), 0);

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-1">
        <h1 className="text-sm font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
          Today
        </h1>
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Tap a beat to block out time. {unplannedCount} of {BEATS} beats unplanned.
        </p>
      </header>

      <div className="flex gap-2">
        <div className="flex flex-col justify-between py-[3px] text-right text-[10px] tabular" style={{ color: 'var(--fg-faint)' }}>
          {Array.from({ length: ROWS }, (_, row) => (
            <span key={row} style={{ height: 'min(7vw, 32px)', lineHeight: 'min(7vw, 32px)' }}>
              {beatToClockTime(row * COLS)}
            </span>
          ))}
        </div>
        <div
          className="grid flex-1 select-none gap-[3px] rounded-xl p-3"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            background: 'var(--bg-raised)',
            border: '1px solid var(--line)',
          }}
        >
          {Array.from({ length: BEATS }, (_, beat) => {
            const block = findBlockAtBeat(blocks, beat);
            const isCurrent = currentBeatIndex === beat;
            const isPast = currentBeatIndex !== null && beat < currentBeatIndex;
            return (
              <button
                key={beat}
                type="button"
                aria-label={`Beat ${beat + 1}, ${beatToClockTime(beat)}${block ? `: ${block.label}` : ''}`}
                onClick={() => handleCellClick(beat)}
                className="aspect-square rounded-[4px] transition-colors"
                style={{
                  background: block ? block.color : 'var(--line)',
                  opacity: isPast && !block ? 0.35 : block?.status === 'skipped' ? 0.4 : 1,
                  outline: isCurrent ? '2px solid var(--fg)' : 'none',
                  outlineOffset: 1,
                }}
              />
            );
          })}
        </div>
      </div>

      {editing && (
        <div
          className="flex flex-col gap-3 rounded-xl p-4"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--line)' }}
        >
          <input
            autoFocus
            value={editing.label}
            onChange={(e) => setEditing({ ...editing, label: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && commitEditing()}
            placeholder="Deep work, meetings, gym…"
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--fg)' }}
          />

          <div className="flex flex-wrap items-center gap-4">
            <Stepper
              label="Start"
              time={beatToClockTime(editing.startBeat)}
              onDec={() => adjustStart(-1)}
              onInc={() => adjustStart(1)}
            />
            <Stepper
              label="End"
              time={beatToClockTime(editing.endBeat + 1)}
              onDec={() => adjustEnd(-1)}
              onInc={() => adjustEnd(1)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1.5">
              {BLOCK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colour ${c}`}
                  onClick={() => setEditing({ ...editing, color: c })}
                  className="h-6 w-6 rounded-full"
                  style={{ background: c, outline: editing.color === c ? '2px solid var(--fg)' : 'none', outlineOffset: 2 }}
                />
              ))}
            </div>
            <div className="ml-auto flex gap-2">
              {editing.id && (
                <button
                  type="button"
                  onClick={deleteEditing}
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={commitEditing}
                className="rounded-lg px-4 py-2 text-sm font-medium"
                style={{ background: 'var(--accent)', color: 'var(--bg)' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {blocks.length === 0 && (
          <li className="text-sm" style={{ color: 'var(--fg-faint)' }}>
            Nothing planned yet — tap a beat above to add a block.
          </li>
        )}
        {blocks.map((b) => (
          <li key={b.id} className="flex items-center gap-3 text-sm">
            <span className="h-3 w-3 rounded-full" style={{ background: b.color }} />
            <span className="tabular w-32 shrink-0" style={{ color: 'var(--fg-faint)' }}>
              {beatToClockTime(b.startBeat)}–{beatToClockTime(b.endBeat + 1)}
            </span>
            <span>{b.label}</span>
            {b.status !== 'pending' && (
              <span
                className="ml-auto rounded-full px-2 py-0.5 text-xs"
                style={{
                  background: b.status === 'done' ? 'var(--accent-dim)' : 'var(--line)',
                  color: b.status === 'done' ? 'var(--accent)' : 'var(--fg-muted)',
                }}
              >
                {b.status}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stepper({
  label,
  time,
  onDec,
  onInc,
}: {
  label: string;
  time: string;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs" style={{ color: 'var(--fg-faint)' }}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDec}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className="flex h-7 w-7 items-center justify-center rounded-full text-sm"
          style={{ background: 'var(--line)', color: 'var(--fg)' }}
        >
          −
        </button>
        <span className="tabular w-20 text-center text-sm">{time}</span>
        <button
          type="button"
          onClick={onInc}
          aria-label={`Increase ${label.toLowerCase()}`}
          className="flex h-7 w-7 items-center justify-center rounded-full text-sm"
          style={{ background: 'var(--line)', color: 'var(--fg)' }}
        >
          +
        </button>
      </div>
    </div>
  );
}
