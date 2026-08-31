import * as React from 'react';
import { GlassClock, GlassClockDial, GlassClockLegend } from '../src/glass-clock';
import { usePyre } from '../src/pyre-core';
import { BeautifuiDemo } from './versions/BeautifuiDemo';
import { BeuiDemo } from './versions/BeuiDemo';
import { RareuiDemo } from './versions/RareuiDemo';
import { TransitionsDevDemo } from './versions/TransitionsDevDemo';

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

function Version1Demo() {
  // Demonstrates composing GlassClockDial + GlassClockLegend directly,
  // the way a consumer who only wants the dial primitive would.
  const reading = usePyre({ rate: 'second' });

  return (
    <div className="demo-shell" style={{ padding: 0, gap: '1.5rem' }}>
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

const VERSIONS = [
  { id: 'v1', label: 'V1 · shadcn', render: () => <Version1Demo /> },
  { id: 'v2', label: 'V2 · beautifui', render: () => <BeautifuiDemo /> },
  { id: 'v3', label: 'V3 · beui', render: () => <BeuiDemo /> },
  { id: 'v4', label: 'V4 · rareui', render: () => <RareuiDemo /> },
  { id: 'v5', label: 'V5 · transitions.dev', render: () => <TransitionsDevDemo /> },
] as const;

export default function App() {
  const [active, setActive] = React.useState<(typeof VERSIONS)[number]['id']>('v1');
  const current = VERSIONS.find((v) => v.id === active) ?? VERSIONS[0];

  return (
    <div className="demo-shell">
      <nav style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {VERSIONS.map((v) => (
          <button
            key={v.id}
            className="demo-toggle"
            aria-pressed={active === v.id}
            style={active === v.id ? { borderColor: 'hsl(var(--foreground))' } : undefined}
            onClick={() => setActive(v.id)}
          >
            {v.label}
          </button>
        ))}
      </nav>
      {current.render()}
    </div>
  );
}
