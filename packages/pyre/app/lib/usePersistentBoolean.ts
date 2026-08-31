import * as React from 'react';

/**
 * A boolean that persists to localStorage, read lazily on mount so the
 * first client render still matches the SSR-safe default before hydration
 * settles. Falls back to the in-memory default if storage is unavailable
 * (quota, private mode).
 */
export function usePersistentBoolean(key: string, defaultValue: boolean): [boolean, (next: boolean) => void] {
  const [value, setValue] = React.useState(defaultValue);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(raw === '1');
    } catch {
      // ignore — keep the default
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = React.useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        localStorage.setItem(key, next ? '1' : '0');
      } catch {
        // ignore — the toggle still works for this session
      }
    },
    [key],
  );

  return [value, update];
}
