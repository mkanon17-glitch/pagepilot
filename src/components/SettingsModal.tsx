import React, { useState } from 'react';
import {
  X,
  Globe,
  Calendar,
  Moon,
  Sun,
  Laptop,
  Check,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { UserProfile, WeekStartDay, ThemeMode } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onUpdateSettings: (settings: {
    timezone: string;
    weekStartDay: WeekStartDay;
    theme: ThemeMode;
  }) => Promise<void>;
}

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onUpdateSettings,
}) => {
  const [timezone, setTimezone] = useState(
    userProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  const [weekStartDay, setWeekStartDay] = useState<WeekStartDay>(
    userProfile?.weekStartDay ?? 0
  );
  const [theme, setTheme] = useState<ThemeMode>(userProfile?.theme || 'system');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleAutoDetectTimezone = () => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        setTimezone(detected);
        setSuccessMsg(`Auto-detected timezone: ${detected}`);
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch {
      // ignore
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateSettings({
        timezone,
        weekStartDay,
        theme,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Planner Settings
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300">
              {successMsg}
            </div>
          )}

          {/* Setting 1: Timezone with Auto-detect */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                Timezone
              </label>
              <button
                type="button"
                onClick={handleAutoDetectTimezone}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                <MapPin className="w-3 h-3" />
                Auto-detect
              </button>
            </div>
            <div className="space-y-1.5">
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g., America/New_York"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex flex-wrap gap-1 text-[11px] text-neutral-500">
                <span className="font-semibold text-neutral-400">Suggestions:</span>
                {['America/New_York', 'Europe/London', 'Asia/Tokyo', 'UTC'].map((tz) => (
                  <button
                    key={tz}
                    type="button"
                    onClick={() => setTimezone(tz)}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 underline"
                  >
                    {tz.split('/')[1] || tz}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Setting 2: Week Start Day (Sat / Sun / Mon) */}
          <div>
            <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Calendar Week Starts On
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { day: 6 as WeekStartDay, label: 'Saturday', short: 'Sat' },
                { day: 0 as WeekStartDay, label: 'Sunday', short: 'Sun' },
                { day: 1 as WeekStartDay, label: 'Monday', short: 'Mon' },
              ].map(({ day, label, short }) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setWeekStartDay(day)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    weekStartDay === day
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div>{label}</div>
                  <div className="text-[10px] text-neutral-400 font-normal">({short})</div>
                </button>
              ))}
            </div>
          </div>

          {/* Setting 3: Light / Dark Mode */}
          <div>
            <label className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 mb-2">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              Theme Appearance
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  theme === 'light'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                Light
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  theme === 'dark'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  theme === 'system'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 text-neutral-500" />
                System
              </button>
            </div>
          </div>

          {/* Account Details Box */}
          {userProfile && (
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 text-xs">
              <span className="text-neutral-500">Connected Google Account:</span>
              <div className="font-semibold text-neutral-800 dark:text-neutral-200 truncate mt-0.5">
                {userProfile.email}
              </div>
            </div>
          )}

          {/* Footer Save Button */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
