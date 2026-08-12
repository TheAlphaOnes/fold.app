export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return 'JUST NOW';
  }

  if (diff < hour) {
    const minutes = Math.floor(diff / minute);
    return `${minutes}M AGO`;
  }

  if (diff < day) {
    const hours = Math.floor(diff / hour);
    return `${hours}H AGO`;
  }

  if (diff < 2 * day) {
    return 'YESTERDAY';
  }

  const date = new Date(timestamp);
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  return formatter.format(date).toUpperCase();
}
