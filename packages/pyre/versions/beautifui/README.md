# Version 2 — beautifui.dev idiom

`deplete-dial`: a self-contained primitive on a small token layer. This is
the version with a life beyond the countdown-clock gimmick — a nested
depletion dial is a real, reusable primitive.

**Exactly three files, zero npm dependencies:**

- `deplete-dial.tsx` — the component. Takes `levels: DepleteLevel[]`
  (`{ label, remaining, total, fraction }[]`) and renders them as
  concentric depleting rings. Nothing in it is about time.
- `deplete-dial.css` — every knob (`--dial-track`, `--dial-ring-1..5`,
  `--dial-head`, `--dial-fg`, `--dial-size`, `--dial-stroke`,
  `--dial-gap`) is declared at the top via the self-referencing
  `var(--token, fallback)` pattern, so the component renders correctly
  unstyled and improves the moment a host theme defines any of these.
- `pyre-core.ts` — shipped alongside so the clock demo (below) has the
  countdown arithmetic to feed the dial; `deplete-dial.tsx` itself never
  imports it.

## Two demos, same component, zero code changes

- **Clock demo**: `readPyre()`'s five rings (mote/grain/glass/day/span)
  mapped straight into `DepleteLevel[]`.
- **Non-time demo**: a quarterly budget burn-down — "Q1 spend", "Marketing
  bucket", "Infra bucket" — same `DepleteDial`, same CSS, different data.

Both are composed in `packages/pyre/demo/versions/BeautifuiDemo.tsx`.

## Install

```
npx shadcn add https://www.beautifui.dev/r/deplete-dial.json
```

pulls `deplete-dial.tsx`, `deplete-dial.css`, and `pyre-core.ts` — nothing
else.
