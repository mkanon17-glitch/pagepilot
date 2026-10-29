import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Check,
  Bell,
} from 'lucide-react';
import { WeekStartDay, TaskItem } from '../types';
import {
  generateMonthGrid,
  getWeekdayHeaders,
  getTodayDateString,
  formatFriendlyDate,
} from '../utils/dateUtils';
import { isTaskOnDate } from '../services/notificationService';

interface MonthCalendarProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  tasks: TaskItem[];
  weekStartDay: WeekStartDay;
  timezone: string;
}

export const MonthCalendar: React.FC<MonthCalendarProps> = ({
  selectedDate,
  onSelectDate,
  tasks,
  weekStartDay,
  timezone,
}) => {
  // Use selectedDate to initialize current viewing month & year
  const [initialY, initialM] = selectedDate.split('-').map(Number);
  const [viewYear, setViewYear] = useState<number>(initialY || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(
    initialM !== undefined ? initialM - 1 : new Date().getMonth()
  );

  const todayStr = getTodayDateString(timezone);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    const [y, m] = todayStr.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
    onSelectDate(todayStr);
  };

  const gridCells = generateMonthGrid(viewYear, viewMonth, weekStartDay, timezone);
  const weekdayHeaders = getWeekdayHeaders(weekStartDay);

  const monthTitle = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Calculate task stats for a given date (including recurring tasks and reminders)
  const getDayStats = (dateStr: string) => {
    const dayTasks = tasks.filter((t) => isTaskOnDate(t, dateStr));
    const total = dayTasks.length;
    const completed = dayTasks.filter((t) => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    const reminderTasks = dayTasks.filter((t) => !!t.reminderTime);
    const hasReminders = reminderTasks.length > 0;
    const reminderCount = reminderTasks.length;

    // Status color: green = all done, yellow = partly done
    let status: 'empty' | 'partial' | 'completed' = 'empty';
    if (total > 0) {
      if (completed === total) {
        status = 'completed';
      } else if (completed > 0) {
        status = 'partial';
      }
    }

    return { total, completed, percent, status, hasReminders, reminderCount };
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden transition-colors">
      {/* Month Navigation & Controls */}
      <div className="p-4 sm:p-5 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2.5">
          <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
            {monthTitle}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleJumpToday}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
              selectedDate === todayStr
                ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            Today
          </button>
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Previous Month"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Next Month"
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Column Headers */}
      <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 text-center">
        {weekdayHeaders.map((header) => (
          <div
            key={header.key}
            className="py-2.5 text-[11px] font-bold tracking-wider uppercase text-neutral-500 dark:text-neutral-400"
          >
            <span className="hidden sm:inline">{header.short}</span>
            <span className="sm:hidden">{header.short.slice(0, 2)}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid Days */}
      <div className="grid grid-cols-7 divide-x divide-y divide-neutral-200 dark:divide-neutral-800 border-b border-neutral-200 dark:border-neutral-800">
        {gridCells.map((cell) => {
          const stats = getDayStats(cell.dateStr);
          const isSelected = cell.dateStr === selectedDate;
          const isToday = cell.isToday;

          return (
            <button
              key={cell.dateStr}
              type="button"
              onClick={() => onSelectDate(cell.dateStr)}
              className={`group relative text-left min-h-[72px] sm:min-h-[96px] p-1.5 sm:p-2.5 flex flex-col justify-between transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:z-10 ${
                isSelected
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 ring-2 ring-indigo-600 z-10'
                  : cell.isCurrentMonth
                  ? 'bg-white dark:bg-neutral-900 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/50'
                  : 'bg-neutral-50/50 dark:bg-neutral-950/50 opacity-40 hover:opacity-80'
              }`}
            >
              {/* Day Header row inside cell */}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1">
                  <span
                    className={`text-xs sm:text-sm font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full transition-transform group-hover:scale-105 ${
                      isToday
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : isSelected
                        ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                        : 'text-neutral-800 dark:text-neutral-200'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {/* Requirement 5: Show upcoming reminders on the calendar with a bell icon */}
                  {stats.hasReminders && (
                    <span
                      className="inline-flex items-center text-amber-500 animate-pulse"
                      title={`${stats.reminderCount} upcoming reminder${stats.reminderCount > 1 ? 's' : ''} on this date`}
                    >
                      <Bell className="w-3 h-3 fill-amber-500" />
                    </span>
                  )}
                </div>

                {/* Task counter or checkmark icon */}
                {stats.total > 0 && (
                  <span
                    className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-md ${
                      stats.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : stats.status === 'partial'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                    }`}
                  >
                    {stats.status === 'completed' ? (
                      <span className="flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        {stats.completed}
                      </span>
                    ) : (
                      `${stats.completed}/${stats.total}`
                    )}
                  </span>
                )}
              </div>

              {/* Requirement 3: "Each day shows a small progress bar: green = all done, yellow = partly done." */}
              <div className="w-full mt-2">
                {stats.total > 0 ? (
                  <div>
                    {/* Small Progress Bar */}
                    <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          stats.status === 'completed'
                            ? 'bg-emerald-500' // green = all done
                            : stats.status === 'partial'
                            ? 'bg-amber-400' // yellow = partly done
                            : 'bg-neutral-300 dark:bg-neutral-700'
                        }`}
                        style={{
                          width: `${Math.max(stats.percent, 8)}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-1.5" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Calendar Bottom Legend & Selected Date Quick Insight */}
      <div className="p-3 sm:p-4 bg-neutral-50 dark:bg-neutral-800/40 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600 dark:text-neutral-400 border-t border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span className="font-medium text-[11px] sm:text-xs">All done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span className="font-medium text-[11px] sm:text-xs">Partly done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700 inline-block" />
            <span className="font-medium text-[11px] sm:text-xs">Pending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bell className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span className="font-medium text-[11px] sm:text-xs">Reminder set</span>
          </div>
        </div>

        <div className="font-semibold text-neutral-800 dark:text-neutral-200">
          Selected: <span className="text-indigo-600 dark:text-indigo-400">{formatFriendlyDate(selectedDate)}</span>
        </div>
      </div>
    </div>
  );
};
