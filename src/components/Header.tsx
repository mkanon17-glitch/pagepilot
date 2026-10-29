import React from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ListTodo,
  Layers,
  Plus,
  Settings as SettingsIcon,
  LogOut,
  Sparkles,
  Share2,
  Send,
} from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  userProfile: UserProfile | null;
  todayTotal: number;
  todayCompleted: number;
  todayRemaining: number;
  activeTab: 'planner' | 'calendar' | 'brands' | 'accounts';
  onTabChange: (tab: 'planner' | 'calendar' | 'brands' | 'accounts') => void;
  onOpenNewTask: () => void;
  onOpenCreatePost: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userProfile,
  todayTotal,
  todayCompleted,
  todayRemaining,
  activeTab,
  onTabChange,
  onOpenNewTask,
  onOpenCreatePost,
  onOpenSettings,
  onLogout,
}) => {
  const percentage = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;
  const isAllDone = todayTotal > 0 && todayRemaining === 0;

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 transition-colors">
      {/* Top Banner: Requirement 5: "Top of screen: '5 tasks left today' with a progress bar" */}
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 border-b border-indigo-100/60 dark:border-neutral-800 px-4 py-2.5">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200">
            {isAllDone ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                All tasks finished today! Great job! 🎉
              </span>
            ) : todayTotal === 0 ? (
              <span className="text-neutral-500 dark:text-neutral-400">
                No tasks scheduled for today yet.
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-xs">
                  {todayRemaining} {todayRemaining === 1 ? 'task' : 'tasks'} left today
                </span>
                <span className="text-neutral-500 dark:text-neutral-400 text-xs hidden sm:inline">
                  ({todayCompleted} of {todayTotal} completed)
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar with smooth animation */}
          <div className="w-full sm:w-64 flex items-center gap-2">
            <div className="flex-1 h-2.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isAllDone
                    ? 'bg-emerald-500'
                    : percentage > 50
                    ? 'bg-gradient-to-r from-amber-400 to-emerald-500'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-400 min-w-[36px] text-right">
              {percentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white leading-none flex items-center gap-1.5">
              PagePilot
            </h1>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium leading-tight">
              Social Creator Planner
            </p>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl border border-neutral-200/70 dark:border-neutral-700/60">
          <button
            onClick={() => onTabChange('planner')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'planner'
                ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Planner</span>
          </button>
          <button
            onClick={() => onTabChange('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'calendar'
                ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Calendar</span>
          </button>
          <button
            onClick={() => onTabChange('brands')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'brands'
                ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Pages</span>
          </button>
          <button
            onClick={() => onTabChange('accounts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'accounts'
                ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Accounts</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenCreatePost}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all"
            title="Create and Publish Post"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Create Post</span>
          </button>

          <button
            onClick={onOpenNewTask}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold shadow-sm transition-all"
            title="Create Task"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Add Task</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Settings"
            aria-label="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          {/* User profile avatar or initial */}
          <div className="relative group">
            <button
              onClick={onLogout}
              className="flex items-center p-1 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.displayName || 'User'}
                  className="w-7 h-7 rounded-full object-cover border border-neutral-300 dark:border-neutral-700"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-700 dark:text-neutral-200">
                  {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <LogOut className="w-3.5 h-3.5 ml-1 hidden sm:inline opacity-60 group-hover:opacity-100" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
