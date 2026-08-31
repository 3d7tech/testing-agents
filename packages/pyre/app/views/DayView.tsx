import * as React from 'react';
import { usePyre } from '../../src/pyre-core';
import { BLOCK_COLORS, findBlockAtBeat, loadBlocks, saveBlocks, type DayBlock } from '../lib/blocks';

const BEATS = 100;

function makeId(): string {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function DayView() {
  const reading = usePyre({ rate: 'second' });
  const currentBeatIndex = reading ? 100 - reading.beat.remaining : null;

  const [blocks, setBlocks] = React.useState<DayBlock[]>([]);
  const [today, setToday] = React.useState<Date | null>(null);
  const [dragAnchor, setDragAnchor] = React.useState<number | null>(null);
  const [dragEnd, setDragEnd] = React.useState<number | null>(null);
  const [editing, setEditing] = React.useState<{ id: string | null; startBeat: number; endBeat: number; label: string; color: string } | null>(
    null,
  );

  React.useEffect(() => {
    const now = new Date();
    setToday(now);
    setBlocks(loadBlocks(now));
  }, []);

  const persist = (next: DayBlock[]) => {
    setBlocks(next);
    if (today) saveBlocks(today, next);
  };

  const dragRange =
    dragAnchor !== null && dragEnd !== null
      ? [Math.min(dragAnchor, dragEnd), Math.max(dragAnchor, dragEnd)]
      : null;

  const handleCellDown = (beat: number) => {
    const existing = findBlockAtBeat(blocks, beat);
    if (existing) {
      setEditing({ id: existing.id, startBeat: existing.startBeat, endBeat: existing.endBeat, label: existing.label, color: existing.color });
      return;
    }
    setDragAnchor(beat);
    setDragEnd(beat);
  };

  const handleCellEnter = (beat: number) => {
    if (dragAnchor !== null) setDragEnd(beat);
  };

  const handleMouseUp = () => {
    if (dragRange) {
      const nextColor = BLOCK_COLORS[blocks.length % BLOCK_COLORS.length];
      setEditing({ id: null, startBeat: dragRange[0], endBeat: dragRange[1], label: '', color: nextColor });
    }
    setDragAnchor(null);
    setDragEnd(null);
  };

  const commitEditing = () => {
    if (!editing || !editing.label.trim()) {
      setEditing(null);
      return;
    }
    const withoutOverlap = blocks.filter((b) => {
      if (b.id === editing.id) return false;
      return b.endBeat < editing.startBeat || b.startBeat > editing.endBeat;
    });
    const block: DayBlock = {
      id: editing.id ?? makeId(),
      startBeat: editing.startBeat,
      endBeat: editing.endBeat,
      label: editing.label.trim(),
      color: editing.color,
    };
    persist([...withoutOverlap, block].sort((a, b) => a.startBeat - b.startBeat));
    setEditing(null);
  };

  const deleteEditing = () => {
    if (editing?.id) {
      persist(blocks.filter((b) => b.id !== editing.id));
    }
    setEditing(null);
  };

  const unplannedCount = BEATS - blocks.reduce((sum, b) => sum + (b.endBeat - b.startBeat + 1), 0);

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-1">
        <h1 className="text-sm font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
          Today
        </h1>
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Drag across beats to block out time. {unplannedCount} of {BEATS} beats unplanned.
        </p>
      </header>

      <div
        className="overflow-x-auto rounded-xl p-3"
        style={{ background: 'var(--bg-raised)', border: '1px solid var(--line)' }}
      >
        <div
          className="flex select-none gap-[3px]"
          style={{ width: BEATS * 11 }}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (dragAnchor !== null) handleMouseUp();
          }}
        >
          {Array.from({ length: BEATS }, (_, beat) => {
            const block = findBlockAtBeat(blocks, beat);
            const inDrag = dragRange && beat >= dragRange[0] && beat <= dragRange[1];
            const isCurrent = currentBeatIndex === beat;
            const isPast = currentBeatIndex !== null && beat < currentBeatIndex;
            return (
              <button
                key={beat}
                type="button"
                aria-label={`Beat ${beat + 1}${block ? `: ${block.label}` : ''}`}
                onMouseDown={() => handleCellDown(beat)}
                onMouseEnter={() => handleCellEnter(beat)}
                className="h-9 w-2 shrink-0 rounded-[3px] transition-colors"
                style={{
                  background: inDrag ? 'var(--accent)' : block ? block.color : 'var(--line)',
                  opacity: isPast && !block ? 0.35 : 1,
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
          className="flex flex-wrap items-center gap-3 rounded-xl p-4"
          style={{ background: 'var(--bg-raised)', border: '1px solid var(--line)' }}
        >
          <span className="tabular text-sm" style={{ color: 'var(--fg-muted)' }}>
            beats {editing.startBeat + 1}–{editing.endBeat + 1}
          </span>
          <input
            autoFocus
            value={editing.label}
            onChange={(e) => setEditing({ ...editing, label: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && commitEditing()}
            placeholder="Deep work, meetings, gym…"
            className="min-w-40 flex-1 rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--fg)' }}
          />
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
          <button
            type="button"
            onClick={commitEditing}
            className="rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            Save
          </button>
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
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {blocks.length === 0 && (
          <li className="text-sm" style={{ color: 'var(--fg-faint)' }}>
            Nothing planned yet — drag across the beats above to add a block.
          </li>
        )}
        {blocks.map((b) => (
          <li key={b.id} className="flex items-center gap-3 text-sm">
            <span className="h-3 w-3 rounded-full" style={{ background: b.color }} />
            <span className="tabular w-20 shrink-0" style={{ color: 'var(--fg-faint)' }}>
              {b.startBeat + 1}–{b.endBeat + 1}
            </span>
            <span>{b.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
