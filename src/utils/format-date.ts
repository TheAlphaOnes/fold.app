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

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function addDays(date: Date, amount: number): Date {
  const next = startOfDay(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function buildDayRange(center: Date, behind: number, ahead: number): Date[] {
  const origin = startOfDay(center);
  const days: Date[] = [];
  for (let i = -behind; i <= ahead; i++) {
    days.push(addDays(origin, i));
  }
  return days;
}

/** Days from `anchor - behind` through today. Never includes the future. */
export function buildDaysThroughToday(anchor: Date, behind: number): Date[] {
  const today = startOfDay(new Date());
  const origin = startOfDay(anchor);
  const clamped = origin.getTime() > today.getTime() ? today : origin;
  const start = addDays(clamped, -behind);
  const days: Date[] = [];
  for (let cursor = start; cursor.getTime() <= today.getTime(); cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }
  return days;
}

export function clampToToday(date: Date): Date {
  const today = startOfDay(new Date());
  const origin = startOfDay(date);
  return origin.getTime() > today.getTime() ? today : origin;
}

export function formatClock(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatMillis(millis: number): string {
  if (!millis || isNaN(millis)) return '00:00';
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
