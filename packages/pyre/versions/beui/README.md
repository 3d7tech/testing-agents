# Version 3 — beui.dev idiom

`@beui/glass-counter`: the motion-first variant, built on `motion/react`.
Springs, not durations, everywhere.

- **The signature interaction is the rollover, not the dial.** Every ring's
  remaining count is rendered as an odometer (`DigitRoll`/`DigitColumn`):
  each digit column springs upward, staggered right to left. Grain rolls
  over every 8.64 seconds, so it fires often enough to be the component's
  personality.
- **Second move**: a radial bloom sweeps outward from the centre through
  the rings, staggered by radius, once per glass rollover (~every 14m 24s).
- **Head physics**: `RingHead` follows a continuously-increasing target
  angle (`useContinuousAngle`) with a `useSpring`, so it lags very slightly
  behind the true position and settles — never wraps backward through a
  rollover, never reads as a plain progress bar.
- `prefers-reduced-motion: reduce` kills the spring heads and the bloom
  entirely and forces `rollover` to `'none'` (instant value change, no
  layout shift — each digit slot is a fixed-size `overflow: hidden` box
  regardless of animation mode).

See `llms.txt` for the plain-text "when to reach for this component"
summary and `registry-item.json` for the shadcn registry entry.
