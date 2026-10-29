import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  Repeat,
  Shield,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { ALL_PLATFORM_KEYS, PLATFORMS } from '../utils/platformConfig';
import { PlatformIcon } from './PlatformIcon';

interface AuthScreenProps {
  onLogin: () => Promise<void>;
  isLoggingIn: boolean;
  loginError: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLogin,
  isLoggingIn,
  loginError,
}) => {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col justify-between transition-colors">
      {/* Top Simple Brand Bar */}
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">PagePilot</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              Social Media Creator Task Planner
            </p>
          </div>
        </div>

        <button
          onClick={onLogin}
          disabled={isLoggingIn}
          className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 hover:border-indigo-500 text-neutral-800 dark:text-neutral-200 shadow-2xs hover:shadow-sm transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>{isLoggingIn ? 'Connecting...' : 'Sign In with Google'}</span>
        </button>
      </header>

      {/* Main Hero & Value Proposition */}
      <main className="max-w-4xl mx-auto px-6 py-8 sm:py-16 text-center space-y-8">
        {/* Highlight Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          <Sparkles className="w-3.5 h-3.5" />
          The Intelligent Publishing Planner for Multi-Brand Creators
        </div>

        {/* Big Headline */}
        <div className="space-y-4">
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-neutral-900 dark:text-white leading-[1.1]">
            Never miss a daily post across your{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              pages & channels
            </span>
            .
          </h2>
          <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Auto-generate daily publishing checklists for every brand × platform. Track progress with color-coded month calendars, plan upcoming weeks, and tick tasks early.
          </p>
        </div>

        {/* Platforms Marquee Pill Row */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          {ALL_PLATFORM_KEYS.map((plat) => {
            const meta = PLATFORMS[plat];
            return (
              <div
                key={plat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xs text-xs font-semibold text-neutral-700 dark:text-neutral-300"
              >
                <PlatformIcon platform={plat} size={14} />
                <span>{meta.name}</span>
              </div>
            );
          })}
        </div>

        {/* Big Sign In Button */}
        <div className="pt-4 flex flex-col items-center justify-center gap-3">
          {loginError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 max-w-md">
              {loginError}
            </div>
          )}

          <button
            onClick={onLogin}
            disabled={isLoggingIn}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-base shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{isLoggingIn ? 'Signing in...' : 'Continue with Google'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            Secure Google Sign-In • Data isolated to your private account
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 text-left">
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Repeat className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
              Page × Platform Matrix
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Automatic daily tasks for every active platform: Facebook, Instagram, TikTok, YouTube, X, LinkedIn & Threads.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
              Month Visual Calendar
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              At-a-glance daily progress bars: Green = all done, Yellow = partly done. Tap any date to plan ahead.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
              Tick Early & Schedule
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Batch create content in advance, schedule one-time or daily tasks, and tick them early when finished.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full px-6 py-6 border-t border-neutral-200 dark:border-neutral-900 text-center text-xs text-neutral-400 dark:text-neutral-600 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-indigo-500" />
          <span>PagePilot • Powered by Firebase Firestore & Authentication</span>
        </div>
        <div>
          <span>Timezone-aware scheduling • Mobile-first creator workflow</span>
        </div>
      </footer>
    </div>
  );
};
