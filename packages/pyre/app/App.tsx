import * as React from 'react';
import { NowView } from './views/NowView';
import { DayView } from './views/DayView';
import { YearView } from './views/YearView';
import { BlockPromptOverlay } from './components/BlockPromptOverlay';
import { useBlockPrompts } from './hooks/useBlockPrompts';
import { notificationPermission, requestNotificationPermission } from './lib/notifications';
import { usePersistentBoolean } from './lib/usePersistentBoolean';

type Tab = 'now' | 'day' | 'year';

const TABS: { id: Tab; label: string }[] = [
  { id: 'now', label: 'Now' },
  { id: 'day', label: 'Day' },
  { id: 'year', label: 'Year' },
];

function ThemeToggle() {
  const [dark, setDark] = React.useState(true);
  React.useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);
  return (
    <button
      type="button"
      onClick={() => setDark((d) => !d)}
      aria-label="Toggle theme"
      className="rounded-full px-3 py-1.5 text-xs"
      style={{ border: '1px solid var(--line)', color: 'var(--fg-muted)' }}
    >
      {dark ? 'Dark' : 'Light'}
    </button>
  );
}

function NotificationsToggle() {
  const [permission, setPermission] = React.useState<NotificationPermission | null>(null);

  React.useEffect(() => {
    setPermission(notificationPermission());
  }, []);

  if (permission !== 'default') return null;

  return (
    <button
      type="button"
      onClick={async () => {
        const result = await requestNotificationPermission();
        setPermission(result);
      }}
      className="rounded-full px-3 py-1.5 text-xs"
      style={{ border: '1px solid var(--accent-dim)', color: 'var(--accent)' }}
    >
      Enable alerts
    </button>
  );
}

function RealDateToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={show}
      className="rounded-full px-3 py-1.5 text-xs"
      style={{ border: '1px solid var(--line)', color: 'var(--fg-muted)' }}
    >
      {show ? 'Hide date' : 'Show date'}
    </button>
  );
}

export default function App() {
  const [tab, setTab] = React.useState<Tab>('now');
  const { prompt, respond } = useBlockPrompts();
  const [showRealDate, setShowRealDate] = usePersistentBoolean('beat:show-real-date', true);

  return (
    <div className="flex min-h-full flex-col">
      <nav className="flex items-center justify-between px-6 py-5">
        <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>
          Beat
        </span>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 rounded-full p-1" style={{ background: 'var(--bg-raised)', border: '1px solid var(--line)' }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: tab === t.id ? 'var(--accent)' : 'transparent',
                  color: tab === t.id ? 'var(--bg)' : 'var(--fg-muted)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <RealDateToggle show={showRealDate} onToggle={() => setShowRealDate(!showRealDate)} />
          <NotificationsToggle />
          <ThemeToggle />
        </div>
      </nav>
      <main className="flex-1">
        {tab === 'now' && <NowView showRealDate={showRealDate} />}
        {tab === 'day' && <DayView />}
        {tab === 'year' && <YearView />}
      </main>
      {prompt && <BlockPromptOverlay prompt={prompt} onRespond={respond} />}
    </div>
  );
}
