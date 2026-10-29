import React, { useState, useEffect } from 'react';
import { X, Calendar, Repeat, Sparkles, Bell, Clock, CalendarDays } from 'lucide-react';
import { TaskItem, PageBrand, PlatformType, TaskType, PriorityType, RepeatOption, ReminderOffset } from '../types';
import { PLATFORMS, ALL_PLATFORM_KEYS } from '../utils/platformConfig';
import { PlatformIcon } from './PlatformIcon';
import { getTodayDateString, offsetDate } from '../utils/dateUtils';
import { REMINDER_OFFSET_LABELS, REPEAT_OPTION_LABELS, DAY_NAMES } from '../utils/calendarUtils';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: {
    title: string;
    targetDate: string;
    taskType: TaskType;
    pageId?: string;
    pageName?: string;
    platform?: string;
    notes?: string;
    priority?: PriorityType;
    reminderTime?: string;
    repeatOption?: RepeatOption;
    customRepeatDays?: number[];
    reminderOffset?: ReminderOffset;
  }) => Promise<void>;
  editingTask: TaskItem | null;
  defaultDate?: string;
  pages: PageBrand[];
  timezone: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTask,
  defaultDate,
  pages,
  timezone,
}) => {
  const today = getTodayDateString(timezone);

  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('daily');
  const [targetDate, setTargetDate] = useState(defaultDate || today);
  const [pageId, setPageId] = useState<string>('');
  const [platform, setPlatform] = useState<string>('instagram');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<PriorityType>('medium');

  // Reminders and Recurrence
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState('10:00');
  const [reminderOffset, setReminderOffset] = useState<ReminderOffset>('at_time');
  const [repeatOption, setRepeatOption] = useState<RepeatOption>('none');
  const [customRepeatDays, setCustomRepeatDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri default

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setTaskType(editingTask.taskType);
      setTargetDate(editingTask.targetDate);
      setPageId(editingTask.pageId || '');
      setPlatform(editingTask.platform || 'instagram');
      setNotes(editingTask.notes || '');
      setPriority(editingTask.priority || 'medium');
      setHasReminder(!!editingTask.reminderTime);
      setReminderTime(editingTask.reminderTime || '10:00');
      setReminderOffset(editingTask.reminderOffset || 'at_time');
      setRepeatOption(editingTask.repeatOption || (editingTask.taskType === 'daily' ? 'daily' : 'none'));
      setCustomRepeatDays(editingTask.customRepeatDays || [1, 3, 5]);
    } else {
      const initialPage = pages.find((p) => p.active) || pages[0];
      const initialPageId = initialPage ? initialPage.id : '';
      const initialPlatform = initialPage?.platforms[0] || 'instagram';

      setPageId(initialPageId);
      setPlatform(initialPlatform);
      setTaskType('daily');
      setTargetDate(defaultDate || today);
      setNotes('');
      setPriority('medium');
      setHasReminder(false);
      setReminderTime('10:00');
      setReminderOffset('at_time');
      setRepeatOption('none');
      setCustomRepeatDays([1, 3, 5]);

      if (initialPage) {
        const platMeta = PLATFORMS[initialPlatform as PlatformType];
        setTitle(`${initialPage.name} — ${platMeta?.name || initialPlatform} post`);
      } else {
        setTitle('');
      }
    }
    setError('');
  }, [editingTask, defaultDate, isOpen, pages, today]);

  if (!isOpen) return null;

  const handlePageChange = (selectedPageId: string) => {
    setPageId(selectedPageId);
    const page = pages.find((p) => p.id === selectedPageId);
    if (page && page.platforms.length > 0) {
      const plat = page.platforms[0];
      setPlatform(plat);
      const platMeta = PLATFORMS[plat as PlatformType];
      setTitle(`${page.name} — ${platMeta?.name || plat} post`);
    }
  };

  const handlePlatformChange = (selectedPlat: string) => {
    setPlatform(selectedPlat);
    const page = pages.find((p) => p.id === pageId);
    const platMeta = PLATFORMS[selectedPlat as PlatformType];
    if (page) {
      setTitle(`${page.name} — ${platMeta?.name || selectedPlat} post`);
    }
  };

  const toggleCustomDay = (dayIndex: number) => {
    setCustomRepeatDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a task title');
      return;
    }
    if (!targetDate) {
      setError('Please choose a valid target date');
      return;
    }

    const selectedPage = pages.find((p) => p.id === pageId);

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        targetDate,
        taskType: repeatOption === 'daily' ? 'daily' : taskType,
        pageId: pageId || undefined,
        pageName: selectedPage?.name || undefined,
        platform: platform || undefined,
        notes: notes.trim() || undefined,
        priority,
        reminderTime: hasReminder ? reminderTime : undefined,
        repeatOption: repeatOption,
        customRepeatDays: repeatOption === 'custom' ? customRepeatDays : undefined,
        reminderOffset: hasReminder ? reminderOffset : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              {editingTask ? 'Edit Task' : 'New Creator Task'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Task Type Switcher (Requirement 4: "daily" or "one-time on a date") */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Task Frequency
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTaskType('daily')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  taskType === 'daily'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <Repeat className="w-3.5 h-3.5 text-indigo-600" />
                Daily Recurring
              </button>
              <button
                type="button"
                onClick={() => setTaskType('one_time')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  taskType === 'one_time'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                One-time on Date
              </button>
            </div>
          </div>

          {/* Target Date with quick pills */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Target Date
              </label>
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setTargetDate(today)}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Today
                </button>
                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                <button
                  type="button"
                  onClick={() => setTargetDate(offsetDate(today, 1))}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Tomorrow
                </button>
                <span className="text-neutral-300 dark:text-neutral-700">•</span>
                <button
                  type="button"
                  onClick={() => setTargetDate(offsetDate(today, 7))}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  +1 Week
                </button>
              </div>
            </div>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>

          {/* Brand & Platform Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Brand / Page
              </label>
              <select
                value={pageId}
                onChange={(e) => handlePageChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">General (No Brand)</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Social Platform
              </label>
              <select
                value={platform}
                onChange={(e) => handlePlatformChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {ALL_PLATFORM_KEYS.map((plat) => (
                  <option key={plat} value={plat}>
                    {PLATFORMS[plat]?.name || plat}
                  </option>
                ))}
                <option value="general">Other / General</option>
              </select>
            </div>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Task Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., TechPulse — Instagram Carousel post"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              maxLength={200}
              required
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Priority
            </label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as PriorityType[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-1.5 text-xs font-semibold capitalize rounded-lg border transition-all ${
                    priority === p
                      ? p === 'high'
                        ? 'bg-red-500 text-white border-red-500'
                        : p === 'medium'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-neutral-600 text-white border-neutral-600'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Google Calendar-Style Reminder & Recurrence (Requirements 1 & 2) */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-1.5 rounded-xl transition-colors ${
                    hasReminder
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                    Reminder &amp; Repeat
                    <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400 font-semibold">
                      (Google Calendar)
                    </span>
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Browser notification + Google Calendar sync
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasReminder}
                  onChange={(e) => setHasReminder(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
              </label>
            </div>

            {hasReminder && (
              <div className="space-y-3 pt-2 border-t border-neutral-200/70 dark:border-neutral-700/60">
                {/* Reminder Time & Offset Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      Reminder Time
                    </label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-amber-500"
                      required={hasReminder}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Reminder Timing (Offset)
                    </label>
                    <select
                      value={reminderOffset}
                      onChange={(e) => setReminderOffset(e.target.value as ReminderOffset)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="at_time">At time of task</option>
                      <option value="5_min">5 min before</option>
                      <option value="15_min">15 min before</option>
                      <option value="30_min">30 min before</option>
                      <option value="1_hour">1 hour before</option>
                      <option value="1_day">1 day before</option>
                    </select>
                  </div>
                </div>

                {/* Repeat / Recurrence Options (Requirement 1) */}
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1">
                    <Repeat className="w-3 h-3 text-indigo-500" />
                    Repeat Option
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {(['none', 'daily', 'weekly', 'monthly', 'custom'] as RepeatOption[]).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setRepeatOption(opt)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold capitalize border transition-all text-center ${
                          repeatOption === opt
                            ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                            : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                        }`}
                      >
                        {opt === 'none' ? 'None' : opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Days Selector if repeatOption === 'custom' */}
                {repeatOption === 'custom' && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Select Custom Repeat Days:
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {DAY_NAMES.map((dayName, idx) => {
                        const isSelected = customRepeatDays.includes(idx);
                        return (
                          <button
                            key={dayName}
                            type="button"
                            onClick={() => toggleCustomDay(idx)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300'
                            }`}
                          >
                            {dayName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes / Caption Draft */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Caption Draft & Post Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Draft caption, hashtags, audio notes, or media link..."
              rows={3}
              maxLength={2000}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              {isSubmitting ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
