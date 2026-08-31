import * as React from 'react';
import { GlassClock, GlassClockDial, GlassClockLegend } from '../src/glass-clock';
import { usePyre } from '../src/pyre-core';

function ThemeToggle() {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);
  return (
    <button className="demo-toggle" onClick={() => setDark((d) => !d)}>
      {dark ? 'Switch to light' : 'Switch to dark'}
    </button>
  );
}

export default function App() {
  // Demonstrates composing GlassClockDial + GlassClockLegend directly,
  // the way a consumer who only wants the dial primitive would.
  const reading = usePyre({ rate: 'second' });

  return (
    <div className="demo-shell">
      <div className="demo-card">
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Glass Clock</h1>
        <GlassClock size={320} legend />
        <ThemeToggle />
      </div>
      <div className="demo-card">
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Composed from the dial + legend directly</h2>
        <GlassClockDial reading={reading} size={200} showNumbers />
        <GlassClockLegend reading={reading} />
      </div>
      <p className="demo-note">
        Every ring counts down. mote (86.4ms) and grain (8.64s) update every
        frame; glass, day, and span update once a second. Colours come only
        from --chart-1..5, --muted and --foreground — toggle the theme above
        to see the host repaint the dial with no component changes.
      </p>
    </div>
  );
}
