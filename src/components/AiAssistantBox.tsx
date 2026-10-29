import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  Globe,
  ArrowRight,
  Layers,
  Calendar,
} from 'lucide-react';
import { PageBrand, TaskItem } from '../types';
import { parseTasksWithAI } from '../services/aiService';

interface AiAssistantBoxProps {
  pages: PageBrand[];
  currentDate: string;
  timezone: string;
  onTasksCreated: (createdTasks: TaskItem[], targetDate: string) => void;
  onBatchCreateTasks: (
    newTasks: Array<{
      title: string;
      targetDate: string;
      taskType: 'daily' | 'one_time';
      pageId?: string;
      pageName?: string;
      platform?: string;
      notes?: string;
      priority?: 'low' | 'medium' | 'high';
    }>
  ) => Promise<TaskItem[]>;
}

export const AiAssistantBox: React.FC<AiAssistantBoxProps> = ({
  pages,
  currentDate,
  timezone,
  onTasksCreated,
  onBatchCreateTasks,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{
    explanation: string;
    count: number;
    targetDate: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setLastResult(null);

    try {
      const response = await parseTasksWithAI(prompt.trim(), currentDate, timezone, pages);

      if (!response.tasks || response.tasks.length === 0) {
        setError('No tasks were detected from your prompt. Try adding a date like "tomorrow" or a platform name.');
        setIsLoading(false);
        return;
      }

      // Batch create tasks in Firestore
      const createdItems = await onBatchCreateTasks(response.tasks);
      const primaryTargetDate = response.tasks[0]?.targetDate || currentDate;

      setLastResult({
        explanation: response.explanation || `Successfully created ${createdItems.length} tasks!`,
        count: createdItems.length,
        targetDate: primaryTargetDate,
      });

      onTasksCreated(createdItems, primaryTargetDate);
      setPrompt('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI assistant encountered an issue.');
    } finally {
      setIsLoading(false);
    }
  };

  const samplePrompts = [
    pages.length > 0 ? `Post on all ${pages.length} pages tomorrow` : 'Post on all pages tomorrow',
    'Schedule TikTok & Instagram Reel for Friday',
    'Publicar en todas las páginas mañana',
    'Post YouTube video next Monday with high priority',
  ];

  return (
    <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/90 to-pink-50/90 dark:from-neutral-900 dark:via-neutral-900/90 dark:to-neutral-900 rounded-2xl p-4 sm:p-5 border border-indigo-200/80 dark:border-indigo-900/50 shadow-sm transition-all relative overflow-hidden">
      {/* Background soft glow accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5 leading-none">
              Gemini AI Planner
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                Any Language
              </span>
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              Type what to post in any language — Gemini schedules them on the right date
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
          <Globe className="w-3.5 h-3.5 text-indigo-500" />
          <span>Multilingual</span>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
            placeholder={
              pages.length > 0
                ? `e.g. "post on all ${pages.length} pages tomorrow" or "publicar reel este viernes"`
                : 'e.g. "post on all 3 pages tomorrow" or "video tiktok pour demain"'
            }
            className="w-full pl-4 pr-24 sm:pr-28 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs sm:text-sm placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none shadow-xs transition-all"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="absolute right-1.5 px-3 sm:px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Planning...</span>
              </>
            ) : (
              <>
                <span>Create</span>
                <Send className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Prompt Suggestions */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        <span className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
          Try:
        </span>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setPrompt(p)}
            className="text-[11px] px-2 py-0.5 rounded-md bg-white/70 dark:bg-neutral-800/70 border border-neutral-200/80 dark:border-neutral-700/80 text-neutral-600 dark:text-neutral-300 hover:border-indigo-400 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate max-w-[240px]"
          >
            "{p}"
          </button>
        ))}
      </div>

      {/* Success Notification Result */}
      {lastResult && (
        <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-emerald-900 dark:text-emerald-200">
                {lastResult.explanation}
              </span>
              <span className="text-emerald-700 dark:text-emerald-300 ml-1.5 font-medium">
                ({lastResult.count} {lastResult.count === 1 ? 'task' : 'tasks'} added for {lastResult.targetDate})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onTasksCreated([], lastResult.targetDate)}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center gap-1 shrink-0"
          >
            <Calendar className="w-3 h-3" />
            View {lastResult.targetDate}
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
};
