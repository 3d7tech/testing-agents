# Version 5 — transitions.dev idiom

Not a clock — three transition recipes extracted from it, in the shape
that site's own snippets ship in: `:root` custom properties, `t-*` classes,
a `prefers-reduced-motion` guard, self-contained CSS with no demo-specific
sizing, and a React + TypeScript variant alongside each `.css` file.

- **`t-deplete`** — an arc (or bar) that drains rather than fills, via an
  `@property`-registered angle/percentage animating a conic/linear
  gradient. Drive it with a `[data-deplete-active]` class toggle for a
  one-shot animation, or set `--t-deplete-angle` / `--t-deplete-percent`
  directly and repeatedly from a live value — the registered property makes
  every change animate automatically, CSS-only.
- **`t-rollover`** — a counter digit that rolls when it resets, staggered
  per slot from the right. No JS beyond changing `--t-rollover-value`
  (0..10) per slot.
- **`t-relight`** — the burst on a boundary crossing: a radial bloom plus a
  scale nudge, keyed off toggling `.is-relit`. Generic case: "a threshold
  was crossed" (streaks, quota resets, rate-limit refreshes).

## Using a snippet outside this repo

Each `.css` file pastes into any project unmodified. Apply its class to any
element and set the custom properties — nothing here assumes glass-clock
sizing or colours. The `.tsx` files are optional React ergonomics over the
same CSS; a plain HTML/CSS/vanilla-JS consumer only needs the `.css`.

## Demo

`packages/pyre/demo/versions/TransitionsDevDemo.tsx` composes all three
against `pyre-core.ts`'s `usePyre`: `t-deplete` tracks the current glass's
fraction, `t-rollover` displays glasses-remaining, and `t-relight` fires on
every glass rollover.
