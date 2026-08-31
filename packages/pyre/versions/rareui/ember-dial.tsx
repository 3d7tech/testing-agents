// MIT License. Copyright (c) Pyre contributors.
//
// ember-dial.tsx — the WebGL showpiece. Tailwind for layout, motion/react
// for the centre readout's entrance, a single fragment shader
// (ember-shader.ts) for the rings, the burn heads, and up to 300 additive
// ember particles. Never renders a black box: any WebGL failure — no
// context, a lost context, a compile/link error — falls back permanently
// to Version 1's SVG dial.

import * as React from 'react';
import { motion } from 'motion/react';
import { createEmberRenderer, RING_COUNT } from './ember-shader';
import { GlassClockDial } from '@/components/glass-clock';
import { PYRE_RING_UNITS, usePyre, type PyreReading, type PyreUnit } from '@/lib/pyre-core';

type RingKey = Exclude<PyreUnit, 'year'>;
const RINGS = [...PYRE_RING_UNITS] as RingKey[];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number; // 0..1
  lifeMs: number;
  brightness: number;
}

const MIN_FRAME_MS = 1000 / 60; // hard 60fps cap regardless of display refresh rate
const HARD_PARTICLE_CAP = 300;

export interface EmberDialProps {
  size?: number;
  /** Show a live fps counter in the corner. Default false — the demo turns it on. */
  showFps?: boolean;
  className?: string;
}

export function EmberDial({ size = 320, showFps = false, className }: EmberDialProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [supported, setSupported] = React.useState<boolean | null>(null);
  const [fps, setFps] = React.useState(0);

  // mote/grain drive both the fastest rings and the ember emitters, so this
  // always needs raf — unlike the other variants there is no slow-only path.
  const fast = usePyre({ rate: 'raf' });
  const slow = usePyre({ rate: 'second' });
  const reading = React.useMemo<PyreReading | null>(() => {
    if (!fast || !slow) return null;
    return { ...slow, mote: fast.mote, grain: fast.grain };
  }, [fast, slow]);

  const readingRef = React.useRef(reading);
  readingRef.current = reading;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = createEmberRenderer(canvas);
    if (!renderer) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    renderer.resize(size, size, dpr);

    const particles: Particle[] = [];
    const particleBuffer = new Float32Array(Math.max(1, renderer.maxParticles) * 4);

    let raf = 0;
    let lastFrame = performance.now();
    let lastFpsSample = lastFrame;
    let framesSinceSample = 0;
    let cancelled = false;

    const spawn = (x: number, y: number, heat: number) => {
      if (particles.length >= Math.min(HARD_PARTICLE_CAP, renderer.maxParticles)) return;
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.15,
        vy: 0.25 + Math.random() * 0.25,
        age: 0,
        lifeMs: 700 + Math.random() * 700,
        brightness: 0.5 + heat * 0.5,
      });
    };

    const angleFor = (fraction: number) => (1 - fraction) * Math.PI * 2;
    const headPos = (radius: number, fraction: number) => {
      const a = angleFor(fraction);
      return { x: radius * Math.sin(a), y: radius * Math.cos(a) };
    };

    const loop = (now: number) => {
      if (cancelled) return;
      raf = requestAnimationFrame(loop);
      const dt = now - lastFrame;
      if (dt < MIN_FRAME_MS) return; // hard 60fps cap
      lastFrame = now;

      framesSinceSample += 1;
      if (now - lastFpsSample >= 250) {
        setFps(Math.round((framesSinceSample * 1000) / (now - lastFpsSample)));
        framesSinceSample = 0;
        lastFpsSample = now;
      }

      const r = readingRef.current;
      const ringFraction = new Array(RING_COUNT).fill(1);
      const ringHeadAngle = new Array(RING_COUNT).fill(0);
      const maxRadius = 0.92;
      const step = maxRadius / (RING_COUNT + 1);

      RINGS.forEach((ring, i) => {
        const u = r?.[ring];
        const fraction = u ? u.fraction : 1;
        ringFraction[i] = fraction;
        ringHeadAngle[i] = angleFor(fraction);

        // Ember particles are thrown off tangentially, brightest on the
        // two fast inner rings (mote, grain).
        if (r && (ring === 'mote' || ring === 'grain')) {
          const radius = maxRadius - i * step;
          const pos = headPos(radius, fraction);
          const heat = 1 - i / (RING_COUNT - 1);
          if (Math.random() < dt / (ring === 'mote' ? 60 : 220)) {
            spawn(pos.x, pos.y, heat);
          }
        }
      });

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += dt / p.lifeMs;
        if (p.age >= 1) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * (dt / 1000);
        p.y += p.vy * (dt / 1000);
      }

      const count = Math.min(particles.length, renderer.maxParticles);
      for (let i = 0; i < count; i++) {
        const p = particles[i];
        particleBuffer[i * 4] = p.x;
        particleBuffer[i * 4 + 1] = p.y;
        particleBuffer[i * 4 + 2] = p.age;
        particleBuffer[i * 4 + 3] = p.brightness;
      }

      renderer.draw({
        ringFraction,
        ringHeadAngle,
        particles: particleBuffer,
        particleCount: count,
      });
    };

    raf = requestAnimationFrame(loop);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      cancelled = true;
      cancelAnimationFrame(raf);
      setSupported(false);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  const glassesLeft = reading?.glass.remaining;
  const percentGone = reading ? Math.round((1 - reading.day.fraction) * 100) : null;

  if (supported === false) {
    // Escape hatch: WebGL unavailable or lost — never a black box.
    return <GlassClockDial reading={reading} size={size} className={className} />;
  }

  return (
    <div className={['relative inline-block', className].filter(Boolean).join(' ')} style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={reading ? `${reading.glass.remaining} of ${reading.glass.capacity} glasses left today` : 'Loading countdown'}
        style={{ width: size, height: size, display: 'block', borderRadius: '9999px' }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
      >
        <span
          className="font-semibold tabular-nums text-white"
          style={{ fontSize: size / 6, textShadow: '0 0 24px rgba(255,140,60,0.65)' }}
        >
          {glassesLeft ?? '--'}
        </span>
        {percentGone !== null && (
          <span className="text-xs tabular-nums text-orange-200/80">{percentGone}% of today gone</span>
        )}
      </motion.div>
      {showFps && (
        <div className="absolute top-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] tabular-nums text-orange-200">
          {fps} fps
        </div>
      )}
    </div>
  );
}
