/// <reference types="vitest/importMeta" />
// MIT License. Copyright (c) Beat contributors.
//
// pyre-core.ts — the shared arithmetic behind Beat, a decimal clock and day
// planner. This is not a progress tracker: it's a replacement for reading
// the time. Instead of "2:14pm", you see how many beats are left today.
//
// The idea: every day is exactly 100 beats, and everything nests by a
// hundredfold from there:
//
//   mote (86.4ms) -> grain (8.64s) -> beat (14m 24s) -> day -> span (100 days) -> year
//
// mote, grain, beat and span are clean hundredfold steps of each other
// (100 motes per grain, 100 grains per beat, 100 beats per day, 100 days
// per span). `day` is fixed to a real calendar day (86,400s nominally) on
// purpose — the headline promise ("100 beats left today") has to be exact,
// so the day is the anchor the whole ladder is built from, not the year.
// That pushes the one necessary irregularity to the far end: a year holds
// ~3.65 spans, never a clean 100, so the year's last span is a partial
// "seam" span (65 or 66 days) rather than a full 100.
//
// Every unit counts DOWN: `remaining` runs from `capacity` to 1 and then
// rolls back to `capacity` as the parent unit ticks over. `fraction` is
// how much of the *current* tick is left, in [0, 1], for driving a ring
// or bar.
//
// DST and leap years are handled deliberately, not incidentally:
//  - sub-day units (mote/grain/beat) are derived by dividing *today's
//    actual local wall-clock duration* into 100/100/100, so a 23-hour
//    DST-spring-forward day still ends exactly at the next local
//    midnight, and so does a 25-hour DST-fall-back day. Nothing about
//    mote/grain/beat assumes a day is 86,400,000ms.
//  - day-counting (for span/year) is done by diffing local calendar
//    dates, not raw millisecond timestamps, so the one-hour DST shift
//    twice a year never perturbs which day-of-year we think we're on.
//  - leap years are detected explicitly and feed both `year`'s capacity
//    (365 vs 366) and the length of the year's seam span (65 vs 66).

export type PyreUnit = 'mote' | 'grain' | 'beat' | 'day' | 'span' | 'year';

/** Default ring order, innermost (fastest) to outermost (slowest). */
export const PYRE_RING_UNITS: readonly PyreUnit[] = [
  'mote',
  'grain',
  'beat',
  'day',
  'span',
] as const;

/** All units, including `year`, which is context rather than a default ring. */
export const PYRE_UNITS: readonly PyreUnit[] = [
  'mote',
  'grain',
  'beat',
  'day',
  'span',
  'year',
] as const;

/** Nominal (undistorted) duration of one unit, for display purposes only. */
export const PYRE_NOMINAL_MS: Record<PyreUnit, number> = {
  mote: 86.4,
  grain: 8_640,
  beat: 864_000,
  day: 86_400_000,
  span: 8_640_000_000,
  year: 315_576_000_000, // 365.25 days, purely illustrative
};

export interface PyreUnitReading {
  unit: PyreUnit;
  /** How many of this unit fit in the current instance of its parent. */
  capacity: number;
  /** Counts down from `capacity` to 1, then rolls back to `capacity`. */
  remaining: number;
  /** Fraction of the current tick left before rollover, in [0, 1]. */
  fraction: number;
}

export interface PyreReading {
  /** Epoch ms this reading was computed for. */
  now: number;
  mote: PyreUnitReading;
  grain: PyreUnitReading;
  beat: PyreUnitReading;
  day: PyreUnitReading;
  span: PyreUnitReading;
  year: PyreUnitReading;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/**
 * A DST-proof calendar-day number: two Dates on the same local calendar day
 * always produce the same number, and consecutive calendar days are always
 * exactly 1 apart, regardless of how many wall-clock hours separated them.
 */
function localDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

/**
 * Splits `positionFraction` (0..1, elapsed fraction of the parent) into a
 * 100-way subdivision: which of the 100 child units we're in (0-indexed),
 * how much of *that* child unit remains, and the elapsed fraction to feed
 * to the next unit down.
 */
function stepDown100(positionFraction: number): {
  index: number;
  remaining: number;
  fraction: number;
  childPositionFraction: number;
} {
  const clamped = Math.min(1, Math.max(0, positionFraction));
  const scaled = clamped * 100;
  const index = Math.min(99, Math.floor(scaled));
  const childPositionFraction = scaled - index;
  return {
    index,
    remaining: 100 - index,
    fraction: 1 - childPositionFraction,
    childPositionFraction,
  };
}

/** How many days fit in the span starting at `spanIndex` (0-based) of `year`. */
function spanCapacityDays(year: number, spanIndex: number): number {
  return spanIndex < 3 ? 100 : daysInYear(year) - 300;
}

export function readPyre(date: Date = new Date()): PyreReading {
  const now = date.getTime();

  const startOfToday = startOfLocalDay(date);
  const startOfTomorrow = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  // Varies with DST: 23h, 24h, or 25h worth of milliseconds.
  const todayDurationMs = startOfTomorrow.getTime() - startOfToday.getTime();
  const elapsedTodayMs = now - startOfToday.getTime();
  const dayElapsedFraction = todayDurationMs > 0 ? elapsedTodayMs / todayDurationMs : 0;

  const beatStep = stepDown100(dayElapsedFraction);
  const grainStep = stepDown100(beatStep.childPositionFraction);
  const moteStep = stepDown100(grainStep.childPositionFraction);

  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
  const dayOfYear = localDayNumber(date) - localDayNumber(startOfYear); // 0-indexed
  const totalDaysInYear = daysInYear(year);

  const spanIndex = Math.min(3, Math.floor(dayOfYear / 100));
  const spanCapacity = spanCapacityDays(year, spanIndex);
  const dayWithinSpanIndex = dayOfYear - spanIndex * 100;
  const dayFractionRemaining = 1 - dayElapsedFraction;

  const spansInYear = 4; // three clean 100-day spans, plus the seam
  const spanFraction =
    1 - (dayWithinSpanIndex + dayElapsedFraction) / spanCapacity;

  const yearFraction = 1 - (dayOfYear + dayElapsedFraction) / totalDaysInYear;

  return {
    now,
    mote: {
      unit: 'mote',
      capacity: 100,
      remaining: moteStep.remaining,
      fraction: moteStep.fraction,
    },
    grain: {
      unit: 'grain',
      capacity: 100,
      remaining: grainStep.remaining,
      fraction: grainStep.fraction,
    },
    beat: {
      unit: 'beat',
      capacity: 100,
      remaining: beatStep.remaining,
      fraction: beatStep.fraction,
    },
    day: {
      unit: 'day',
      capacity: spanCapacity,
      remaining: spanCapacity - dayWithinSpanIndex,
      fraction: dayFractionRemaining,
    },
    span: {
      unit: 'span',
      capacity: spansInYear,
      remaining: spansInYear - spanIndex,
      fraction: Math.min(1, Math.max(0, spanFraction)),
    },
    year: {
      unit: 'year',
      capacity: 1,
      remaining: 1,
      fraction: Math.min(1, Math.max(0, yearFraction)),
    },
  };
}

// ---------------------------------------------------------------------------
// usePyre — the SSR-safe, visibility-aware React hook.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';

export interface UsePyreOptions {
  /**
   * 'raf' updates every animation frame (for the two innermost rings).
   * 'second' updates once a second (everything else). Default 'second'.
   */
  rate?: 'raf' | 'second';
}

/**
 * Returns the current PyreReading, or `null` on the server and on the very
 * first client render, so every consumer can render an identical static
 * skeleton before and immediately after hydration.
 */
export function usePyre(options: UsePyreOptions = {}): PyreReading | null {
  const { rate = 'second' } = options;
  const [reading, setReading] = useState<PyreReading | null>(null);

  useEffect(() => {
    let rafId: number | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const tick = () => setReading(readPyre());

    const start = () => {
      tick();
      if (rate === 'raf') {
        const loop = () => {
          tick();
          rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
      } else {
        intervalId = setInterval(tick, 1000);
      }
    };

    const stop = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (intervalId !== null) clearInterval(intervalId);
      rafId = null;
      intervalId = null;
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    if (typeof document !== 'undefined' && !document.hidden) {
      start();
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [rate]);

  return reading;
}

// ---------------------------------------------------------------------------
// Acceptance tests — the contract the app is checked against.
// Run with `npm test` (Vitest in-source testing; stripped from prod builds).
// ---------------------------------------------------------------------------

if (import.meta.vitest) {
  const { describe, it, expect, beforeAll, afterAll } = import.meta.vitest;

  describe('readPyre', () => {
    let originalTZ: string | undefined;

    beforeAll(() => {
      originalTZ = process.env.TZ;
      process.env.TZ = 'America/New_York';
    });

    afterAll(() => {
      process.env.TZ = originalTZ;
    });

    it('reports capacity 100 for mote, grain and beat', () => {
      const r = readPyre(new Date(2026, 5, 15, 12, 0, 0, 0));
      expect(r.mote.capacity).toBe(100);
      expect(r.grain.capacity).toBe(100);
      expect(r.beat.capacity).toBe(100);
    });

    it('counts down, never up: remaining falls as the day progresses', () => {
      const early = readPyre(new Date(2026, 5, 15, 0, 5, 0, 0));
      const later = readPyre(new Date(2026, 5, 15, 0, 10, 0, 0));
      expect(later.beat.remaining).toBeLessThanOrEqual(early.beat.remaining);
      expect(early.beat.remaining).toBeLessThanOrEqual(100);
      expect(later.beat.remaining).toBeGreaterThanOrEqual(1);
    });

    it('beat.remaining is 100 at the first instant of the day and falls to 1 by the end', () => {
      const start = readPyre(new Date(2026, 5, 15, 0, 0, 0, 0));
      expect(start.beat.remaining).toBe(100);

      const end = readPyre(new Date(2026, 5, 15, 23, 59, 59, 999));
      expect(end.beat.remaining).toBe(1);
    });

    it('100 beats exactly tile an ordinary 24-hour day', () => {
      // Well away from any DST transition.
      const noon = readPyre(new Date(2026, 5, 15, 12, 0, 0, 0));
      // Halfway through the day => roughly the 50th beat (0-indexed 50).
      expect(noon.beat.remaining).toBe(50);
    });

    it('a mote is nested inside a grain inside a beat: fractions compose', () => {
      const r = readPyre(new Date(2026, 5, 15, 6, 0, 0, 0));
      expect(r.mote.fraction).toBeGreaterThanOrEqual(0);
      expect(r.mote.fraction).toBeLessThanOrEqual(1);
      expect(r.grain.fraction).toBeGreaterThanOrEqual(0);
      expect(r.grain.fraction).toBeLessThanOrEqual(1);
    });

    it('day.remaining decrements by exactly one at local midnight', () => {
      const day1 = readPyre(new Date(2026, 0, 1, 23, 59, 59, 999));
      const day2 = readPyre(new Date(2026, 0, 2, 0, 0, 0, 1));
      expect(day1.day.remaining - day2.day.remaining).toBe(1);
    });

    it('DST spring-forward day (2026-03-08, US Eastern) is 23 hours: beats run short that day', () => {
      // 2:00am -> 3:00am is skipped, so 1:30am local time does not exist,
      // but readPyre must still divide the *actual* elapsed local day into
      // exactly 100 beats.
      const justBeforeMidnight = readPyre(new Date(2026, 2, 8, 23, 59, 59, 999));
      expect(justBeforeMidnight.beat.remaining).toBe(1);

      const start = readPyre(new Date(2026, 2, 8, 0, 0, 0, 0));
      const end = readPyre(new Date(2026, 2, 9, 0, 0, 0, 0));
      expect(start.day.remaining - end.day.remaining).toBe(1);
    });

    it('DST fall-back day (2026-11-01, US Eastern) is 25 hours: beats run long that day', () => {
      const justBeforeMidnight = readPyre(new Date(2026, 10, 1, 23, 59, 59, 999));
      expect(justBeforeMidnight.beat.remaining).toBe(1);

      const start = readPyre(new Date(2026, 10, 1, 0, 0, 0, 0));
      const end = readPyre(new Date(2026, 10, 2, 0, 0, 0, 0));
      expect(start.day.remaining - end.day.remaining).toBe(1);
    });

    it('a leap year (2024) is 366 days and its seam span is 66 days', () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(daysInYear(2024)).toBe(366);

      const dec31 = readPyre(new Date(2024, 11, 31, 12, 0, 0, 0));
      // day 300..365 (0-indexed) => the 4th (seam) span, 66 days long.
      expect(dec31.day.capacity).toBe(66);
    });

    it('a non-leap year (2025) is 365 days and its seam span is 65 days', () => {
      expect(isLeapYear(2025)).toBe(false);
      expect(daysInYear(2025)).toBe(365);

      const dec31 = readPyre(new Date(2025, 11, 31, 12, 0, 0, 0));
      expect(dec31.day.capacity).toBe(65);
    });

    it('span capacity is a clean 100 for the first three spans of the year', () => {
      const jan1 = readPyre(new Date(2026, 0, 1, 12, 0, 0, 0));
      expect(jan1.day.capacity).toBe(100);

      const day150 = readPyre(new Date(2026, 4, 30, 12, 0, 0, 0)); // ~day 149
      expect(day150.day.capacity).toBe(100);
    });

    it('span.remaining decrements by one every 100 days and never exceeds 4', () => {
      const jan1 = readPyre(new Date(2026, 0, 1, 12, 0, 0, 0));
      expect(jan1.span.remaining).toBe(4);

      const day101 = readPyre(new Date(2026, 3, 12, 12, 0, 0, 0)); // day index 101
      expect(day101.span.remaining).toBe(3);
    });

    it("year.fraction falls toward 0 across the year and resets near Jan 1", () => {
      const jan1 = readPyre(new Date(2026, 0, 1, 0, 0, 1, 0));
      const dec31 = readPyre(new Date(2026, 11, 31, 23, 59, 0, 0));
      expect(dec31.year.fraction).toBeLessThan(jan1.year.fraction);
      expect(dec31.year.fraction).toBeGreaterThanOrEqual(0);
      expect(jan1.year.fraction).toBeLessThanOrEqual(1);
    });

    it('never reports an out-of-range remaining or fraction', () => {
      const samples = [
        new Date(2026, 0, 1, 0, 0, 0, 0),
        new Date(2026, 5, 15, 12, 34, 56, 789),
        new Date(2026, 11, 31, 23, 59, 59, 999),
        new Date(2024, 1, 29, 12, 0, 0, 0), // leap day
      ];
      for (const date of samples) {
        const r = readPyre(date);
        for (const unit of PYRE_UNITS) {
          const u = r[unit];
          expect(u.remaining).toBeGreaterThanOrEqual(1);
          expect(u.remaining).toBeLessThanOrEqual(u.capacity);
          expect(u.fraction).toBeGreaterThanOrEqual(0);
          expect(u.fraction).toBeLessThanOrEqual(1);
        }
      }
    });
  });
}
