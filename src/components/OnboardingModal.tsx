import React, { useState } from 'react';
import { Sparkles, Check, ArrowRight, ShieldCheck, Rocket } from 'lucide-react';
import { PlatformType } from '../types';
import { PLATFORMS, ALL_PLATFORM_KEYS, BRAND_COLORS } from '../utils/platformConfig';
import { PlatformIcon } from './PlatformIcon';

interface OnboardingModalProps {
  userName?: string;
  onComplete: (data: {
    brandName: string;
    category?: string;
    color: string;
    platforms: PlatformType[];
  }) => Promise<void>;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  userName,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [brandName, setBrandName] = useState('');
  const [category, setCategory] = useState('Creator & Media');
  const [color, setColor] = useState('#6366F1');
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformType[]>([
    'instagram',
    'tiktok',
    'youtube',
    'threads',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const togglePlatform = (plat: PlatformType) => {
    setSelectedPlatforms((prev) =>
      prev.includes(plat) ? prev.filter((p) => p !== plat) : [...prev, plat]
    );
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      setError('Please enter your brand or page name');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleFinalSubmit = async () => {
    if (selectedPlatforms.length === 0) {
      setError('Please select at least one social media platform');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onComplete({
        brandName: brandName.trim(),
        category: category.trim(),
        color,
        platforms: selectedPlatforms,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to finish onboarding');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="bg-white dark:bg-neutral-900 rounded-3xl max-w-xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Onboarding Header Banner */}
        <div className="bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md mx-auto flex items-center justify-center mb-3">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Welcome to PagePilot{userName ? `, ${userName}` : ''}!
          </h2>
          <p className="text-indigo-100 text-xs sm:text-sm mt-1 max-w-md mx-auto">
            Let's set up your social media presence so we can automatically plan and track your daily posts.
          </p>

          {/* Stepper Dots */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div
              className={`h-1.5 rounded-full transition-all ${
                step === 1 ? 'w-8 bg-white' : 'w-2 bg-white/40'
              }`}
            />
            <div
              className={`h-1.5 rounded-full transition-all ${
                step === 2 ? 'w-8 bg-white' : 'w-2 bg-white/40'
              }`}
            />
          </div>
        </div>

        {/* Step 1: Brand Name & Details */}
        {step === 1 && (
          <form onSubmit={handleNextStep} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1.5 uppercase tracking-wider">
                Step 1: Your Brand or Page Name
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Daily Tech Radar, Urban Studio, Health & Soul"
                className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                autoFocus
                required
              />
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                You can add multiple brands or niche accounts later at any time.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Category or Niche
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Tech & AI, Fashion, Gaming, Education"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Pick a Brand Badge Color
              </label>
              <div className="flex flex-wrap gap-2">
                {BRAND_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                      color === c.hex ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {color === c.hex && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
              >
                Next: Select Platforms
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Platform Selection & Auto-create */}
        {step === 2 && (
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1 uppercase tracking-wider">
                Step 2: Choose active platforms for "{brandName}"
              </label>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                PagePilot will automatically generate a daily task for each selected platform!
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {ALL_PLATFORM_KEYS.map((plat) => {
                  const meta = PLATFORMS[plat];
                  const isSelected = selectedPlatforms.includes(plat);
                  return (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => togglePlatform(plat)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? `${meta.bgLight} ${meta.borderLight} ring-1 ring-indigo-500/30`
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/40 opacity-50 hover:opacity-90'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-2 rounded-lg ${meta.badgeBg}`}>
                          <PlatformIcon platform={plat} size={15} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                            {meta.name}
                          </div>
                          <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                            {meta.defaultTaskTitle}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-neutral-300 dark:border-neutral-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generated Task Preview Box */}
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Daily tasks to be auto-created:
                </span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedPlatforms.length} tasks / day
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 truncate">
                e.g. "{brandName} — {PLATFORMS[selectedPlatforms[0] || 'instagram']?.name} post", etc.
              </p>
            </div>

            {/* Bottom Controls */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting || selectedPlatforms.length === 0}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
              >
                {isSubmitting ? 'Setting up...' : 'Start Planning with PagePilot'}
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
