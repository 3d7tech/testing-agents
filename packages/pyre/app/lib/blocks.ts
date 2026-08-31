export type BlockStatus = 'pending' | 'done' | 'skipped';

export interface DayBlock {
  id: string;
  /** 0-indexed beat range, inclusive on both ends, within a single day (0..99). */
  startBeat: number;
  endBeat: number;
  label: string;
  color: string;
  status: BlockStatus;
  /**
   * Which prompts have already been shown for this block, so a reload or a
   * re-render never re-surfaces the same start/end prompt twice.
   */
  startPrompted?: boolean;
  endPrompted?: boolean;
  /** Set by "Snooze" on the end-of-block prompt: re-ask once currentBeat reaches this. */
  snoozeUntilBeat?: number;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function storageKey(date: Date): string {
  return `beat:blocks:${dateKey(date)}`;
}

function initializedKey(date: Date): string {
  return `beat:day-initialized:${dateKey(date)}`;
}

export function loadBlocks(date: Date): DayBlock[] {
  try {
    const raw = localStorage.getItem(storageKey(date));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Older saves predate `status` — default them to pending rather than
    // breaking on load.
    return parsed.map((b) => ({ status: 'pending' as const, ...b }));
  } catch {
    return [];
  }
}

export function saveBlocks(date: Date, blocks: DayBlock[]): void {
  try {
    localStorage.setItem(storageKey(date), JSON.stringify(blocks));
  } catch {
    // Storage unavailable (quota, private mode) — the session still works,
    // it just won't persist across reloads.
  }
}

export function findBlockAtBeat(blocks: DayBlock[], beatIndex: number): DayBlock | undefined {
  return blocks.find((b) => beatIndex >= b.startBeat && beatIndex <= b.endBeat);
}

export const BLOCK_COLORS = [
  '#e8b94a', // amber (accent)
  '#7c9cff', // periwinkle
  '#6fcf97', // sage
  '#f28b82', // clay
  '#c792ea', // lilac
  '#5fd0d6', // teal
];

/** Beats 0-29 cover midnight through 7:12am — the closest beat boundary at
 * or after 7:00am, so the default Sleep block never stops short of 7am. */
export const SLEEP_BLOCK: Omit<DayBlock, 'id'> = {
  startBeat: 0,
  endBeat: 29,
  label: 'Sleep',
  color: BLOCK_COLORS[1],
  status: 'pending',
};

export function makeBlockId(): string {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Ensures today has a Sleep block the very first time it's ever opened, and
 * never again — so deleting Sleep on a later visit doesn't resurrect it.
 * Returns the (possibly-updated) block list.
 */
export function ensureSleepPrefill(date: Date, blocks: DayBlock[]): DayBlock[] {
  try {
    if (localStorage.getItem(initializedKey(date))) return blocks;
    localStorage.setItem(initializedKey(date), '1');
  } catch {
    return blocks;
  }
  if (blocks.length > 0) return blocks;
  const withSleep = [{ id: makeBlockId(), ...SLEEP_BLOCK }];
  saveBlocks(date, withSleep);
  return withSleep;
}
