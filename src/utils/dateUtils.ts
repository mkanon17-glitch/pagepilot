import { WeekStartDay } from '../types';

/**
 * Get current date formatted as YYYY-MM-DD in the given timezone (or auto-detected system timezone)
 */
export function getTodayDateString(timezone?: string): string {
  try {
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // Returns YYYY-MM-DD in en-CA format
  } catch (err) {
    console.warn('Fallback timezone calculation', err);
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
  }
}

/**
 * Format date string (YYYY-MM-DD) to friendly format like "Tue, Oct 27" or "October 27, 2026"
 */
export function formatFriendlyDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', options || {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Friendly relative label: Today, Tomorrow, Yesterday, or formatted date
 */
export function getRelativeDateLabel(dateStr: string, timezone?: string): string {
  const today = getTodayDateString(timezone);
  if (dateStr === today) return 'Today';

  const [y1, m1, d1] = today.split('-').map(Number);
  const [y2, m2, d2] = dateStr.split('-').map(Number);
  const todayDate = new Date(y1, m1 - 1, d1);
  const targetDate = new Date(y2, m2 - 1, d2);
  const diffDays = Math.round((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 6) return `In ${diffDays} days`;
  return formatFriendlyDate(dateStr, { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Generate calendar grid cells for a given month and year, respecting week start day
 */
export interface MonthGridCell {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
}

export function generateMonthGrid(
  year: number,
  month: number, // 0-indexed (0 = Jan, 11 = Dec)
  weekStartDay: WeekStartDay = 0,
  timezone?: string
): MonthGridCell[] {
  const todayStr = getTodayDateString(timezone);
  
  // First day of target month
  const firstOfMonth = new Date(year, month, 1);
  const firstDayOfWeek = firstOfMonth.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

  // Calculate leading offset
  let offset = (firstDayOfWeek - weekStartDay + 7) % 7;

  // Number of days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: MonthGridCell[] = [];

  // Previous month trailing days
  for (let i = offset - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, day);
    const dateStr = formatDateToYMD(prevMonthDate);
    cells.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const currentMonthDate = new Date(year, month, day);
    const dateStr = formatDateToYMD(currentMonthDate);
    cells.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
    });
  }

  // Next month leading days to complete full 7-column rows (35 or 42 cells)
  const totalCellsNeeded = cells.length > 35 ? 42 : 35;
  const trailingDays = totalCellsNeeded - cells.length;
  for (let day = 1; day <= trailingDays; day++) {
    const nextMonthDate = new Date(year, month + 1, day);
    const dateStr = formatDateToYMD(nextMonthDate);
    cells.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
    });
  }

  return cells;
}

function formatDateToYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get weekday column headers based on weekStartDay
 */
export function getWeekdayHeaders(weekStartDay: WeekStartDay = 0): { key: number; label: string; short: string }[] {
  const days = [
    { key: 0, label: 'Sunday', short: 'Sun' },
    { key: 1, label: 'Monday', short: 'Mon' },
    { key: 2, label: 'Tuesday', short: 'Tue' },
    { key: 3, label: 'Wednesday', short: 'Wed' },
    { key: 4, label: 'Thursday', short: 'Thu' },
    { key: 5, label: 'Friday', short: 'Fri' },
    { key: 6, label: 'Saturday', short: 'Sat' },
  ];

  if (weekStartDay === 0) return days;
  if (weekStartDay === 1) return [...days.slice(1), days[0]];
  // weekStartDay === 6 (Saturday)
  return [days[6], ...days.slice(0, 6)];
}

/**
 * Add or subtract days from a YYYY-MM-DD string
 */
export function offsetDate(dateStr: string, offsetDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + offsetDays);
  return formatDateToYMD(date);
}

/**
 * Return an array of YYYY-MM-DD date strings from startDate to endDate (inclusive)
 */
export function getDateRangeArray(startDateStr: string, endDateStr: string): string[] {
  const result: string[] = [];
  const [y1, m1, d1] = startDateStr.split('-').map(Number);
  const [y2, m2, d2] = endDateStr.split('-').map(Number);
  const current = new Date(y1, m1 - 1, d1);
  const end = new Date(y2, m2 - 1, d2);

  while (current <= end) {
    result.push(formatDateToYMD(current));
    current.setDate(current.getDate() + 1);
  }
  return result;
}
