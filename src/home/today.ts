/** Today's page: a soft line for the time of day, in the app's lowercase voice. Pure, so it's tested. */
export function dayLine(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'the quiet hours';
  if (h < 11) return 'first light';
  if (h < 16) return 'the middle of it';
  if (h < 20) return 'golden hour, almost';
  return 'before it ends';
}
