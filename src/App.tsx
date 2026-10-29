import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  loginWithGoogle,
  logoutUser,
  testConnection,
} from './firebase';
import {
  UserProfile,
  PageBrand,
  TaskItem,
  PlatformType,
  WeekStartDay,
  ThemeMode,
  TaskType,
  PriorityType,
  ConnectedAccount,
  PostItem,
  RepeatOption,
  ReminderOffset,
} from './types';
import { getOrCreateUserProfile, updateUserSettings } from './services/userService';
import {
  subscribePages,
  createPage,
  updatePage,
  deletePage,
} from './services/pageService';
import {
  subscribeAllUserTasks,
  ensureDailyTasksForDate,
  ensureDailyTasksForDateRange,
  createTask,
  toggleTaskComplete,
  updateTask,
  deleteTask,
} from './services/taskService';
import { subscribeConnectedAccounts } from './services/accountService';
import { subscribeUserPosts, publishPostNow, deletePost } from './services/postService';
import {
  requestNotificationPermission,
  checkDueReminders,
  getNotificationPermissionStatus,
} from './services/notificationService';
import { buildGoogleCalendarUrl } from './utils/calendarUtils';
import { getTodayDateString, offsetDate, getDateRangeArray } from './utils/dateUtils';
import { Header } from './components/Header';
import { MonthCalendar } from './components/MonthCalendar';
import { TaskList } from './components/TaskList';
import { TaskModal } from './components/TaskModal';
import { PageManager } from './components/PageManagerModal';
import { OnboardingModal } from './components/OnboardingModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthScreen } from './components/AuthScreen';
import { AiAssistantBox } from './components/AiAssistantBox';
import { AiCaptionModal } from './components/AiCaptionModal';
import { ConnectedAccountsView } from './components/ConnectedAccountsView';
import { CreatePostModal } from './components/CreatePostModal';
import { Sparkles, Bell, CalendarPlus, X, Check } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [pages, setPages] = useState<PageBrand[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);

  // Navigation tab: 'planner' | 'calendar' | 'brands' | 'accounts'
  const [activeTab, setActiveTab] = useState<'planner' | 'calendar' | 'brands' | 'accounts'>('planner');

  // Selected date for viewing tasks (defaults to Today)
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [taskModalDefaultDate, setTaskModalDefaultDate] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [captionAiTask, setCaptionAiTask] = useState<TaskItem | null>(null);
  const [isCaptionAiOpen, setIsCaptionAiOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [createPostInitialTask, setCreatePostInitialTask] = useState<TaskItem | null>(null);
  const [activeReminderAlert, setActiveReminderAlert] = useState<TaskItem | null>(null);

  // Connectivity test
  useEffect(() => {
    testConnection();
  }, []);

  // Timezone helper
  const userTimezone = userProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const todayStr = useMemo(() => getTodayDateString(userTimezone), [userTimezone]);

  // Set initial selected date to today when timezone resolves
  useEffect(() => {
    if (!selectedDate && todayStr) {
      setSelectedDate(todayStr);
    }
  }, [todayStr, selectedDate]);

  // Theme synchronization
  useEffect(() => {
    const theme = userProfile?.theme || 'system';
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        // System
        if (mediaQuery.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [userProfile?.theme]);

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await getOrCreateUserProfile(user);
          setUserProfile(profile);
        } catch (err) {
          console.error('Failed to load user profile:', err);
        }
      } else {
        setUserProfile(null);
        setPages([]);
        setTasks([]);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to User Pages
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribePages(currentUser.uid, (loadedPages) => {
      setPages(loadedPages);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Listen to User Tasks
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeAllUserTasks(currentUser.uid, (loadedTasks) => {
      setTasks(loadedTasks);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Listen to User Connected Accounts
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeConnectedAccounts(currentUser.uid, (loadedAccounts) => {
      setAccounts(loadedAccounts);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Listen to User Posts
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeUserPosts(currentUser.uid, (loadedPosts) => {
      setPosts(loadedPosts);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Periodically check server scheduled posts worker to reflect background-published posts on matching tasks
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/posts/scheduled-status?userId=${currentUser.uid}`);
        if (!res.ok) return;
        const data = await res.json();
        const serverItems = data.items || [];

        for (const sItem of serverItems) {
          if ((sItem.status === 'published' || sItem.status === 'failed') && sItem.matchingTaskId) {
            const task = tasks.find((t) => t.id === sItem.matchingTaskId);
            if (task) {
              if (sItem.status === 'published' && !task.completed) {
                await toggleTaskComplete(currentUser.uid, task.id, true);
              } else if (sItem.status === 'failed' && sItem.error && task.error !== sItem.error) {
                await updateTask(currentUser.uid, task.id, { error: sItem.error });
              }
            }
          }
        }
      } catch {
        // Silent background check
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [currentUser, tasks]);

  // Request browser notification permission once (Requirement 3: "Ask for browser notification permission once")
  useEffect(() => {
    if (currentUser && typeof window !== 'undefined' && 'Notification' in window) {
      const prompted = localStorage.getItem('pagepilot_notification_prompted');
      if (!prompted && Notification.permission === 'default') {
        requestNotificationPermission();
      }
    }
  }, [currentUser]);

  // Real-time reminder interval: checks tasks every 15s for due reminders and fires notifications & in-app alerts (Requirement 3)
  useEffect(() => {
    if (!currentUser || tasks.length === 0) return;

    // Run check immediately
    checkDueReminders(tasks, (dueTask) => {
      setActiveReminderAlert(dueTask);
    });

    const reminderInterval = setInterval(() => {
      checkDueReminders(tasks, (dueTask) => {
        setActiveReminderAlert(dueTask);
      });
    }, 15000);

    return () => clearInterval(reminderInterval);
  }, [currentUser, tasks]);

  // Auto-create separate daily task entries for each date (resets every day)
  useEffect(() => {
    if (!currentUser || pages.length === 0 || !todayStr) return;

    // Generate separate entries for today and upcoming 14 days (each date has its own independent entry)
    const upcomingRange = getDateRangeArray(offsetDate(todayStr, -1), offsetDate(todayStr, 14));
    ensureDailyTasksForDateRange(currentUser.uid, upcomingRange, pages, tasks).catch((err) => {
      console.warn('Auto-create daily tasks window notice:', err);
    });
  }, [currentUser, pages, todayStr, tasks]);

  // Sync separate daily task entries for a specific date and its surrounding days
  const handleSyncDailyTasksForDate = useCallback(
    async (dateStr: string) => {
      if (!currentUser || pages.length === 0) return;
      // Sync a multi-day range around the selected date so each date has its own separate entry
      const range = getDateRangeArray(offsetDate(dateStr, -1), offsetDate(dateStr, 3));
      await ensureDailyTasksForDateRange(currentUser.uid, range, pages, tasks);
    },
    [currentUser, pages, tasks]
  );

  // Check if onboarding is needed
  const needsOnboarding = useMemo(() => {
    if (!userProfile) return false;
    return !userProfile.onboardingCompleted;
  }, [userProfile]);

  // Metric for Top of screen (Requirement 5: "Top of screen: '5 tasks left today' with a progress bar")
  const todayTasks = useMemo(() => {
    return tasks.filter((t) => t.targetDate === todayStr);
  }, [tasks, todayStr]);

  const todayTotal = todayTasks.length;
  const todayCompleted = todayTasks.filter((t) => t.completed).length;
  const todayRemaining = todayTotal - todayCompleted;

  // Handlers
  const handleLogin = async () => {
    setLoginError(null);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleOnboardingComplete = async (data: {
    brandName: string;
    category?: string;
    color: string;
    platforms: PlatformType[];
  }) => {
    if (!currentUser) return;

    // 1. Create first page
    const newPage = await createPage(currentUser.uid, {
      name: data.brandName,
      category: data.category,
      color: data.color,
      platforms: data.platforms,
      active: true,
    });

    // 2. Mark onboarding completed in user profile
    await updateUserSettings(currentUser.uid, {
      onboardingCompleted: true,
    });
    setUserProfile((prev) => (prev ? { ...prev, onboardingCompleted: true } : null));

    // 3. Immediately auto-generate tasks for today with the new page!
    await ensureDailyTasksForDate(currentUser.uid, todayStr, [newPage], tasks);
  };

  const handleCreateOrUpdateTask = async (taskData: {
    title: string;
    targetDate: string;
    taskType: TaskType;
    pageId?: string;
    pageName?: string;
    platform?: string;
    notes?: string;
    priority?: PriorityType;
    reminderTime?: string;
    repeatOption?: RepeatOption;
    customRepeatDays?: number[];
    reminderOffset?: ReminderOffset;
  }) => {
    if (!currentUser) return;
    if (editingTask) {
      await updateTask(currentUser.uid, editingTask.id, taskData);
      setEditingTask(null);
    } else {
      const created = await createTask(currentUser.uid, taskData);
      if (taskData.taskType === 'daily' || taskData.repeatOption === 'daily') {
        const upcoming = getDateRangeArray(offsetDate(taskData.targetDate, 1), offsetDate(taskData.targetDate, 14));
        await ensureDailyTasksForDateRange(currentUser.uid, upcoming, pages, [...tasks, created]);
      }
    }
  };

  const handleToggleComplete = async (taskId: string, currentStatus: boolean) => {
    if (!currentUser) return;
    await toggleTaskComplete(currentUser.uid, taskId, !currentStatus);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!currentUser) return;
    if (confirm('Delete this task?')) {
      await deleteTask(currentUser.uid, taskId);
    }
  };

  const handleBatchCreateTasks = async (
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
  ): Promise<TaskItem[]> => {
    if (!currentUser) return [];
    const created: TaskItem[] = [];
    for (const item of newTasks) {
      const res = await createTask(currentUser.uid, item);
      created.push(res);
    }
    return created;
  };

  const handleApplyCaption = async (taskId: string, captionText: string) => {
    if (!currentUser) return;
    await updateTask(currentUser.uid, taskId, { notes: captionText });
  };

  const handleCreatePage = async (data: {
    name: string;
    category?: string;
    color?: string;
    platforms: PlatformType[];
  }) => {
    if (!currentUser) return;
    const newPage = await createPage(currentUser.uid, data);
    // Auto-generate today's tasks for this new page
    await ensureDailyTasksForDate(currentUser.uid, todayStr, [newPage], tasks);
  };

  const handleUpdatePage = async (
    pageId: string,
    updates: Partial<Pick<PageBrand, 'name' | 'category' | 'color' | 'platforms' | 'active'>>
  ) => {
    if (!currentUser) return;
    await updatePage(currentUser.uid, pageId, updates);
  };

  const handleDeletePage = async (pageId: string) => {
    if (!currentUser) return;
    await deletePage(currentUser.uid, pageId);
  };

  const handleUpdateSettings = async (settings: {
    timezone: string;
    weekStartDay: WeekStartDay;
    theme: ThemeMode;
  }) => {
    if (!currentUser) return;
    await updateUserSettings(currentUser.uid, settings);
    setUserProfile((prev) => (prev ? { ...prev, ...settings } : null));
  };

  const openNewTaskModal = (dateToUse?: string) => {
    setEditingTask(null);
    setTaskModalDefaultDate(dateToUse || selectedDate || todayStr);
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: TaskItem) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handlePublishPostDirectly = async (post: PostItem) => {
    if (!currentUser) return;
    const matching = tasks.find((t) => t.id === post.matchingTaskId);
    await publishPostNow(currentUser.uid, post, matching);
  };

  const handleDeletePostDirectly = async (postId: string) => {
    if (!currentUser) return;
    if (confirm('Delete this post?')) {
      await deletePost(currentUser.uid, postId);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 animate-pulse">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
          Loading PagePilot...
        </p>
      </div>
    );
  }

  // Unauthenticated screen
  if (!currentUser) {
    return (
      <AuthScreen
        onLogin={handleLogin}
        isLoggingIn={false}
        loginError={loginError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col transition-colors selection:bg-indigo-500 selection:text-white">
      {/* App Header with Top Banner Metric & Nav */}
      <Header
        userProfile={userProfile}
        todayTotal={todayTotal}
        todayCompleted={todayCompleted}
        todayRemaining={todayRemaining}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          // If switching to calendar or planner, make sure today's tasks exist
          if (pages.length > 0 && tab !== 'accounts') {
            handleSyncDailyTasksForDate(selectedDate || todayStr);
          }
        }}
        onOpenNewTask={() => openNewTaskModal()}
        onOpenCreatePost={() => {
          setCreatePostInitialTask(null);
          setIsCreatePostOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-5 sm:py-8 flex-1 space-y-6">
        {/* Real-time In-App Reminder Due Alert Banner (Requirement 3) */}
        {activeReminderAlert && (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-3.5 sm:p-4 rounded-2xl shadow-xl shadow-amber-500/20 border border-amber-400/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-xs">
                <Bell className="w-5 h-5 text-white animate-bounce" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/30 px-2 py-0.5 rounded-full">
                    Reminder Due Now
                  </span>
                  {activeReminderAlert.reminderTime && (
                    <span className="text-xs font-mono font-bold text-amber-100">
                      {activeReminderAlert.reminderTime}
                    </span>
                  )}
                  {activeReminderAlert.pageName && (
                    <span className="text-xs font-semibold text-amber-100 truncate">
                      • {activeReminderAlert.pageName}
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold truncate mt-0.5">
                  {activeReminderAlert.title}
                </h4>
                {activeReminderAlert.notes && (
                  <p className="text-xs text-amber-100 truncate max-w-md">
                    {activeReminderAlert.notes}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {/* Google Calendar Link (Requirement 4) */}
              <a
                href={buildGoogleCalendarUrl(activeReminderAlert)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-neutral-900 text-xs font-bold hover:bg-amber-50 active:scale-95 transition-all shadow-xs"
                title="Add to Google Calendar"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-blue-600" />
                <span>Google Calendar</span>
              </a>

              {/* Complete Task Button */}
              <button
                onClick={async () => {
                  await handleToggleComplete(activeReminderAlert.id, false);
                  setActiveReminderAlert(null);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all"
                title="Mark Task Done"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>

              {/* Dismiss Button */}
              <button
                onClick={() => setActiveReminderAlert(null)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                title="Dismiss Alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Gemini AI Task Assistant Box */}
        {activeTab !== 'brands' && activeTab !== 'accounts' && (
          <AiAssistantBox
            pages={pages}
            currentDate={selectedDate || todayStr}
            timezone={userTimezone}
            onTasksCreated={(_newTasks, targetDate) => {
              if (targetDate) {
                setSelectedDate(targetDate);
              }
            }}
            onBatchCreateTasks={handleBatchCreateTasks}
          />
        )}

        {activeTab === 'planner' && (
          <div className="space-y-6">
            <TaskList
              selectedDate={selectedDate || todayStr}
              onSelectDate={(newDate) => {
                setSelectedDate(newDate);
                handleSyncDailyTasksForDate(newDate);
              }}
              tasks={tasks}
              pages={pages}
              timezone={userTimezone}
              onToggleComplete={handleToggleComplete}
              onEditTask={openEditTaskModal}
              onDeleteTask={handleDeleteTask}
              onOpenNewTask={openNewTaskModal}
              onSyncDailyTasksForDate={handleSyncDailyTasksForDate}
              onOpenCaptionAi={(task) => {
                setCaptionAiTask(task);
                setIsCaptionAiOpen(true);
              }}
              onOpenCreatePost={(task) => {
                setCreatePostInitialTask(task || null);
                setIsCreatePostOpen(true);
              }}
            />
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <MonthCalendar
              selectedDate={selectedDate || todayStr}
              onSelectDate={(newDate) => {
                setSelectedDate(newDate);
                handleSyncDailyTasksForDate(newDate);
              }}
              tasks={tasks}
              weekStartDay={userProfile?.weekStartDay ?? 0}
              timezone={userTimezone}
            />

            {/* Below calendar: preview of selected day's tasks */}
            <div className="pt-2">
              <TaskList
                selectedDate={selectedDate || todayStr}
                onSelectDate={(newDate) => {
                  setSelectedDate(newDate);
                  handleSyncDailyTasksForDate(newDate);
                }}
                tasks={tasks}
                pages={pages}
                timezone={userTimezone}
                onToggleComplete={handleToggleComplete}
                onEditTask={openEditTaskModal}
                onDeleteTask={handleDeleteTask}
                onOpenNewTask={openNewTaskModal}
                onSyncDailyTasksForDate={handleSyncDailyTasksForDate}
                onOpenCaptionAi={(task) => {
                  setCaptionAiTask(task);
                  setIsCaptionAiOpen(true);
                }}
                onOpenCreatePost={(task) => {
                  setCreatePostInitialTask(task || null);
                  setIsCreatePostOpen(true);
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'brands' && (
          <PageManager
            pages={pages}
            onCreatePage={handleCreatePage}
            onUpdatePage={handleUpdatePage}
            onDeletePage={handleDeletePage}
          />
        )}

        {activeTab === 'accounts' && currentUser && (
          <ConnectedAccountsView
            userId={currentUser.uid}
            accounts={accounts}
            posts={posts}
            onOpenCreatePost={() => {
              setCreatePostInitialTask(null);
              setIsCreatePostOpen(true);
            }}
            onPublishPostNow={handlePublishPostDirectly}
            onDeletePost={handleDeletePostDirectly}
          />
        )}
      </main>

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleCreateOrUpdateTask}
        editingTask={editingTask}
        defaultDate={taskModalDefaultDate || selectedDate || todayStr}
        pages={pages}
        timezone={userTimezone}
      />

      <AiCaptionModal
        task={captionAiTask}
        isOpen={isCaptionAiOpen}
        onClose={() => {
          setIsCaptionAiOpen(false);
          setCaptionAiTask(null);
        }}
        onApplyCaption={handleApplyCaption}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userProfile={userProfile}
        onUpdateSettings={handleUpdateSettings}
      />

      {currentUser && (
        <CreatePostModal
          isOpen={isCreatePostOpen}
          onClose={() => {
            setIsCreatePostOpen(false);
            setCreatePostInitialTask(null);
          }}
          userId={currentUser.uid}
          accounts={accounts}
          tasks={tasks}
          initialTask={createPostInitialTask}
          onPostCreated={() => {
            // Updated automatically via firestore onSnapshot
          }}
        />
      )}

      {/* Guided Onboarding Modal for New Users (Requirement 1) */}
      {needsOnboarding && (
        <OnboardingModal
          userName={userProfile?.displayName}
          onComplete={handleOnboardingComplete}
        />
      )}
    </div>
  );
}
