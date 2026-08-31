# Version 4 — rareui.com idiom

`ember-dial`: the WebGL showpiece. Tailwind + `motion/react` + a raw WebGL
fragment shader (`ember-shader.ts`) — one draw call, no Three.js.

- The five rings are drawn as signed-distance arcs directly in the fragment
  shader (`arcDist`), with a compass-bearing angle convention (0 at 12
  o'clock, clockwise) shared between the shader and `ember-dial.tsx`'s own
  particle-position math.
- Each ring's burn head is a hot point with bloom (`headCore` + `headBloom`
  terms). The unburnt arc glows and fades ahead of it.
- Warm palette throughout — `emberColor()` interpolates dim deep ember at
  the rim up to near-white at the centre / hot heads. No blue anywhere.
- Ember particles are simulated in JS (`ember-dial.tsx`), thrown off
  tangentially from the mote and grain heads (the two fast inner rings),
  and uploaded as a `vec4[]` uniform each frame — one draw call, no
  instancing needed. The array is sized at shader-compile time from the
  GPU's actual `MAX_FRAGMENT_UNIFORM_VECTORS`, clamped to the hard cap of
  300, so it never exceeds a real driver's limit.
- **Escape hatch**: `createEmberRenderer` returns `null` (never throws) on
  any WebGL failure — missing context, disabled WebGL, a compile/link
  error — and a `webglcontextlost` listener triggers the same fallback
  mid-session. Either way `ember-dial.tsx` renders Version 1's
  `GlassClockDial` instead. Exercised directly in
  `ember-shader.ts`'s in-source tests (`npm test`), not just asserted in a
  comment.
- 60fps is enforced explicitly (a `dt < 16.6ms` guard in the render loop),
  independent of the display's actual refresh rate.

The shader itself (the GLSL string in `buildFragmentShaderSrc`) is under
80 lines; a test asserts it stays under the 200-line budget from the
brief. `showFps` is off by default on the component — the demo turns it on
so reviewers can see the budget hold.
