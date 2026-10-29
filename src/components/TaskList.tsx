import React, { useState } from 'react';
import {
  Check,
  Calendar,
  Repeat,
  FileText,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
  Clock,
  Filter,
  AlertCircle,
  Send,
  Bell,
  CalendarPlus,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TaskItem, PageBrand, PlatformType } from '../types';
import { PLATFORMS, ALL_PLATFORM_KEYS } from '../utils/platformConfig';
import { PlatformIcon } from './PlatformIcon';
import {
  getRelativeDateLabel,
  getTodayDateString,
  offsetDate,
} from '../utils/dateUtils';
import {
  buildGoogleCalendarUrl,
  REMINDER_OFFSET_LABELS,
  formatRepeatLabel,
} from '../utils/calendarUtils';

interface TaskListProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  tasks: TaskItem[];
  pages: PageBrand[];
  timezone: string;
  onToggleComplete: (taskId: string, currentStatus: boolean) => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenNewTask: (targetDate?: string) => void;
  onSyncDailyTasksForDate: (dateStr: string) => void;
  onOpenCaptionAi: (task: TaskItem) => void;
  onOpenCreatePost?: (task?: TaskItem) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  selectedDate,
  onSelectDate,
  tasks,
  pages,
  timezone,
  onToggleComplete,
  onEditTask,
  onDeleteTask,
  onOpenNewTask,
  onSyncDailyTasksForDate,
  onOpenCaptionAi,
  onOpenCreatePost,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterPage, setFilterPage] = useState<string>('all');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const todayStr = getTodayDateString(timezone);
  const isToday = selectedDate === todayStr;
  const isFuture = selectedDate > todayStr;
  const relativeLabel = getRelativeDateLabel(selectedDate, timezone);

  // Filter tasks for this selected date
  const dayTasks = tasks.filter((t) => t.targetDate === selectedDate);
  const totalDayTasks = dayTasks.length;
  const completedDayTasks = dayTasks.filter((t) => t.completed).length;

  const filteredTasks = dayTasks.filter((task) => {
    if (filterStatus === 'pending' && task.completed) return false;
    if (filterStatus === 'completed' && !task.completed) return false;
    if (filterPlatform !== 'all' && task.platform !== filterPlatform) return false;
    if (filterPage !== 'all' && task.pageId !== filterPage) return false;
    return true;
  });

  const toggleNotes = (taskId: string) => {
    setExpandedNotes((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleCheckboxClick = (task: TaskItem) => {
    const nextCompleted = !task.completed;
    onToggleComplete(task.id, task.completed);

    // If this completed the last remaining task for the day, fire a burst of confetti!
    if (nextCompleted) {
      const willBeCompleted = completedDayTasks + 1;
      if (willBeCompleted >= totalDayTasks && totalDayTasks > 0) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Date Header & Quick Navigation Bar */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  isToday
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    : isFuture
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                }`}
              >
                {relativeLabel}
              </span>
              {isFuture && (
                <span className="text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Early planning enabled
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mt-1">
              {new Date(
                Number(selectedDate.split('-')[0]),
                Number(selectedDate.split('-')[1]) - 1,
                Number(selectedDate.split('-')[2])
              ).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              {totalDayTasks === 0
                ? 'No tasks scheduled'
                : `${completedDayTasks} of ${totalDayTasks} completed (${Math.round(
                    (completedDayTasks / totalDayTasks) * 100
                  )}%)`}
            </p>
          </div>

          {/* Quick Date Shift Buttons */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={() => onSelectDate(offsetDate(selectedDate, -1))}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              ← Prev Day
            </button>
            {!isToday && (
              <button
                onClick={() => onSelectDate(todayStr)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 transition-colors"
              >
                Today
              </button>
            )}
            <button
              onClick={() => onSelectDate(offsetDate(selectedDate, 1))}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Next Day →
            </button>
          </div>
        </div>

        {/* Filter and View Options */}
        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2.5">
          {/* Status Chips */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === 'all'
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              All ({totalDayTasks})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === 'pending'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              Pending ({totalDayTasks - completedDayTasks})
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              Done ({completedDayTasks})
            </button>
          </div>

          {/* Platform & Page Dropdowns */}
          <div className="flex items-center gap-2">
            {pages.length > 1 && (
              <select
                value={filterPage}
                onChange={(e) => setFilterPage(e.target.value)}
                className="text-xs bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg px-2 py-1 text-neutral-700 dark:text-neutral-300 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Brands</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="text-xs bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg px-2 py-1 text-neutral-700 dark:text-neutral-300 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Platforms</option>
              {ALL_PLATFORM_KEYS.map((plat) => (
                <option key={plat} value={plat}>
                  {PLATFORMS[plat]?.name || plat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Task Cards List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 border border-neutral-200 dark:border-neutral-800 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            {totalDayTasks === 0 ? 'No tasks for this date yet' : 'No tasks match your filter'}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mt-1">
            {totalDayTasks === 0
              ? pages.some((p) => p.active)
                ? 'Generate standard daily tasks from your active brands or create a custom task.'
                : 'Add a page/brand in the Pages tab to auto-create daily tasks.'
              : 'Try clearing your filters to see other tasks for this date.'}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            {pages.some((p) => p.active) && totalDayTasks === 0 && (
              <button
                onClick={() => onSyncDailyTasksForDate(selectedDate)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
              >
                <Repeat className="w-3.5 h-3.5" />
                Auto-Generate Daily Tasks
              </button>
            )}
            <button
              onClick={() => onOpenNewTask(selectedDate)}
              className="px-3.5 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Custom Task
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((task) => {
            const platformMeta =
              task.platform && PLATFORMS[task.platform as PlatformType]
                ? PLATFORMS[task.platform as PlatformType]
                : null;
            const pageItem = pages.find((p) => p.id === task.pageId);
            const brandColor = pageItem?.color || '#6366F1';
            const isNotesExpanded = !!expandedNotes[task.id];

            return (
              <div
                key={task.id}
                className={`group bg-white dark:bg-neutral-900 rounded-2xl p-3.5 sm:p-4 border transition-all duration-200 shadow-xs hover:shadow-md ${
                  task.completed
                    ? 'border-emerald-200/60 dark:border-emerald-950/40 bg-emerald-50/20 dark:bg-neutral-900/60 opacity-90'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Large Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleCheckboxClick(task)}
                    className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all cursor-pointer ${
                      task.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs scale-95'
                        : 'border-neutral-300 dark:border-neutral-600 hover:border-indigo-500 dark:hover:border-indigo-400 bg-white dark:bg-neutral-800'
                    }`}
                    title={task.completed ? 'Mark uncompleted' : 'Mark completed early or today'}
                    aria-label="Toggle task completion"
                  >
                    {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {/* Brand Pill */}
                      {task.pageName && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold text-white shadow-2xs"
                          style={{ backgroundColor: brandColor }}
                        >
                          {task.pageName}
                        </span>
                      )}

                      {/* Platform Badge */}
                      {platformMeta && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${platformMeta.badgeBg}`}
                        >
                          <PlatformIcon platform={platformMeta.id} size={12} />
                          {platformMeta.name}
                        </span>
                      )}

                      {/* Task Type Badge (Requirement 4: "daily" or "one-time on a date") */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${
                          task.taskType === 'daily'
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50'
                        }`}
                      >
                        {task.taskType === 'daily' ? (
                          <>
                            <Repeat className="w-2.5 h-2.5" /> Daily
                          </>
                        ) : (
                          <>
                            <Calendar className="w-2.5 h-2.5" /> One-time
                          </>
                        )}
                      </span>

                      {/* Priority tag if high */}
                      {task.priority === 'high' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                          High
                        </span>
                      )}

                      {/* Reminder badge (Requirement 1 & 2) */}
                      {task.reminderTime && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 shadow-2xs"
                          title={`Reminder set for ${task.reminderTime} (${REMINDER_OFFSET_LABELS[task.reminderOffset || 'at_time']})`}
                        >
                          <Bell className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                          <span>{task.reminderTime}</span>
                          <span className="text-[9px] opacity-80">({REMINDER_OFFSET_LABELS[task.reminderOffset || 'at_time']})</span>
                        </span>
                      )}

                      {/* Repeat badge if recurrence configured */}
                      {task.repeatOption && task.repeatOption !== 'none' && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200/50 dark:border-neutral-700/50"
                          title={formatRepeatLabel(task.repeatOption, task.customRepeatDays)}
                        >
                          <Repeat className="w-2.5 h-2.5 text-neutral-500" />
                          <span>{formatRepeatLabel(task.repeatOption, task.customRepeatDays)}</span>
                        </span>
                      )}

                      {/* Early completion indicator */}
                      {isFuture && task.completed && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Done Early!
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4
                      className={`text-sm sm:text-base font-semibold leading-snug break-words ${
                        task.completed
                          ? 'line-through text-neutral-400 dark:text-neutral-500'
                          : 'text-neutral-900 dark:text-neutral-100'
                      }`}
                    >
                      {task.title}
                    </h4>

                    {/* Error display if publishing failed: Requirement: if it fails, show the error on the task */}
                    {task.error && (
                      <div className="mt-2 p-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                        <div>
                          <span className="font-bold">Publishing failed:</span> {task.error}
                        </div>
                      </div>
                    )}

                    {/* Action buttons: Write caption with AI + Publish Post + Add to Google Calendar */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => onOpenCaptionAi(task)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 dark:from-indigo-950/70 dark:to-purple-950/70 dark:hover:from-indigo-900/70 dark:hover:to-purple-900/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                        title="Generate post caption using Gemini AI in any language"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                        <span>Write caption with AI</span>
                      </button>

                      {onOpenCreatePost && !task.completed && (
                        <button
                          type="button"
                          onClick={() => onOpenCreatePost(task)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                          title="Create and publish post to connected accounts"
                        >
                          <Send className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          <span>Publish Post</span>
                        </button>
                      )}

                      {/* Requirement 4: On every task add an "Add to Google Calendar" button */}
                      <a
                        href={buildGoogleCalendarUrl(task)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                        title="Add to Google Calendar so your phone reminds you even when the app is closed"
                      >
                        <CalendarPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Add to Google Calendar</span>
                      </a>

                      {task.notes && (
                        <button
                          type="button"
                          onClick={() => toggleNotes(task.id)}
                          className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium"
                        >
                          <FileText className="w-3 h-3 text-indigo-500" />
                          <span>{isNotesExpanded ? 'Hide caption & notes' : 'View caption / notes'}</span>
                          {isNotesExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Expanded Notes Display */}
                    {task.notes && isNotesExpanded && (
                      <div className="mt-2.5 p-3 bg-neutral-50 dark:bg-neutral-800/80 rounded-xl text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap border border-neutral-200/70 dark:border-neutral-700/70 font-sans leading-relaxed">
                        {task.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions: Edit, Delete */}
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onEditTask(task)}
                      className="p-1.5 text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      title="Edit task"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating or inline button to add task for this selected date */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => onOpenNewTask(selectedDate)}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-indigo-400 dark:hover:border-indigo-600 text-neutral-600 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all bg-white/40 dark:bg-neutral-900/40 hover:bg-indigo-50/20"
        >
          <Plus className="w-4 h-4" />
          Add task for {relativeLabel}
        </button>
      </div>
    </div>
  );
};
