import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ConnectedAccount, ConnectedPlatform, ConnectedAccountType } from '../types';

export function subscribeConnectedAccounts(
  userId: string,
  onUpdate: (accounts: ConnectedAccount[]) => void,
  onError?: (err: Error) => void
): () => void {
  const accountsPath = `users/${userId}/accounts`;
  const accountsRef = collection(db, 'users', userId, 'accounts');
  const q = query(accountsRef);

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ConnectedAccount[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as ConnectedAccount);
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      onUpdate(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, accountsPath);
    }
  );
}

export async function saveConnectedAccount(
  userId: string,
  account: Omit<ConnectedAccount, 'userId' | 'connectedAt' | 'updatedAt'>
): Promise<ConnectedAccount> {
  const accountRef = doc(db, 'users', userId, 'accounts', account.id);
  const path = `users/${userId}/accounts/${account.id}`;
  const now = new Date().toISOString();

  const fullAccount: ConnectedAccount = {
    ...account,
    userId,
    connectedAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(accountRef, fullAccount);
    return fullAccount;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteConnectedAccount(
  userId: string,
  accountId: string
): Promise<void> {
  const accountRef = doc(db, 'users', userId, 'accounts', accountId);
  const path = `users/${userId}/accounts/${accountId}`;

  try {
    // Notify server to remove tokens
    await fetch(`/api/auth/accounts/${accountId}?userId=${userId}`, {
      method: 'DELETE',
    }).catch(() => {});

    await deleteDoc(accountRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Connect Demo Account for immediate testing when real Facebook App ID is not yet configured
 */
export async function connectDemoAccount(
  userId: string,
  platform: ConnectedPlatform,
  name: string
): Promise<ConnectedAccount> {
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const pageId = `page_${randomSuffix}`;
  const id = `${platform === 'facebook' ? 'fb' : 'ig'}_${pageId}`;
  const accountType: ConnectedAccountType =
    platform === 'facebook' ? 'facebook_page' : 'instagram_business';

  const newAccount: ConnectedAccount = {
    id,
    userId,
    platform,
    accountType,
    name,
    pageId,
    instagramId: platform === 'instagram' ? `ig_${randomSuffix}` : undefined,
    pictureUrl:
      platform === 'facebook'
        ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&h=100&fit=crop'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    status: 'active',
    connectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const accountRef = doc(db, 'users', userId, 'accounts', id);
  await setDoc(accountRef, newAccount);

  // Notify server to create mock token
  await fetch('/api/auth/facebook/demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, account: newAccount }),
  }).catch(() => {});

  return newAccount;
}
