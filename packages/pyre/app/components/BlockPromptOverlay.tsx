import { beatToClockTime } from '../lib/format';
import type { BlockPrompt, BlockPromptResponse } from '../hooks/useBlockPrompts';

export function BlockPromptOverlay({
  prompt,
  onRespond,
}: {
  prompt: BlockPrompt;
  onRespond: (response: BlockPromptResponse) => void;
}) {
  const { block, kind } = prompt;
  const timeRange = `${beatToClockTime(block.startBeat)}–${beatToClockTime(block.endBeat + 1)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      role="alertdialog"
      aria-modal="true"
      aria-label={kind === 'start' ? `Starting ${block.label}` : `${block.label} — mark as done?`}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl p-6"
        style={{ background: 'var(--bg-raised)', border: '1px solid var(--line)' }}
      >
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: block.color }} />
          <span className="tabular text-xs" style={{ color: 'var(--fg-faint)' }}>
            {timeRange}
          </span>
        </div>

        {kind === 'start' ? (
          <>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.15em]" style={{ color: 'var(--accent)' }}>
                Starting now
              </div>
              <div className="mt-1 text-xl font-semibold">{block.label}</div>
            </div>
            <button
              type="button"
              onClick={() => onRespond('dismiss')}
              className="rounded-lg py-2.5 text-sm font-medium"
              style={{ background: 'var(--accent)', color: 'var(--bg)' }}
            >
              Got it
            </button>
          </>
        ) : (
          <>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.15em]" style={{ color: 'var(--accent)' }}>
                Time's up
              </div>
              <div className="mt-1 text-xl font-semibold">{block.label}</div>
              <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                Did you get this done?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onRespond('done')}
                className="flex-1 rounded-lg py-2.5 text-sm font-medium"
                style={{ background: 'var(--accent)', color: 'var(--bg)' }}
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => onRespond('skipped')}
                className="flex-1 rounded-lg py-2.5 text-sm"
                style={{ background: 'var(--line)', color: 'var(--fg)' }}
              >
                Not done
              </button>
            </div>
            <button
              type="button"
              onClick={() => onRespond('snooze')}
              className="text-sm"
              style={{ color: 'var(--fg-faint)' }}
            >
              Snooze 15 min
            </button>
          </>
        )}
      </div>
    </div>
  );
}
