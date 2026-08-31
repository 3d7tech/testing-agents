import * as React from 'react';
import { usePyre } from '../../src/pyre-core';
import { loadBlocks, saveBlocks, type DayBlock } from '../lib/blocks';
import { beatToClockTime } from '../lib/format';
import { notify } from '../lib/notifications';

export type BlockPromptKind = 'start' | 'end';

export interface BlockPrompt {
  kind: BlockPromptKind;
  block: DayBlock;
}

export type BlockPromptResponse = 'done' | 'skipped' | 'snooze' | 'dismiss';

/**
 * Watches the live beat against today's blocks and surfaces one prompt at a
 * time: a heads-up when a block starts, and a "did you get this done?"
 * check when it ends. Runs at the App level so it fires no matter which
 * tab is open.
 */
export function useBlockPrompts() {
  const reading = usePyre({ rate: 'second' });
  const currentBeat = reading ? 100 - reading.beat.remaining : null;
  const [prompt, setPrompt] = React.useState<BlockPrompt | null>(null);
  const lastCheckedBeat = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (currentBeat === null) return;
    if (prompt) return; // don't interrupt an active prompt
    if (lastCheckedBeat.current === currentBeat) return; // only check once per beat change
    lastCheckedBeat.current = currentBeat;

    const today = new Date();
    const blocks = loadBlocks(today);

    // Closing something out matters more than announcing the next thing, so
    // end-of-block checks run first.
    for (const b of blocks) {
      const due =
        currentBeat > b.endBeat &&
        b.status === 'pending' &&
        (!b.endPrompted || (b.snoozeUntilBeat !== undefined && currentBeat >= b.snoozeUntilBeat));
      if (due) {
        b.endPrompted = true;
        b.snoozeUntilBeat = undefined;
        saveBlocks(today, blocks);
        setPrompt({ kind: 'end', block: b });
        void notify(`${b.label} — done?`, `Scheduled ${beatToClockTime(b.startBeat)}–${beatToClockTime(b.endBeat + 1)}`);
        return;
      }
    }

    for (const b of blocks) {
      if (currentBeat === b.startBeat && !b.startPrompted) {
        b.startPrompted = true;
        saveBlocks(today, blocks);
        setPrompt({ kind: 'start', block: b });
        void notify(`Starting: ${b.label}`, `Until ${beatToClockTime(b.endBeat + 1)}`);
        return;
      }
    }
  }, [currentBeat, prompt]);

  const respond = React.useCallback(
    (response: BlockPromptResponse) => {
      if (!prompt) return;
      const today = new Date();
      const blocks = loadBlocks(today);
      const index = blocks.findIndex((b) => b.id === prompt.block.id);
      if (index !== -1) {
        if (response === 'done') blocks[index].status = 'done';
        else if (response === 'skipped') blocks[index].status = 'skipped';
        else if (response === 'snooze') {
          blocks[index].endPrompted = true;
          blocks[index].snoozeUntilBeat = (currentBeat ?? blocks[index].endBeat) + 1;
        }
        saveBlocks(today, blocks);
      }
      setPrompt(null);
    },
    [prompt, currentBeat],
  );

  return { prompt, respond };
}
