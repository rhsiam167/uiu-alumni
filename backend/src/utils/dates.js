/**
 * Helper utilities for dates evaluated in Asia/Dhaka timezone.
 */

export function getDhakaToday() {
  const now = new Date();
  const options = { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  return formatter.format(now); // YYYY-MM-DD
}

export function isPastDhaka(dateString) {
  const todayStr = getDhakaToday();
  const dStr = typeof dateString === 'string' ? dateString.slice(0, 10) : new Date(dateString).toISOString().slice(0, 10);
  return dStr < todayStr;
}

export function formatDhakaDate(date) {
  if (!date) return null;
  if (typeof date === 'string') return date.slice(0, 10);
  const options = { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  return formatter.format(new Date(date));
}
