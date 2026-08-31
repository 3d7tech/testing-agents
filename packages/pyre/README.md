# Pyre — Glass Clock

A countdown clock where every unit is a hundredth of the one above it, so a
single **glass** is exactly 1% of a day and cost becomes legible without
arithmetic:

```
mote (86.4ms) -> grain (8.64s) -> glass (14m 24s) -> day -> span (100 days) -> year
```

Everything falls toward 1 and resets — this is a countdown, never a
count-up. See `src/pyre-core.ts` for the full design note and the
DST/leap-year-aware arithmetic, and its acceptance tests (Vitest in-source
tests at the bottom of the file — run with `npm test`).

This package ships all five variants from the design brief, all built on the
same `src/pyre-core.ts`:

- **Version 1 — `src/glass-clock.tsx`** (shadcn idiom): `GlassClock`,
  `GlassClockDial`, `GlassClockLegend`. SVG only, zero dependencies beyond
  React, every colour goes through `--chart-1`..`--chart-5` / `--muted` /
  `--foreground` (the shadcn/ui convention: raw `"H S% L%"` triplets
  consumed as `hsl(var(--token))`). Registry item at
  `registry/glass-clock.json` / `registry.json` — once hosted,
  `npx shadcn add https://yourdomain/r/glass-clock.json` installs it with
  no further config. This is the reference every other version is checked
  against, and Version 4's fallback target.
- **Version 2 — `versions/beautifui/`** (beautifui.dev idiom): `DepleteDial`,
  a generic nested-depletion primitive (`levels: DepleteLevel[]`, not about
  time). Exactly three files, zero npm dependencies. See its README for the
  self-referencing-custom-property pitfall its CSS token layer had to avoid.
- **Version 3 — `versions/beui/`** (beui.dev idiom): `GlassCounter`, built on
  `motion/react`. Per-digit odometer rollover staggered right to left, a
  radial bloom on every glass rollover, and spring-following burn heads.
  Ships an `llms.txt` for agent consumers.
- **Version 4 — `versions/rareui/`** (rareui.com idiom): `EmberDial`, a
  single-draw-call WebGL fragment shader (`ember-shader.ts`) drawing the
  rings as signed-distance arcs with ember particles, falling back to
  Version 1's SVG dial on any WebGL failure — exercised in a test, not just
  asserted.
- **Version 5 — `versions/transitions-dev/`** (transitions.dev idiom): three
  standalone CSS transition recipes (`t-deplete`, `t-rollover`, `t-relight`)
  with React/TS variants, no demo-specific sizing.

Each `versions/*/README.md` has the version-specific detail; this file
covers what's shared.

## Layout

- `src/pyre-core.ts` — shared arithmetic (`readPyre`) and the SSR-safe
  `usePyre` React hook. Every variant imports this file (or, where a
  version's own spec requires it to ship as a standalone few-file bundle,
  an exact unmodified copy of it — see `versions/beautifui/pyre-core.ts`)
  rather than reimplementing the countdown math.
- `src/glass-clock.tsx` — Version 1 (see above).
- `versions/beautifui/`, `versions/beui/`, `versions/rareui/`,
  `versions/transitions-dev/` — Versions 2-5 (see above).
- `demo/` — a small Vite + React app with a tab per version, used both for
  local development (`npm run dev`) and to produce the static build
  committed to `../../docs/pyre/` for GitHub Pages.

## Commands

```bash
npm install
npm test         # Vitest acceptance tests for pyre-core.ts
npm run typecheck
npm run dev       # local demo at http://localhost:5173
npm run build     # builds the demo to ../../docs/pyre/
```

## GitHub Pages

This repo's Pages source is `/docs` on the default branch (see
`GITHUB_PAGES_SETUP.md`), already serving an unrelated app at `docs/`. The
glass-clock demo is built with `base: '/testing-agents/pyre/'` and its
output is committed under `docs/pyre/` so it publishes alongside the
existing site at `https://<org>.github.io/testing-agents/pyre/` without
touching `docs/index.html`. Re-run `npm run build` and commit the refreshed
`docs/pyre/` output whenever `src/` changes — Pages serves whatever is
committed there, it does not run a build step.
