import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { type User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, WeekStartDay, ThemeMode } from '../types';

export async function getOrCreateUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const path = `users/${user.uid}`;

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }

    // Auto-detect browser timezone
    const autoTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const now = new Date().toISOString();

    const newProfile: UserProfile = {
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'Creator',
      photoURL: user.photoURL || '',
      timezone: autoTimezone,
      weekStartDay: 0, // Default Sunday
      theme: 'system',
      onboardingCompleted: false,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(userRef, newProfile);
    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateUserSettings(
  userId: string,
  settings: Partial<Pick<UserProfile, 'timezone' | 'weekStartDay' | 'theme' | 'onboardingCompleted' | 'displayName'>>
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const path = `users/${userId}`;

  try {
    const payload = {
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(userRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
