export type PlatformType =
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'x'
  | 'linkedin'
  | 'threads';

export type TaskType = 'daily' | 'one_time';
export type PriorityType = 'low' | 'medium' | 'high';
export type WeekStartDay = 0 | 1 | 6; // 0 = Sun, 1 = Mon, 6 = Sat
export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  timezone: string;
  weekStartDay: WeekStartDay;
  theme: ThemeMode;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PageBrand {
  id: string;
  userId: string;
  name: string;
  category?: string;
  color?: string;
  platforms: PlatformType[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RepeatOption = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type ReminderOffset = 'at_time' | '5_min' | '15_min' | '30_min' | '1_hour' | '1_day';

export interface TaskItem {
  id: string;
  userId: string;
  title: string;
  pageId?: string;
  pageName?: string;
  platform?: PlatformType | string;
  taskType: TaskType;
  targetDate: string; // YYYY-MM-DD
  completed: boolean;
  completedAt?: string | null;
  notes?: string;
  priority?: PriorityType;
  error?: string; // Publishing failure error
  reminderTime?: string; // HH:mm format, e.g. "09:30"
  repeatOption?: RepeatOption;
  customRepeatDays?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  reminderOffset?: ReminderOffset;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarDayStats {
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
  status: 'empty' | 'partial' | 'completed'; // partial = yellow, completed = green
  hasReminders?: boolean;
  reminderCount?: number;
}

export type ConnectedPlatform = 'facebook' | 'instagram';
export type ConnectedAccountType = 'facebook_page' | 'instagram_business';

export interface ConnectedAccount {
  id: string;
  userId: string;
  platform: ConnectedPlatform;
  accountType: ConnectedAccountType;
  name: string;
  pageId: string;
  instagramId?: string;
  pictureUrl?: string;
  status: 'active' | 'expired';
  connectedAt: string;
  updatedAt: string;
}

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';
export type MediaType = 'image' | 'video' | 'none';

export interface PostItem {
  id: string;
  userId: string;
  caption: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  targetAccountIds: string[];
  status: PostStatus;
  scheduledFor?: string; // ISO datetime string
  publishedAt?: string;
  error?: string;
  matchingTaskId?: string;
  createdAt: string;
  updatedAt: string;
}
