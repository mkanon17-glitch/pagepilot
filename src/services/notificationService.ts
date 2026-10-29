import { TaskItem, ReminderOffset } from '../types';

const NOTIFIED_KEY = 'pagepilot_notified_reminders';

/**
 * Request notification permission from browser once
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const perm = await Notification.requestPermission();
    localStorage.setItem('pagepilot_notification_prompted', 'true');
    return perm === 'granted';
  } catch {
    return false;
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Converts reminder offset into minutes before task time
 */
export function getOffsetMinutes(offset?: ReminderOffset): number {
  switch (offset) {
    case '5_min':
      return 5;
    case '15_min':
      return 15;
    case '30_min':
      return 30;
    case '1_hour':
      return 60;
    case '1_day':
      return 1440;
    case 'at_time':
    default:
      return 0;
  }
}

/**
 * Web Audio API gentle reminder chime
 */
export function playReminderChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.35); // D6

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.15);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.6);
  } catch {
    // Audio context may require user gesture on some browsers
  }
}

/**
 * Check if a task is scheduled for or repeats on a given date string (YYYY-MM-DD)
 */
export function isTaskOnDate(task: TaskItem, dateStr: string): boolean {
  if (task.targetDate === dateStr) return true;
  if (!task.repeatOption || task.repeatOption === 'none') return false;

  const [tY, tM, tD] = task.targetDate.split('-').map(Number);
  const [qY, qM, qD] = dateStr.split('-').map(Number);

  const taskDate = new Date(tY, tM - 1, tD);
  const queryDate = new Date(qY, qM - 1, qD);

  // If query date is before initial task date, recurrence hasn't started
  if (queryDate < taskDate) return false;

  if (task.repeatOption === 'daily') return true;

  if (task.repeatOption === 'weekly') {
    return taskDate.getDay() === queryDate.getDay();
  }

  if (task.repeatOption === 'monthly') {
    return taskDate.getDate() === queryDate.getDate();
  }

  if (task.repeatOption === 'custom' && task.customRepeatDays && task.customRepeatDays.length > 0) {
    return task.customRepeatDays.includes(queryDate.getDay());
  }

  return false;
}

/**
 * Inspect tasks and trigger reminders that are due right now
 */
export function checkDueReminders(
  tasks: TaskItem[],
  onReminderTriggered?: (task: TaskItem) => void
): TaskItem[] {
  const now = new Date();
  const currentYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Get list of already notified reminder keys for today
  let notified: string[] = [];
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    notified = raw ? JSON.parse(raw) : [];
  } catch {
    notified = [];
  }

  const triggered: TaskItem[] = [];

  for (const task of tasks) {
    if (task.completed || !task.reminderTime) continue;

    // Check if task applies to today
    if (!isTaskOnDate(task, currentYMD)) continue;

    const [hours, minutes] = task.reminderTime.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) continue;

    // Calculate exact target time for today
    const taskDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

    // Subtract reminder offset
    const offsetMin = getOffsetMinutes(task.reminderOffset);
    const reminderDateTime = new Date(taskDateTime.getTime() - offsetMin * 60 * 1000);

    // Calculate difference in milliseconds
    const diffMs = now.getTime() - reminderDateTime.getTime();

    // Trigger if within a 90 second window [0, 90s]
    const isDue = diffMs >= 0 && diffMs <= 90000;
    const reminderKey = `${task.id}_${currentYMD}_${task.reminderTime}_${task.reminderOffset || 'at_time'}`;

    if (isDue && !notified.includes(reminderKey)) {
      notified.push(reminderKey);
      triggered.push(task);

      // Play audio chime
      playReminderChime();

      // Show native browser notification if granted
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          const body = task.notes
            ? `${task.notes.slice(0, 100)}${task.notes.length > 100 ? '...' : ''}`
            : task.pageName
            ? `Post reminder for ${task.pageName}`
            : 'Your scheduled social media task is due now.';

          new Notification(`Reminder: ${task.title}`, {
            body,
            icon: '/favicon.ico',
            tag: reminderKey,
          });
        } catch (e) {
          console.warn('Native notification failed:', e);
        }
      }

      if (onReminderTriggered) {
        onReminderTriggered(task);
      }
    }
  }

  if (triggered.length > 0) {
    try {
      // Keep notified list bounded
      const trimmed = notified.slice(-200);
      localStorage.setItem(NOTIFIED_KEY, JSON.stringify(trimmed));
    } catch {
      // Ignore storage errors
    }
  }

  return triggered;
}
