import { PlatformType } from '../types';

export interface PlatformMeta {
  id: PlatformType;
  name: string;
  shortName: string;
  color: string;
  bgLight: string;
  borderLight: string;
  badgeBg: string;
  iconBg: string;
  defaultTaskTitle: string;
  bestPractice: string;
}

export const PLATFORMS: Record<PlatformType, PlatformMeta> = {
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    shortName: 'FB',
    color: '#1877F2',
    bgLight: 'bg-blue-50 dark:bg-blue-950/40',
    borderLight: 'border-blue-200 dark:border-blue-800',
    badgeBg: 'bg-blue-600 text-white',
    iconBg: 'bg-[#1877F2] text-white',
    defaultTaskTitle: 'Facebook post & story',
    bestPractice: 'Community discussion & reel share',
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    shortName: 'IG',
    color: '#E1306C',
    bgLight: 'bg-pink-50 dark:bg-pink-950/40',
    borderLight: 'border-pink-200 dark:border-pink-800',
    badgeBg: 'bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-white',
    iconBg: 'bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 text-white',
    defaultTaskTitle: 'Instagram reel / carousel',
    bestPractice: 'High visual hook & saveable carousel',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    shortName: 'TT',
    color: '#00F2FE',
    bgLight: 'bg-cyan-50 dark:bg-cyan-950/40',
    borderLight: 'border-cyan-200 dark:border-cyan-800',
    badgeBg: 'bg-slate-900 text-cyan-400 border border-cyan-500/30',
    iconBg: 'bg-black text-cyan-400',
    defaultTaskTitle: 'TikTok video post',
    bestPractice: 'Trending audio & first 3-second hook',
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    shortName: 'YT',
    color: '#FF0000',
    bgLight: 'bg-red-50 dark:bg-red-950/40',
    borderLight: 'border-red-200 dark:border-red-800',
    badgeBg: 'bg-red-600 text-white',
    iconBg: 'bg-[#FF0000] text-white',
    defaultTaskTitle: 'YouTube Short or video',
    bestPractice: 'Compelling thumbnail & pinned comment',
  },
  x: {
    id: 'x',
    name: 'X (Twitter)',
    shortName: 'X',
    color: '#0f1419',
    bgLight: 'bg-neutral-100 dark:bg-neutral-900',
    borderLight: 'border-neutral-300 dark:border-neutral-700',
    badgeBg: 'bg-black text-white dark:bg-neutral-800',
    iconBg: 'bg-black text-white dark:bg-neutral-800',
    defaultTaskTitle: 'X thread / post',
    bestPractice: 'Punchy insight or hot take',
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    shortName: 'LI',
    color: '#0A66C2',
    bgLight: 'bg-sky-50 dark:bg-sky-950/40',
    borderLight: 'border-sky-200 dark:border-sky-800',
    badgeBg: 'bg-[#0A66C2] text-white',
    iconBg: 'bg-[#0A66C2] text-white',
    defaultTaskTitle: 'LinkedIn post / article',
    bestPractice: 'Professional takeaway & PDF slide',
  },
  threads: {
    id: 'threads',
    name: 'Threads',
    shortName: 'TH',
    color: '#101010',
    bgLight: 'bg-purple-50 dark:bg-purple-950/40',
    borderLight: 'border-purple-200 dark:border-purple-800',
    badgeBg: 'bg-neutral-900 text-white dark:bg-neutral-800',
    iconBg: 'bg-neutral-900 text-white',
    defaultTaskTitle: 'Threads update / thought',
    bestPractice: 'Conversation starter question',
  },
};

export const ALL_PLATFORM_KEYS: PlatformType[] = [
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'x',
  'linkedin',
  'threads',
];

export const BRAND_COLORS = [
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Fuchsia', hex: '#D946EF' },
];
