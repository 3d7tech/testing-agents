// MIT License. Copyright (c) Pyre contributors.
//
// React + TypeScript variant of t-deplete.css. No demo-specific sizing —
// size, colour and shape all come from the host's own CSS on `className`.

import * as React from 'react';
import './t-deplete.css';

export interface TDepleteProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Fraction remaining, 0..1. Drives --t-deplete-angle directly. */
  fraction: number;
  /** 'arc' (default) or 'bar'. */
  variant?: 'arc' | 'bar';
}

export const TDeplete = React.forwardRef<HTMLDivElement, TDepleteProps>(function TDeplete(
  { fraction, variant = 'arc', className, style, ...rest },
  ref,
) {
  const clamped = Math.min(1, Math.max(0, fraction));
  const cssVar =
    variant === 'bar'
      ? { ['--t-deplete-percent' as string]: `${clamped * 100}%` }
      : { ['--t-deplete-angle' as string]: `${clamped * 360}deg` };

  return (
    <div
      ref={ref}
      className={[variant === 'bar' ? 't-deplete--bar' : 't-deplete', className]
        .filter(Boolean)
        .join(' ')}
      style={{ ...cssVar, ...style }}
      {...rest}
    />
  );
});
