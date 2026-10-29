import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Check,
  Power,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { PageBrand, PlatformType } from '../types';
import { PLATFORMS, ALL_PLATFORM_KEYS, BRAND_COLORS } from '../utils/platformConfig';
import { PlatformIcon } from './PlatformIcon';

interface PageManagerProps {
  pages: PageBrand[];
  onCreatePage: (data: {
    name: string;
    category?: string;
    color?: string;
    platforms: PlatformType[];
  }) => Promise<void>;
  onUpdatePage: (
    pageId: string,
    updates: Partial<Pick<PageBrand, 'name' | 'category' | 'color' | 'platforms' | 'active'>>
  ) => Promise<void>;
  onDeletePage: (pageId: string) => Promise<void>;
}

export const PageManager: React.FC<PageManagerProps> = ({
  pages,
  onCreatePage,
  onUpdatePage,
  onDeletePage,
}) => {
  const [showAddForm, setShowAddForm] = useState(pages.length === 0);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('#6366F1');
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformType[]>([
    'instagram',
    'tiktok',
    'youtube',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const togglePlatform = (plat: PlatformType) => {
    setSelectedPlatforms((prev) =>
      prev.includes(plat) ? prev.filter((p) => p !== plat) : [...prev, plat]
    );
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a brand or page name');
      return;
    }
    if (selectedPlatforms.length === 0) {
      setError('Please select at least one social media platform');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onCreatePage({
        name: name.trim(),
        category: category.trim() || undefined,
        color,
        platforms: selectedPlatforms,
      });
      setName('');
      setCategory('');
      setSelectedPlatforms(['instagram', 'tiktok', 'youtube']);
      setShowAddForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create page');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
              Pages & Brands
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage your social media channels. Each active platform auto-generates your daily content tasks.
          </p>
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center gap-1.5 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Brand / Page
          </button>
        )}
      </div>

      {/* Add Brand Form Card */}
      {showAddForm && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 sm:p-6 border border-indigo-200 dark:border-indigo-900/60 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Add New Brand or Page
            </h3>
            {pages.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Brand or Channel Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., TechPulse Media, Glow Studio"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Category / Niche (Optional)
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Tech & AI, Fitness, Gaming, Cooking"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  maxLength={60}
                />
              </div>
            </div>

            {/* Brand Color Selector */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Brand Badge Accent Color
              </label>
              <div className="flex flex-wrap gap-2">
                {BRAND_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                      color === c.hex ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {color === c.hex && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Platforms Selector (Requirement 1: Facebook, Instagram, TikTok, YouTube, X, LinkedIn, Threads) */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Active Social Platforms for this Page
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {ALL_PLATFORM_KEYS.map((plat) => {
                  const meta = PLATFORMS[plat];
                  const isSelected = selectedPlatforms.includes(plat);
                  return (
                    <button
                      key={plat}
                      type="button"
                      onClick={() => togglePlatform(plat)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                        isSelected
                          ? `${meta.bgLight} ${meta.borderLight} ring-1 ring-indigo-500/30`
                          : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/50 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${meta.badgeBg}`}>
                        <PlatformIcon platform={plat} size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          {meta.name}
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center border text-[9px] ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-neutral-300 dark:border-neutral-600'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-2 flex items-center justify-end gap-2">
              {pages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all"
              >
                {isSubmitting ? 'Saving...' : 'Add Page & Generate Daily Tasks'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pages List */}
      <div className="space-y-3">
        {pages.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No pages configured yet. Add your first brand above to get started!
            </p>
          </div>
        ) : (
          pages.map((page) => (
            <div
              key={page.id}
              className={`bg-white dark:bg-neutral-900 rounded-2xl p-4 sm:p-5 border transition-all shadow-xs ${
                page.active
                  ? 'border-neutral-200 dark:border-neutral-800'
                  : 'border-neutral-200/50 dark:border-neutral-800/50 opacity-60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-sm shrink-0"
                    style={{ backgroundColor: page.color || '#6366F1' }}
                  >
                    {page.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                        {page.name}
                      </h3>
                      {page.category && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                          {page.category}
                        </span>
                      )}
                      {!page.active && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                          Paused
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {page.platforms.length} platforms active • Daily tasks auto-generated
                    </p>
                  </div>
                </div>

                {/* Page Controls */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => onUpdatePage(page.id, { active: !page.active })}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      page.active
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : 'border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                    }`}
                    title={page.active ? 'Pause auto-generation' : 'Resume auto-generation'}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{page.active ? 'Active' : 'Paused'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete brand "${page.name}"?`)) {
                        onDeletePage(page.id);
                      }
                    }}
                    className="p-2 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                    title="Delete Brand"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Platform Badges */}
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-wrap gap-2">
                {page.platforms.map((plat) => {
                  const meta = PLATFORMS[plat];
                  if (!meta) return null;
                  return (
                    <div
                      key={plat}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${meta.bgLight} ${meta.borderLight} border`}
                    >
                      <PlatformIcon platform={plat} size={13} className="text-neutral-800 dark:text-neutral-200" />
                      <span className="text-neutral-800 dark:text-neutral-200 font-semibold">
                        {meta.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
