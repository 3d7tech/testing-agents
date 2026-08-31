export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** The conventional clock time, deliberately demoted to a small corner reference. */
export function formatClockTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${pad2(minutes)} ${suffix}`;
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

/** Approximate clock time at the *start* of a given beat (0-99), assuming
 * an ordinary 24-hour day — for row labels and prompts, not the live clock. */
export function beatToClockTime(beatIndex: number): string {
  const totalMinutes = beatIndex * 14.4;
  let hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${pad2(minutes)} ${suffix}`;
}
