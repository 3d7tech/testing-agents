// MIT License. Copyright (c) Pyre contributors.
//
// React + TypeScript variant of t-rollover.css. No JS beyond changing the
// value — this component's only job is turning a number into per-slot
// --t-rollover-value/--t-rollover-index custom properties and handling the
// "roll forward through the duplicated 0, then snap back" rollover trick.

import * as React from 'react';
import './t-rollover.css';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

function Slot({ digit, index }: { digit: number; index: number }) {
  const [snap, setSnap] = React.useState(false);
  const prevDigit = React.useRef(digit);

  // digit is 0..9 normally; a rollover (9 -> 0) is signalled by the caller
  // passing 10 for one tick (see useRolloverDigits below), then 0 again.
  React.useEffect(() => {
    if (prevDigit.current === 10 && digit === 0) {
      // Snap instantly from the duplicated trailing "0" back to the real
      // one, with no transition, so the next roll has somewhere to go.
      setSnap(true);
      const id = requestAnimationFrame(() => setSnap(false));
      prevDigit.current = digit;
      return () => cancelAnimationFrame(id);
    }
    prevDigit.current = digit;
  }, [digit]);

  return (
    <span className="t-rollover-slot">
      <span
        className="t-rollover-strip"
        data-snap={snap ? '' : undefined}
        style={{
          ['--t-rollover-value' as string]: digit,
          ['--t-rollover-index' as string]: index,
        }}
      >
        {DIGITS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </span>
    </span>
  );
}

/**
 * Turns an integer value into per-slot digits, replacing a digit's value
 * with 10 for exactly one render when that slot just rolled over from 9
 * to 0, so the CSS strip rolls forward instead of spinning back.
 */
function useRolloverDigits(value: number, slotCount: number): number[] {
  const digitsOf = (n: number) =>
    Math.abs(Math.trunc(n))
      .toString()
      .padStart(slotCount, '0')
      .slice(-slotCount)
      .split('')
      .map(Number);

  const prev = React.useRef(digitsOf(value));
  const current = digitsOf(value);

  const withRolloverMarkers = current.map((d, i) => {
    const rolledOver = prev.current[i] === 9 && d === 0;
    return rolledOver ? 10 : d;
  });

  React.useEffect(() => {
    prev.current = current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return withRolloverMarkers;
}

export interface TRolloverProps {
  /** The value to display, e.g. glasses remaining (0..99). */
  value: number;
  /** Number of digit slots. Default: length of the value itself, min 2. */
  slots?: number;
  className?: string;
}

export function TRollover({ value, slots, className }: TRolloverProps) {
  const slotCount = slots ?? Math.max(2, String(Math.abs(Math.trunc(value))).length);
  const digits = useRolloverDigits(value, slotCount);

  return (
    <span className={['t-rollover', className].filter(Boolean).join(' ')}>
      {digits.map((digit, i) => (
        <Slot key={i} digit={digit} index={slotCount - 1 - i} />
      ))}
    </span>
  );
}
