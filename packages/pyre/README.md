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

This package currently ships **Version 1** of the design brief: `GlassClock`,
the canonical shadcn-registry-shaped SVG dial. Four more variants (a generic
nested-depletion primitive, a Motion-driven rollover component, a WebGL
showpiece, and a set of transitions.dev-style CSS recipes) are described in
the original brief but not yet built here.

## Layout

- `src/pyre-core.ts` — shared arithmetic (`readPyre`) and the SSR-safe
  `usePyre` React hook. Every other variant is meant to import this file
  unchanged rather than reimplementing the countdown math.
- `src/glass-clock.tsx` — `GlassClock`, `GlassClockDial`, `GlassClockLegend`.
  SVG only, zero dependencies beyond React, every colour goes through
  `--chart-1`..`--chart-5` / `--muted` / `--foreground` (the shadcn/ui
  convention: raw `"H S% L%"` triplets consumed as `hsl(var(--token))`).
- `registry/glass-clock.json` / `registry.json` — the shadcn registry item.
  Once hosted, `npx shadcn add https://yourdomain/r/glass-clock.json`
  installs the component with no further config.
- `demo/` — a small Vite + React app used both for local development
  (`npm run dev`) and to produce the static build committed to
  `../../docs/pyre/` for GitHub Pages.

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
