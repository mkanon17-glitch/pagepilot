import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Sparkles,
  Calendar,
  Send,
  Clock,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Video,
  Trash2,
  Layers,
} from 'lucide-react';
import {
  ConnectedAccount,
  TaskItem,
  MediaType,
  PostItem,
} from '../types';
import { PlatformIcon } from './PlatformIcon';
import { uploadPostMedia, createPost, publishPostNow } from '../services/postService';
import confetti from 'canvas-confetti';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  accounts: ConnectedAccount[];
  tasks: TaskItem[];
  initialTask?: TaskItem | null;
  onPostCreated?: (post: PostItem) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  userId,
  accounts,
  tasks,
  initialTask,
  onPostCreated,
}) => {
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType>('none');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const [mode, setMode] = useState<'publish_now' | 'schedule'>('publish_now');
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Initialize form when opening or initialTask changes
  useEffect(() => {
    if (isOpen) {
      setErrorNotice(null);
      setSuccessNotice(null);
      setIsSubmitting(false);

      // Default select all connected accounts if none selected
      if (accounts.length > 0) {
        setSelectedAccountIds(accounts.map((a) => a.id));
      }

      // If opened with an initial task
      if (initialTask) {
        setSelectedTaskId(initialTask.id);
        setCaption(initialTask.notes || initialTask.title || '');

        // If task has a target date, set default schedule time to targetDate 10:00 AM
        const defaultDateTime = `${initialTask.targetDate}T10:00`;
        setScheduledDateTime(defaultDateTime);
      } else {
        setSelectedTaskId('');
        setCaption('');

        // Default scheduled date to tomorrow at 10:00
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        const pad = (n: number) => String(n).padStart(2, '0');
        const formatted = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T${pad(tomorrow.getHours())}:${pad(tomorrow.getMinutes())}`;
        setScheduledDateTime(formatted);
      }
    }
  }, [isOpen, initialTask, accounts]);

  if (!isOpen) return null;

  const toggleAccount = (accId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accId) ? prev.filter((id) => id !== accId) : [...prev, accId]
    );
  };

  const selectAllAccounts = () => {
    if (selectedAccountIds.length === accounts.length) {
      setSelectedAccountIds([]);
    } else {
      setSelectedAccountIds(accounts.map((a) => a.id));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFile(file);
    const isVideo = file.type.startsWith('video/');
    setMediaType(isVideo ? 'video' : 'image');

    const previewUrl = URL.createObjectURL(file);
    setMediaPreview(previewUrl);
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    setMediaType('none');
  };

  const handleAIEnhanceCaption = async () => {
    if (!caption.trim()) {
      setErrorNotice('Please write a quick topic, idea, or draft first.');
      return;
    }
    setErrorNotice(null);
    try {
      const res = await fetch('/api/ai/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: 'Social Media Post',
          topicOrNotes: caption,
          platform: 'Instagram',
          language: 'English',
        }),
      });
      const data = await res.json();
      if (data.caption) {
        setCaption(data.caption);
      }
    } catch {
      setErrorNotice('AI caption assistance unavailable right now.');
    }
  };

  const handleSubmit = async (action: 'publish_now' | 'schedule') => {
    setErrorNotice(null);
    setSuccessNotice(null);

    if (selectedAccountIds.length === 0) {
      setErrorNotice('Please select at least one connected account to publish to.');
      return;
    }

    if (!caption.trim() && !mediaFile && !mediaPreview) {
      setErrorNotice('Please provide either a caption or media.');
      return;
    }

    // Instagram check: Instagram requires media!
    const hasInstagram = accounts
      .filter((a) => selectedAccountIds.includes(a.id))
      .some((a) => a.platform === 'instagram');
    if (hasInstagram && !mediaFile && !mediaPreview) {
      setErrorNotice('Instagram requires an image or video to publish.');
      return;
    }

    if (action === 'schedule' && !scheduledDateTime) {
      setErrorNotice('Please pick a date and time for scheduled publishing.');
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedUrl = '';
      let detectedType: MediaType = 'none';

      // 1. Upload media if present
      if (mediaFile) {
        setIsUploading(true);
        setUploadProgress(40);
        const uploadResult = await uploadPostMedia(mediaFile);
        uploadedUrl = uploadResult.mediaUrl;
        detectedType = uploadResult.mediaType;
        setUploadProgress(100);
        setIsUploading(false);
      }

      const matchingTask = tasks.find((t) => t.id === selectedTaskId);

      // 2. If Schedule mode:
      if (action === 'schedule') {
        const isoScheduleTime = new Date(scheduledDateTime).toISOString();
        const post = await createPost(userId, {
          caption,
          mediaUrl: uploadedUrl,
          mediaType: detectedType,
          targetAccountIds: selectedAccountIds,
          status: 'scheduled',
          scheduledFor: isoScheduleTime,
          matchingTaskId: selectedTaskId || undefined,
        });

        if (onPostCreated) onPostCreated(post);
        setSuccessNotice('Post successfully scheduled! The server will publish it at the set time.');
        setTimeout(() => onClose(), 1200);
        return;
      }

      // 3. If Publish Now mode:
      // First save post document
      const createdPost = await createPost(userId, {
        caption,
        mediaUrl: uploadedUrl,
        mediaType: detectedType,
        targetAccountIds: selectedAccountIds,
        status: 'draft',
        matchingTaskId: selectedTaskId || undefined,
      });

      // Call immediate publishing endpoint
      const result = await publishPostNow(userId, createdPost, matchingTask);

      if (result.success) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });

        setSuccessNotice(
          matchingTask
            ? `Post published successfully! Matching task "${matchingTask.title}" has been marked done.`
            : 'Post published successfully to your connected accounts!'
        );

        if (onPostCreated) onPostCreated({ ...createdPost, status: 'published' });
        setTimeout(() => onClose(), 1500);
      } else {
        setErrorNotice(
          `Publishing error: ${result.error || 'Failed to publish post'}. The error has been attached to the matching task.`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Publishing failed';
      setErrorNotice(msg);
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const matchingTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Create &amp; Publish Post
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Publish immediately or schedule to connected accounts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Status Alerts */}
          {errorNotice && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorNotice}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* 1. Account Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                1. Select Target Channels ({selectedAccountIds.length} of {accounts.length})
              </label>
              {accounts.length > 0 && (
                <button
                  type="button"
                  onClick={selectAllAccounts}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  {selectedAccountIds.length === accounts.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {accounts.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                No connected accounts available. Please connect Facebook Pages or Instagram accounts first.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {accounts.map((acc) => {
                  const isSelected = selectedAccountIds.includes(acc.id);
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => toggleAccount(acc.id)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-500'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                      />
                      <PlatformIcon platform={acc.platform} size={16} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          {acc.name}
                        </p>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                          {acc.accountType === 'facebook_page' ? 'Facebook Page' : 'Instagram Professional'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Caption Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                2. Caption &amp; Content
              </label>
              <button
                type="button"
                onClick={handleAIEnhanceCaption}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Write caption with AI
              </button>
            </div>
            <div className="relative">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What would you like to share? Write your caption, hook, and hashtags here..."
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all resize-y"
              />
              <span className="absolute bottom-2.5 right-3 text-[11px] font-mono text-neutral-400">
                {caption.length} chars
              </span>
            </div>
          </div>

          {/* 3. Media Upload */}
          <div>
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block mb-1.5">
              3. Media Attachment (Image or Video)
            </label>

            {mediaPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-black/5 dark:bg-white/5 p-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {mediaType === 'video' ? (
                    <div className="w-16 h-16 rounded-lg bg-neutral-900 flex items-center justify-center text-white">
                      <Video className="w-6 h-6" />
                    </div>
                  ) : (
                    <img
                      src={mediaPreview}
                      alt="Preview"
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <p className="text-xs font-bold text-neutral-900 dark:text-white truncate max-w-xs">
                      {mediaFile?.name || 'Selected media'}
                    </p>
                    <p className="text-[11px] text-neutral-500 capitalize">
                      {mediaType} • {mediaFile ? (mediaFile.size / 1024 / 1024).toFixed(2) : 0} MB
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="p-2 text-neutral-400 hover:text-red-600 transition-colors"
                  title="Remove media"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-neutral-50/50 dark:bg-neutral-800/30 hover:bg-indigo-50/10">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    Upload image or video
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    JPG, PNG, GIF, MP4, MOV up to 50MB (Required for Instagram)
                  </p>
                </div>
              </label>
            )}

            {isUploading && (
              <div className="mt-2">
                <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-[10px] text-neutral-500 mt-1 block">Uploading media...</span>
              </div>
            )}
          </div>

          {/* 4. Link to Planner Task */}
          <div>
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block mb-1.5">
              4. Link Matching Planner Task (Optional)
            </label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No matching task (Standalone post)</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.completed ? '✓ ' : '○ '} [{t.targetDate}] {t.title}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
              When successfully published, this task will be automatically marked as complete. If publishing fails, the error will appear on the task.
            </p>
          </div>

          {/* 5. Schedule vs Publish Mode */}
          <div className="p-4 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/80 space-y-3">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
              5. Publishing Timing
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode('publish_now')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  mode === 'publish_now'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                Publish Now
              </button>
              <button
                type="button"
                onClick={() => setMode('schedule')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  mode === 'schedule'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Schedule for Later
              </button>
            </div>

            {mode === 'schedule' && (
              <div className="pt-2">
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 block mb-1">
                  Select Publishing Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  A server-side scheduled background worker checks every 15s to automatically publish due posts.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 bg-neutral-50/50 dark:bg-neutral-900">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {mode === 'publish_now' ? (
              <button
                type="button"
                onClick={() => handleSubmit('publish_now')}
                disabled={isSubmitting || selectedAccountIds.length === 0}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Publishing...' : 'Publish Now'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit('schedule')}
                disabled={isSubmitting || selectedAccountIds.length === 0}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-purple-500/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                <span>{isSubmitting ? 'Scheduling...' : 'Schedule Post'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
