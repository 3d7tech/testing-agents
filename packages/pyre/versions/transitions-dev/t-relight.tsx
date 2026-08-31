// MIT License. Copyright (c) Pyre contributors.
//
// React + TypeScript variant of t-relight.css: toggles `.is-relit` for one
// animation duration whenever `trigger` changes identity.

import * as React from 'react';
import './t-relight.css';

export interface TRelightProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Any value; a *change* (by !==) fires the burst. */
  trigger: unknown;
}

export const TRelight = React.forwardRef<HTMLDivElement, TRelightProps>(function TRelight(
  { trigger, className, children, ...rest },
  ref,
) {
  const [relit, setRelit] = React.useState(false);
  const prev = React.useRef(trigger);

  React.useEffect(() => {
    if (prev.current !== trigger) {
      prev.current = trigger;
      setRelit(true);
    }
  }, [trigger]);

  return (
    <div
      ref={ref}
      className={['t-relight', relit ? 'is-relit' : '', className].filter(Boolean).join(' ')}
      onAnimationEnd={() => setRelit(false)}
      {...rest}
    >
      {children}
    </div>
  );
});
