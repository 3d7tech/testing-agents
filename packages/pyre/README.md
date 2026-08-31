# Beat

A decimal clock and day planner. Instead of "2:14pm", you see how many
**beats** are left today — every day is exactly 100 of them.

```
mote (86.4ms) -> grain (8.64s) -> beat (14m 24s) -> day -> span (100 days) -> year
```

This isn't a progress tracker or a novelty widget — it's a replacement for
reading the time, built around one idea: `day` is a real calendar day
(DST-aware), fixed as the anchor, and everything nests by a hundredfold
from there. That's what makes "100 beats left today" an exact promise, not
an approximation. The one necessary irregularity — a year holds ~3.65
spans of 100 days, never a clean 100 — sits at the far end, at the year
boundary, as far as possible from the number you actually look at.

See `src/pyre-core.ts` for the full design note, the DST/leap-year-aware
arithmetic, and its acceptance tests (Vitest in-source tests at the bottom
of the file — run with `npm test`).

## The app

An installable PWA with three views:

- **Now** — the headline surface. A single number (beats left today), a
  thin depleting ring, and a demoted, small conventional clock time in the
  corner as a bridge for anyone who still needs it.
- **Day** — a scrollable timeline of today's 100 beats. Drag across a
  range to block out time against a task (time-boxing in beats instead of
  hours/minutes), persisted per-day in `localStorage`.
- **Year** — which of the year's 4 spans you're in, days left in it, and
  overall percent of the year spent.

## Layout

- `src/pyre-core.ts` — shared arithmetic (`readPyre`) and the SSR-safe
  `usePyre` React hook.
- `app/` — the actual app: `App.tsx` (nav shell), `views/` (Now/Day/Year),
  `lib/` (formatting + the `localStorage`-backed day-block store).
- `public/` — PWA icons (`icon.svg` is the source; the PNGs are rasterized
  from it) and manifest assets.

## Commands

```bash
npm install
npm test         # Vitest acceptance tests for pyre-core.ts
npm run typecheck
npm run dev       # local dev server at http://localhost:5173
npm run build     # builds to ../../docs/pyre/
```

## GitHub Pages

This repo's Pages source is `/docs` on the default branch (see
`GITHUB_PAGES_SETUP.md`), already serving an unrelated app at `docs/`. Beat
is built with `base: '/testing-agents/pyre/'` and its output is committed
under `docs/pyre/` so it publishes alongside the existing site at
`https://<org>.github.io/testing-agents/pyre/` without touching
`docs/index.html`. Re-run `npm run build` and commit the refreshed
`docs/pyre/` output whenever `src/` or `app/` changes — Pages serves
whatever is committed there, it does not run a build step.
