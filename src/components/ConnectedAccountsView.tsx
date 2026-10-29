import React, { useState, useEffect } from 'react';
import {
  Share2,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Send,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { ConnectedAccount, PostItem, ConnectedPlatform } from '../types';
import { PlatformIcon } from './PlatformIcon';
import {
  saveConnectedAccount,
  deleteConnectedAccount,
  connectDemoAccount,
} from '../services/accountService';

interface ConnectedAccountsViewProps {
  userId: string;
  accounts: ConnectedAccount[];
  posts: PostItem[];
  onOpenCreatePost: () => void;
  onPublishPostNow: (post: PostItem) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
}

export const ConnectedAccountsView: React.FC<ConnectedAccountsViewProps> = ({
  userId,
  accounts,
  posts,
  onOpenCreatePost,
  onPublishPostNow,
  onDeletePost,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const exactCallbackUrl = 'https://ais-dev-mde5vxol2mrvggf5uin5l2-543045758961.europe-west3.run.app/api/auth/facebook/callback';

  // Listen for OAuth popup postMessage
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'FB_AUTH_SUCCESS') {
        const retrievedAccounts = event.data.accounts || [];
        if (retrievedAccounts.length === 0) {
          setNotice({
            type: 'info',
            message: 'Facebook login succeeded, but no managed Facebook Pages or Instagram business accounts were found on this Facebook account.',
          });
          return;
        }

        try {
          for (const acc of retrievedAccounts) {
            await saveConnectedAccount(userId, {
              id: acc.id,
              platform: acc.platform,
              accountType: acc.accountType,
              name: acc.name,
              pageId: acc.pageId,
              instagramId: acc.instagramId,
              pictureUrl: acc.pictureUrl,
              status: 'active',
            });
          }
          setNotice({
            type: 'success',
            message: `Successfully connected ${retrievedAccounts.length} account${retrievedAccounts.length > 1 ? 's' : ''}!`,
          });
        } catch (err: unknown) {
          setNotice({
            type: 'error',
            message: err instanceof Error ? err.message : 'Failed to save connected accounts',
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [userId]);

  const handleConnectFacebook = async () => {
    setIsConnecting(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/auth/facebook/url?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();

      if (!data.configured) {
        setNotice({
          type: 'info',
          message: 'To connect real Meta accounts, add your FB_APP_ID & FB_APP_SECRET to .env. In the meantime, use "Add Demo Account" below to test the full publishing & scheduling engine instantly!',
        });
        setIsConnecting(false);
        return;
      }

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        data.url,
        'FacebookLoginPopup',
        `width=${width},height=${height},left=${left},top=${top},status=0,menubar=0`
      );

      if (!popup) {
        setNotice({
          type: 'error',
          message: 'Popup blocked by browser. Please allow popups for this site to complete Facebook Login.',
        });
      }
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to initiate Facebook Login',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAddDemoAccount = async (platform: ConnectedPlatform) => {
    try {
      const defaultName =
        platform === 'facebook'
          ? 'Acme Brand Official Page'
          : '@acmebrand_creators';
      await connectDemoAccount(userId, platform, defaultName);
      setNotice({
        type: 'success',
        message: `Connected demo ${platform === 'facebook' ? 'Facebook Page' : 'Instagram account'}! You can now publish and schedule posts immediately.`,
      });
    } catch (err: unknown) {
      setNotice({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to create demo account',
      });
    }
  };

  const handleDeleteAccount = async (account: ConnectedAccount) => {
    if (confirm(`Disconnect ${account.name}? Any scheduled posts for this account will stop publishing.`)) {
      try {
        await deleteConnectedAccount(userId, account.id);
        setNotice({
          type: 'success',
          message: `Disconnected ${account.name}`,
        });
      } catch (err: unknown) {
        setNotice({
          type: 'error',
          message: err instanceof Error ? err.message : 'Failed to disconnect account',
        });
      }
    }
  };

  const handleCopyCallback = () => {
    navigator.clipboard.writeText(exactCallbackUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handlePublishNow = async (post: PostItem) => {
    setPublishingId(post.id);
    try {
      await onPublishPostNow(post);
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Share2 className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Publishing Channels
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">
            Connected Accounts
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Connect Facebook Pages & Instagram accounts via Facebook Login to publish and schedule posts.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onOpenCreatePost}
            disabled={accounts.length === 0}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all ${
              accounts.length > 0
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white active:scale-95 shadow-indigo-500/20'
                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Create Post
          </button>
        </div>
      </div>

      {/* Notifications Banner */}
      {notice && (
        <div
          className={`p-4 rounded-xl flex items-start justify-between gap-3 text-xs sm:text-sm border transition-all ${
            notice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : notice.type === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {notice.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {notice.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
            {notice.type === 'info' && <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}
            <div>
              <p className="font-semibold">{notice.message}</p>
            </div>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-xs font-semibold opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Connect Buttons Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Facebook Login Primary Connect Card */}
        <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 dark:from-blue-950/30 dark:to-purple-950/20 p-5 rounded-2xl border border-blue-200/60 dark:border-blue-900/40 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <PlatformIcon platform="facebook" size={20} />
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                Meta Graph API
              </span>
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Connect with Facebook Login
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
              Connects Facebook Pages and linked Instagram professional accounts with permissions:
              <span className="font-mono text-[11px] block mt-1 text-neutral-500 dark:text-neutral-400">
                pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish
              </span>
            </p>
          </div>

          <button
            onClick={handleConnectFacebook}
            disabled={isConnecting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
          >
            <PlatformIcon platform="facebook" size={16} />
            <span>{isConnecting ? 'Connecting...' : 'Connect Facebook & Instagram'}</span>
          </button>
        </div>

        {/* Demo Sandbox Testing Card */}
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                Instant Sandbox
              </span>
              <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                Test Accounts
              </span>
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Simulated Publishing Sandbox
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
              Test creating posts, uploading media, immediate publishing, scheduling worker, and task auto-completion instantly without configuring a Meta Developer App.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAddDemoAccount('facebook')}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-all"
            >
              <PlatformIcon platform="facebook" size={14} />
              <span>+ Demo Page</span>
            </button>
            <button
              onClick={() => handleAddDemoAccount('instagram')}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-all"
            >
              <PlatformIcon platform="instagram" size={14} />
              <span>+ Demo Instagram</span>
            </button>
          </div>
        </div>
      </div>

      {/* Meta App Setup Guide Card (shows callback URL) */}
      <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-2xl p-4 sm:p-5 border border-neutral-200 dark:border-neutral-800 text-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="font-bold text-neutral-900 dark:text-white">
              Meta App OAuth Configuration Details
            </h4>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
            For Live Facebook Login
          </span>
        </div>
        <p className="text-neutral-600 dark:text-neutral-400">
          In your Meta Developer Dashboard (<a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 underline">developers.facebook.com</a>), navigate to <strong>Facebook Login &gt; Settings</strong> and add this exact Valid OAuth Redirect URI:
        </p>
        <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 font-mono text-[11px] sm:text-xs text-neutral-800 dark:text-neutral-200 break-all select-all">
          <span className="flex-1">{exactCallbackUrl}</span>
          <button
            onClick={handleCopyCallback}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-sans font-semibold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>• Access tokens are kept server-side only in <code className="font-mono bg-neutral-200/70 dark:bg-neutral-800 px-1 rounded">server_tokens.json</code></span>
          <span>• Client Firestore rules strictly restrict access to user's accounts</span>
        </div>
      </div>

      {/* Connected Accounts List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
            <span>Your Connected Channels</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              {accounts.length}
            </span>
          </h3>
        </div>

        {accounts.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8 border border-neutral-200 dark:border-neutral-800 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-3">
              <Share2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-neutral-900 dark:text-white">
              No accounts connected yet
            </h4>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mt-1">
              Connect your Facebook Pages or Instagram business accounts above, or add a demo account to start creating and publishing posts.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => handleAddDemoAccount('facebook')}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Demo Account
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {accounts.map((acc) => {
              const isFb = acc.platform === 'facebook';
              return (
                <div
                  key={acc.id}
                  className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-xs transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      {acc.pictureUrl ? (
                        <img
                          src={acc.pictureUrl}
                          alt={acc.name}
                          className="w-11 h-11 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                          <PlatformIcon platform={acc.platform} size={22} />
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white dark:bg-neutral-900 shadow-xs">
                        <PlatformIcon platform={acc.platform} size={14} />
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                          {acc.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                          {acc.accountType === 'facebook_page' ? 'Facebook Page' : 'Instagram Professional'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteAccount(acc)}
                    className="p-2 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
                    title="Disconnect account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Posts & Scheduled Queue Section */}
      <div className="space-y-3 pt-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
              Posts &amp; Publishing History
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Posts published or scheduled by the server worker
            </p>
          </div>
          <button
            onClick={onOpenCreatePost}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New Post
          </button>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 text-center text-xs text-neutral-500 dark:text-neutral-400">
            No posts created yet. Click "Create Post" to publish or schedule your first post.
          </div>
        ) : (
          <div className="space-y-2.5">
            {posts.map((post) => {
              const isScheduled = post.status === 'scheduled';
              const isPublished = post.status === 'published';
              const isFailed = post.status === 'failed';

              return (
                <div
                  key={post.id}
                  className={`bg-white dark:bg-neutral-900 rounded-2xl p-4 border transition-all shadow-xs ${
                    isFailed
                      ? 'border-red-300 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/20'
                      : isPublished
                      ? 'border-emerald-200 dark:border-emerald-900/40'
                      : 'border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Media thumbnail if exists */}
                      {post.mediaUrl && (
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shrink-0 border border-neutral-200 dark:border-neutral-700">
                          {post.mediaType === 'video' ? (
                            <video
                              src={post.mediaUrl}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <img
                              src={post.mediaUrl}
                              alt="Media"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {/* Status badge */}
                          {isPublished && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" /> Published
                            </span>
                          )}
                          {isScheduled && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                              <Clock className="w-3 h-3" /> Scheduled
                            </span>
                          )}
                          {isFailed && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                              <AlertCircle className="w-3 h-3" /> Failed
                            </span>
                          )}

                          {/* Target accounts count */}
                          <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                            to {post.targetAccountIds.length} account{post.targetAccountIds.length > 1 ? 's' : ''}
                          </span>

                          {/* Time details */}
                          {post.scheduledFor && isScheduled && (
                            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                              Due: {new Date(post.scheduledFor).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          )}
                          {post.publishedAt && isPublished && (
                            <span className="text-[11px] text-neutral-400">
                              Published: {new Date(post.publishedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 line-clamp-2 leading-snug">
                          {post.caption || '(No caption)'}
                        </p>

                        {/* Error message display */}
                        {isFailed && post.error && (
                          <div className="mt-2 p-2 rounded-lg bg-red-100/70 dark:bg-red-950/80 text-red-700 dark:text-red-300 text-xs font-medium flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{post.error}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {(isScheduled || isFailed) && (
                        <button
                          onClick={() => handlePublishNow(post)}
                          disabled={publishingId === post.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-xs font-semibold transition-all active:scale-95"
                          title="Publish now immediately"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${publishingId === post.id ? 'animate-spin' : ''}`} />
                          <span className="hidden sm:inline">Publish Now</span>
                        </button>
                      )}
                      <button
                        onClick={() => onDeletePost(post.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg transition-colors"
                        title="Delete post"
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
      </div>
    </div>
  );
};
