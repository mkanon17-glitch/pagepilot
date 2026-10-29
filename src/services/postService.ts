import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { PostItem, TaskItem, MediaType, PostStatus } from '../types';

export function subscribeUserPosts(
  userId: string,
  onUpdate: (posts: PostItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  const postsPath = `users/${userId}/posts`;
  const postsRef = collection(db, 'users', userId, 'posts');
  const q = query(postsRef);

  return onSnapshot(
    q,
    (snapshot) => {
      const list: PostItem[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as PostItem);
      });
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onUpdate(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, postsPath);
    }
  );
}

/**
 * Upload image or video to server / Firebase Storage
 */
export async function uploadPostMedia(file: File): Promise<{
  mediaUrl: string;
  mediaType: MediaType;
}> {
  const isVideo = file.type.startsWith('video/');
  const mediaType: MediaType = isVideo ? 'video' : 'image';

  const formData = new FormData();
  formData.append('media', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to upload media');
  }

  const result = await res.json();
  return {
    mediaUrl: result.url,
    mediaType,
  };
}

/**
 * Create or schedule a post
 */
export async function createPost(
  userId: string,
  data: {
    caption: string;
    mediaUrl?: string;
    mediaType?: MediaType;
    targetAccountIds: string[];
    status: PostStatus;
    scheduledFor?: string;
    matchingTaskId?: string;
  }
): Promise<PostItem> {
  const postId = `post_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const postRef = doc(db, 'users', userId, 'posts', postId);
  const path = `users/${userId}/posts/${postId}`;
  const now = new Date().toISOString();

  const newPost: PostItem = {
    id: postId,
    userId,
    caption: data.caption.trim(),
    mediaUrl: data.mediaUrl || '',
    mediaType: data.mediaType || 'none',
    targetAccountIds: data.targetAccountIds,
    status: data.status,
    scheduledFor: data.scheduledFor,
    matchingTaskId: data.matchingTaskId || '',
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(postRef, newPost);

    // If scheduled, register with server-side scheduler
    if (data.status === 'scheduled') {
      await fetch('/api/posts/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, post: newPost }),
      }).catch((e) => console.warn('Server schedule registration:', e));
    }

    return newPost;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Publish a post immediately to selected accounts
 * If successful, marks the matching task as done; if failed, shows error on task!
 */
export async function publishPostNow(
  userId: string,
  post: PostItem,
  matchingTask?: TaskItem | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/posts/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        post,
        matchingTaskId: matchingTask?.id || post.matchingTaskId,
      }),
    });

    const result = await res.json();
    const now = new Date().toISOString();
    const postRef = doc(db, 'users', userId, 'posts', post.id);

    if (result.success) {
      // 1. Update post to published
      await updateDoc(postRef, {
        status: 'published',
        publishedAt: now,
        error: null,
        updatedAt: now,
      });

      // 2. Mark matching task as done
      const taskIdToUpdate = matchingTask?.id || post.matchingTaskId;
      if (taskIdToUpdate) {
        const taskRef = doc(db, 'users', userId, 'tasks', taskIdToUpdate);
        await updateDoc(taskRef, {
          completed: true,
          completedAt: now,
          error: null,
          updatedAt: now,
        }).catch((err) => console.warn('Failed to update task status:', err));
      }

      return { success: true };
    } else {
      const errorMsg = result.error || 'Failed to publish post to connected accounts';

      // 1. Update post status to failed
      await updateDoc(postRef, {
        status: 'failed',
        error: errorMsg,
        updatedAt: now,
      });

      // 2. Show error on the task
      const taskIdToUpdate = matchingTask?.id || post.matchingTaskId;
      if (taskIdToUpdate) {
        const taskRef = doc(db, 'users', userId, 'tasks', taskIdToUpdate);
        await updateDoc(taskRef, {
          error: errorMsg,
          updatedAt: now,
        }).catch((err) => console.warn('Failed to update task error:', err));
      }

      return { success: false, error: errorMsg };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Publish network error';
    return { success: false, error: errorMsg };
  }
}

export async function deletePost(userId: string, postId: string): Promise<void> {
  const postRef = doc(db, 'users', userId, 'posts', postId);
  const path = `users/${userId}/posts/${postId}`;

  try {
    await deleteDoc(postRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
