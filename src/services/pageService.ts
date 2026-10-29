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
import { PageBrand, PlatformType } from '../types';

export function subscribePages(
  userId: string,
  onUpdate: (pages: PageBrand[]) => void,
  onError?: (err: Error) => void
): () => void {
  const pagesPath = `users/${userId}/pages`;
  const pagesRef = collection(db, 'users', userId, 'pages');
  const q = query(pagesRef);

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const pages: PageBrand[] = [];
      snapshot.forEach((docSnap) => {
        pages.push(docSnap.data() as PageBrand);
      });
      // Sort by creation or name
      pages.sort((a, b) => a.name.localeCompare(b.name));
      onUpdate(pages);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, pagesPath);
    }
  );

  return unsubscribe;
}

export async function createPage(
  userId: string,
  data: {
    name: string;
    category?: string;
    color?: string;
    platforms: PlatformType[];
    active?: boolean;
  }
): Promise<PageBrand> {
  // Generate safe alphanumeric ID
  const cleanName = data.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'page';
  const pageId = `p_${cleanName}_${Date.now().toString(36)}`;
  const pageRef = doc(db, 'users', userId, 'pages', pageId);
  const path = `users/${userId}/pages/${pageId}`;
  const now = new Date().toISOString();

  const newPage: PageBrand = {
    id: pageId,
    userId,
    name: data.name.trim(),
    category: data.category?.trim() || '',
    color: data.color || '#6366F1',
    platforms: data.platforms,
    active: data.active !== undefined ? data.active : true,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(pageRef, newPage);
    return newPage;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updatePage(
  userId: string,
  pageId: string,
  updates: Partial<Pick<PageBrand, 'name' | 'category' | 'color' | 'platforms' | 'active'>>
): Promise<void> {
  const pageRef = doc(db, 'users', userId, 'pages', pageId);
  const path = `users/${userId}/pages/${pageId}`;

  try {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(pageRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePage(userId: string, pageId: string): Promise<void> {
  const pageRef = doc(db, 'users', userId, 'pages', pageId);
  const path = `users/${userId}/pages/${pageId}`;

  try {
    await deleteDoc(pageRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
