import { TaskItem, ReminderOffset, RepeatOption } from '../types';

export const REMINDER_OFFSET_LABELS: Record<ReminderOffset, string> = {
  at_time: 'At time of task',
  '5_min': '5 min before',
  '15_min': '15 min before',
  '30_min': '30 min before',
  '1_hour': '1 hour before',
  '1_day': '1 day before',
};

export const REPEAT_OPTION_LABELS: Record<RepeatOption, string> = {
  none: 'Does not repeat',
  daily: 'Repeats daily',
  weekly: 'Repeats weekly',
  monthly: 'Repeats monthly',
  custom: 'Custom days',
};

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const GOOGLE_DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/**
 * Format a recurrence label for UI display
 */
export function formatRepeatLabel(repeatOption?: RepeatOption, customDays?: number[]): string {
  if (!repeatOption || repeatOption === 'none') return 'Does not repeat';
  if (repeatOption === 'daily') return 'Repeats daily';
  if (repeatOption === 'weekly') return 'Repeats weekly';
  if (repeatOption === 'monthly') return 'Repeats monthly';
  if (repeatOption === 'custom' && customDays && customDays.length > 0) {
    const dayLabels = customDays.map((d) => DAY_NAMES[d] || '').filter(Boolean);
    return `Repeats every ${dayLabels.join(', ')}`;
  }
  return 'Repeats on custom days';
}

/**
 * Calculates start and end datetime string for Google Calendar URL
 */
function getGoogleCalendarDates(targetDate: string, timeStr?: string): string {
  // targetDate is YYYY-MM-DD
  const [year, month, day] = targetDate.split('-');

  if (timeStr && timeStr.includes(':')) {
    const [hours, minutes] = timeStr.split(':');
    const startHourNum = parseInt(hours, 10);
    const startMinNum = parseInt(minutes, 10);

    const pad = (n: number) => String(n).padStart(2, '0');
    const startStr = `${year}${month}${day}T${pad(startHourNum)}${pad(startMinNum)}00`;

    // End time: 30 minutes after start time
    let endHour = startHourNum;
    let endMin = startMinNum + 30;
    if (endMin >= 60) {
      endHour = (endHour + 1) % 24;
      endMin -= 60;
    }
    const endStr = `${year}${month}${day}T${pad(endHour)}${pad(endMin)}00`;

    return `${startStr}/${endStr}`;
  }

  // All-day event: YYYYMMDD/YYYYMMDD (next day)
  const startDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  const nextDate = new Date(startDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const pad = (n: number) => String(n).padStart(2, '0');
  const startFormat = `${startDate.getFullYear()}${pad(startDate.getMonth() + 1)}${pad(startDate.getDate())}`;
  const endFormat = `${nextDate.getFullYear()}${pad(nextDate.getMonth() + 1)}${pad(nextDate.getDate())}`;

  return `${startFormat}/${endFormat}`;
}

/**
 * Generates an RFC-5545 RRULE string for Google Calendar
 */
function getGoogleCalendarRRule(repeatOption?: RepeatOption, customDays?: number[]): string | null {
  if (!repeatOption || repeatOption === 'none') return null;

  if (repeatOption === 'daily') {
    return 'RRULE:FREQ=DAILY';
  }
  if (repeatOption === 'weekly') {
    return 'RRULE:FREQ=WEEKLY';
  }
  if (repeatOption === 'monthly') {
    return 'RRULE:FREQ=MONTHLY';
  }
  if (repeatOption === 'custom' && customDays && customDays.length > 0) {
    const dayCodes = customDays.map((d) => GOOGLE_DAY_CODES[d]).filter(Boolean);
    if (dayCodes.length > 0) {
      return `RRULE:FREQ=WEEKLY;BYDAY=${dayCodes.join(',')}`;
    }
    return 'RRULE:FREQ=WEEKLY';
  }

  return null;
}

/**
 * Builds the complete Google Calendar web intent link
 */
export function buildGoogleCalendarUrl(task: TaskItem): string {
  const baseUrl = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams();
  params.set('action', 'TEMPLATE');

  // Title
  const titlePrefix = task.pageName ? `[${task.pageName}] ` : '';
  params.set('text', `${titlePrefix}${task.title}`);

  // Dates
  const dates = getGoogleCalendarDates(task.targetDate, task.reminderTime);
  params.set('dates', dates);

  // Recurrence rule
  const rrule = getGoogleCalendarRRule(task.repeatOption, task.customRepeatDays);
  if (rrule) {
    params.set('recur', rrule);
  }

  // Description / Details
  const detailsParts: string[] = [];
  if (task.notes) {
    detailsParts.push(`Notes & Caption:\n${task.notes}`);
  }
  if (task.platform && task.platform !== 'general') {
    detailsParts.push(`Platform: ${task.platform.toUpperCase()}`);
  }
  if (task.reminderTime) {
    const offsetLabel = REMINDER_OFFSET_LABELS[task.reminderOffset || 'at_time'];
    detailsParts.push(`Reminder time: ${task.reminderTime} (${offsetLabel})`);
  }
  if (task.repeatOption && task.repeatOption !== 'none') {
    detailsParts.push(`Recurrence: ${formatRepeatLabel(task.repeatOption, task.customRepeatDays)}`);
  }
  detailsParts.push('\nManaged with PagePilot Creator Planner');

  params.set('details', detailsParts.join('\n\n'));

  return `${baseUrl}?${params.toString()}`;
}
