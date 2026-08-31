export function notificationsSupported(): boolean {
  return typeof Notification !== 'undefined';
}

export function notificationPermission(): NotificationPermission {
  return notificationsSupported() ? Notification.permission : 'denied';
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/**
 * Fires a system notification, but only when the tab isn't focused — the
 * in-app overlay already covers the focused case, so a duplicate system
 * notification there would just be noise.
 */
export async function notify(title: string, body?: string): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  if (typeof document !== 'undefined' && document.visibilityState === 'visible' && document.hasFocus()) {
    return;
  }
  const options: NotificationOptions = { body, icon: 'icon-192.png', tag: 'beat-block-prompt' };
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
      return;
    }
  } catch {
    // Fall through to the plain constructor below.
  }
  try {
    new Notification(title, options);
  } catch {
    // Some browsers (mobile Chrome in particular) require the
    // service-worker path above and throw here. The in-app prompt still
    // covers it whenever the tab is actually open.
  }
}
