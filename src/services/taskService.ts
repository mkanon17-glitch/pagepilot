import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { TaskItem, PageBrand, PlatformType, TaskType, PriorityType, RepeatOption, ReminderOffset } from '../types';
import { PLATFORMS } from '../utils/platformConfig';

export function subscribeAllUserTasks(
  userId: string,
  onUpdate: (tasks: TaskItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const tasksPath = `users/${userId}/tasks`;
  const tasksRef = collection(db, 'users', userId, 'tasks');
  const q = query(tasksRef);

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const tasks: TaskItem[] = [];
      snapshot.forEach((docSnap) => {
        tasks.push(docSnap.data() as TaskItem);
      });
      // Sort tasks: pending first, then by priority, then creation
      tasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.title.localeCompare(b.title);
      });
      onUpdate(tasks);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, tasksPath);
    }
  );

  return unsubscribe;
}

/**
 * Auto-create a separate daily task entry for each date in the specified range.
 * Each date receives its own independent document in Firestore (with completed: false).
 * Ticking a task today will NEVER mark tomorrow's task as done.
 */
export async function ensureDailyTasksForDateRange(
  userId: string,
  dates: string[],
  pages: PageBrand[],
  existingTasks: TaskItem[]
): Promise<number> {
  const activePages = pages.filter((p) => p.active);
  if (activePages.length === 0 && !existingTasks.some((t) => t.taskType === 'daily')) {
    return 0;
  }

  const now = new Date().toISOString();
  const tasksToCreate: TaskItem[] = [];

  // Build lookup index of existing task IDs and composite keys for fast collision avoidance
  const existingSet = new Set<string>();
  for (const t of existingTasks) {
    if (t.id) existingSet.add(t.id);
    if (t.targetDate && t.pageId && t.platform) {
      existingSet.add(`${t.targetDate}__${t.pageId}__${t.platform}`);
    }
    if (t.targetDate && t.taskType === 'daily' && !t.pageId) {
      existingSet.add(`${t.targetDate}__custom__${t.title.toLowerCase().trim()}`);
    }
  }

  // Find any custom daily templates created by the user
  const customDailyTemplates = new Map<string, TaskItem>();
  for (const t of existingTasks) {
    if (t.taskType === 'daily' && (!t.pageId || t.pageId === '')) {
      const normTitle = t.title.toLowerCase().trim();
      if (!customDailyTemplates.has(normTitle)) {
        customDailyTemplates.set(normTitle, t);
      }
    }
  }

  for (const dateStr of dates) {
    const dateCompact = dateStr.replace(/-/g, '');

    // 1. Generate separate entry for each active Brand × Platform on this date
    for (const page of activePages) {
      for (const platform of page.platforms) {
        const safePageKey = page.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
        const taskId = `d_${safePageKey}_${platform}_${dateCompact}`;
        const compositeKey = `${dateStr}__${page.id}__${platform}`;

        if (!existingSet.has(taskId) && !existingSet.has(compositeKey)) {
          existingSet.add(taskId);
          existingSet.add(compositeKey);

          const platformMeta = PLATFORMS[platform as PlatformType];
          const platformLabel = platformMeta ? platformMeta.name : platform;
          const taskTitle = `${page.name} — ${platformLabel} post`;

          tasksToCreate.push({
            id: taskId,
            userId,
            title: taskTitle,
            pageId: page.id,
            pageName: page.name,
            platform,
            taskType: 'daily',
            targetDate: dateStr,
            completed: false, // Freshly reset for this specific date
            completedAt: null,
            notes: '',
            priority: 'medium',
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    }

    // 2. Generate separate entry for any custom daily tasks on this date
    for (const [normTitle, template] of customDailyTemplates.entries()) {
      const safeSlug = normTitle.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'task';
      const taskId = `dc_${safeSlug}_${dateCompact}`;
      const compositeKey = `${dateStr}__custom__${normTitle}`;

      if (!existingSet.has(taskId) && !existingSet.has(compositeKey)) {
        existingSet.add(taskId);
        existingSet.add(compositeKey);

        tasksToCreate.push({
          id: taskId,
          userId,
          title: template.title,
          pageId: template.pageId || '',
          pageName: template.pageName || '',
          platform: template.platform || 'general',
          taskType: 'daily',
          targetDate: dateStr,
          completed: false, // Freshly reset for this specific date
          completedAt: null,
          notes: template.notes || '',
          priority: template.priority || 'medium',
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  if (tasksToCreate.length === 0) {
    return 0;
  }

  // Commit in chunks of up to 400 to respect Firestore batch limits (max 500)
  const CHUNK_SIZE = 400;
  try {
    for (let i = 0; i < tasksToCreate.length; i += CHUNK_SIZE) {
      const chunk = tasksToCreate.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const task of chunk) {
        const taskRef = doc(db, 'users', userId, 'tasks', task.id);
        batch.set(taskRef, task);
      }
      await batch.commit();
    }
    return tasksToCreate.length;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/tasks`);
  }
}

/**
 * Auto-create a separate daily task for every active page × platform for the specified dateStr.
 */
export async function ensureDailyTasksForDate(
  userId: string,
  dateStr: string,
  pages: PageBrand[],
  existingTasks: TaskItem[]
): Promise<number> {
  return ensureDailyTasksForDateRange(userId, [dateStr], pages, existingTasks);
}

export async function createTask(
  userId: string,
  data: {
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
  }
): Promise<TaskItem> {
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const taskId = `c_${Date.now().toString(36)}_${randomSuffix}`;
  const taskRef = doc(db, 'users', userId, 'tasks', taskId);
  const path = `users/${userId}/tasks/${taskId}`;
  const now = new Date().toISOString();

  const newTask: TaskItem = {
    id: taskId,
    userId,
    title: data.title.trim(),
    pageId: data.pageId || '',
    pageName: data.pageName || '',
    platform: data.platform || 'general',
    taskType: data.taskType,
    targetDate: data.targetDate,
    completed: false,
    completedAt: null,
    notes: data.notes?.trim() || '',
    priority: data.priority || 'medium',
    reminderTime: data.reminderTime || undefined,
    repeatOption: data.repeatOption || 'none',
    customRepeatDays: data.customRepeatDays || undefined,
    reminderOffset: data.reminderOffset || 'at_time',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(taskRef, newTask);
    return newTask;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleTaskComplete(
  userId: string,
  taskId: string,
  completed: boolean
): Promise<void> {
  const taskRef = doc(db, 'users', userId, 'tasks', taskId);
  const path = `users/${userId}/tasks/${taskId}`;
  const now = new Date().toISOString();

  try {
    await updateDoc(taskRef, {
      completed,
      completedAt: completed ? now : null,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateTask(
  userId: string,
  taskId: string,
  updates: Partial<Pick<TaskItem, 'title' | 'targetDate' | 'taskType' | 'pageId' | 'pageName' | 'platform' | 'notes' | 'priority' | 'completed' | 'error' | 'reminderTime' | 'repeatOption' | 'customRepeatDays' | 'reminderOffset'>>
): Promise<void> {
  const taskRef = doc(db, 'users', userId, 'tasks', taskId);
  const path = `users/${userId}/tasks/${taskId}`;
  const now = new Date().toISOString();

  try {
    const payload: Record<string, unknown> = {
      ...updates,
      updatedAt: now,
    };
    if (updates.completed !== undefined) {
      payload.completedAt = updates.completed ? now : null;
    }
    await updateDoc(taskRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const taskRef = doc(db, 'users', userId, 'tasks', taskId);
  const path = `users/${userId}/tasks/${taskId}`;

  try {
    await deleteDoc(taskRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
