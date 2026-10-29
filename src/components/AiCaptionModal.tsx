import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Globe,
  FileCheck,
  RefreshCw,
  Send,
} from 'lucide-react';
import { TaskItem, PlatformType } from '../types';
import { PLATFORMS } from '../utils/platformConfig';
import { PlatformIcon } from './PlatformIcon';
import { generateCaptionWithAI } from '../services/aiService';

interface AiCaptionModalProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyCaption: (taskId: string, captionText: string) => Promise<void>;
}

const COMMON_LANGUAGES = [
  'English',
  'Spanish (Español)',
  'French (Français)',
  'German (Deutsch)',
  'Portuguese (Português)',
  'Italian (Italiano)',
  'Japanese (日本語)',
  'Korean (한국어)',
  'Arabic (العربية)',
  'Hindi (हिन्दी)',
  'Chinese (中文)',
  'Dutch (Nederlands)',
];

const TONE_OPTIONS = [
  { id: 'engaging', label: 'Engaging & Viral' },
  { id: 'professional', label: 'Professional & Informative' },
  { id: 'casual', label: 'Casual & Authentic' },
  { id: 'humorous', label: 'Witty & Playful' },
  { id: 'inspiring', label: 'Motivational & Inspiring' },
];

export const AiCaptionModal: React.FC<AiCaptionModalProps> = ({
  task,
  isOpen,
  onClose,
  onApplyCaption,
}) => {
  const [language, setLanguage] = useState('English');
  const [tone, setTone] = useState('engaging');
  const [topicOrBrief, setTopicOrBrief] = useState('');
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task && isOpen) {
      setTopicOrBrief(task.notes || task.title || '');
      setGeneratedCaption('');
      setHashtags([]);
      setError(null);
      setIsCopied(false);
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const platformMeta = task.platform && PLATFORMS[task.platform as PlatformType]
    ? PLATFORMS[task.platform as PlatformType]
    : null;

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setIsCopied(false);

    try {
      const response = await generateCaptionWithAI({
        taskTitle: task.title,
        platform: task.platform,
        pageName: task.pageName,
        topicOrNotes: topicOrBrief,
        language,
        tone: TONE_OPTIONS.find((t) => t.id === tone)?.label || tone,
      });

      setGeneratedCaption(response.caption);
      setHashtags(response.hashtags || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate caption.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedCaption) return;
    try {
      const fullText = hashtags.length > 0
        ? `${generatedCaption}\n\n${hashtags.join(' ')}`
        : generatedCaption;
      await navigator.clipboard.writeText(fullText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleApply = async () => {
    if (!generatedCaption) return;
    setIsApplying(true);
    try {
      const fullText = hashtags.length > 0
        ? `${generatedCaption}\n\n${hashtags.join(' ')}`
        : generatedCaption;
      await onApplyCaption(task.id, fullText);
      onClose();
    } catch (err) {
      setError('Failed to update task with caption.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden transition-all flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white leading-none">
                Write Caption with AI
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                Optimized by Gemini for {platformMeta?.name || task.platform || 'Social Media'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Target Task Summary Card */}
          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-700/60 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                {task.pageName && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {task.pageName}
                  </span>
                )}
                {platformMeta && (
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold ${platformMeta.badgeBg}`}>
                    <PlatformIcon platform={platformMeta.id} size={11} />
                    {platformMeta.name}
                  </span>
                )}
              </div>
              <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white truncate">
                {task.title}
              </h4>
            </div>
          </div>

          {/* Form Options: Language & Tone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Language Selector (Requirement: in the user's chosen language) */}
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1 mb-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                Chosen Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {COMMON_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            {/* Tone Selector */}
            <div>
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
                Caption Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {TONE_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Context / Topic / Instructions */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Topic, Hook, or Key Points
            </label>
            <textarea
              value={topicOrBrief}
              onChange={(e) => setTopicOrBrief(e.target.value)}
              placeholder="e.g. Tips to grow on Instagram in 2026, launching our new summer line, behind the scenes..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            />
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-98 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Writing caption in {language}...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{generatedCaption ? 'Regenerate Caption' : 'Generate Caption with Gemini'}</span>
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Generated Caption Result Area */}
          {generatedCaption && (
            <div className="space-y-3 pt-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Generated Caption ({language})
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-xs text-neutral-600 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 font-medium"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/80 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap leading-relaxed shadow-2xs">
                {generatedCaption}

                {hashtags.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 flex flex-wrap gap-1 text-indigo-600 dark:text-indigo-400 font-medium text-xs">
                    {hashtags.map((tag, idx) => (
                      <span key={idx}>{tag.startsWith('#') ? tag : `#${tag}`}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-50/50 dark:bg-neutral-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
          >
            Cancel
          </button>

          {generatedCaption && (
            <button
              type="button"
              onClick={handleApply}
              disabled={isApplying}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Insert into Task Notes</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
