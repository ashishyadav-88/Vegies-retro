import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserProfile } from '../types';
import { ADMIN_EMAIL } from './bookingService';

const USERS_MASTER_STORAGE_KEY = 'vegies_restro_admin_all_users';

/**
 * Get all cached user profiles from local master storage
 */
export const getAdminMasterUsers = (): UserProfile[] => {
  try {
    const raw = localStorage.getItem(USERS_MASTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading admin users cache:', e);
  }
  return [];
};

/**
 * Save user profile into local master cache (for fast offline fallback & synchronization)
 */
export const saveAdminMasterUser = (profile: UserProfile): void => {
  try {
    const current = getAdminMasterUsers();
    const existingIndex = current.findIndex((u) => u.uid === profile.uid || (u.email && profile.email && u.email.toLowerCase() === profile.email.toLowerCase()));

    let updated: UserProfile[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = { ...updated[existingIndex], ...profile, updatedAt: new Date().toISOString() };
    } else {
      updated = [profile, ...current];
    }

    localStorage.setItem(USERS_MASTER_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error saving to admin users cache:', e);
  }
};

/**
 * Clean & sanitize user profile data for Firestore insertion
 */
export const sanitizeUserProfile = (profile: Partial<UserProfile>): Record<string, any> => {
  const clean: Record<string, any> = {};

  if (profile.uid) clean.uid = String(profile.uid).trim();
  if (profile.email) clean.email = String(profile.email).trim().toLowerCase();
  if (profile.displayName) clean.displayName = String(profile.displayName).trim();
  if (profile.phoneNumber !== undefined) clean.phoneNumber = String(profile.phoneNumber || '').trim();
  if (profile.photoURL !== undefined) clean.photoURL = String(profile.photoURL || '').trim();
  
  const isAdmin = (profile.email && profile.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) || profile.role === 'admin';
  clean.role = isAdmin ? 'admin' : 'customer';

  clean.createdAt = profile.createdAt || new Date().toISOString();
  clean.updatedAt = new Date().toISOString();
  clean.lastLoginAt = profile.lastLoginAt || new Date().toISOString();

  return clean;
};

/**
 * Save or update user profile in Firestore AND local cache
 */
export const saveUserToFirestore = async (profile: UserProfile): Promise<void> => {
  const sanitized = sanitizeUserProfile(profile);

  // 1. Always save to local master cache immediately
  saveAdminMasterUser({
    ...profile,
    ...sanitized,
  } as UserProfile);

  // 2. Write to Firestore 'users' collection
  try {
    const userDocRef = doc(db, 'users', profile.uid);
    await setDoc(
      userDocRef,
      {
        ...sanitized,
        serverUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err: any) {
    console.warn('Firestore user write alert (saved to local backup):', err.message);
  }
};

/**
 * Subscribe to all users in real-time for Admin Portal
 */
export const subscribeToAllUsers = (callback: (users: UserProfile[]) => void): (() => void) => {
  let isSubscribed = true;

  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!isSubscribed) return;

        if (!snapshot.empty) {
          const firestoreUsers: UserProfile[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            firestoreUsers.push({
              uid: docSnap.id,
              email: data.email || '',
              displayName: data.displayName || 'Customer',
              phoneNumber: data.phoneNumber || '',
              photoURL: data.photoURL || '',
              role: data.role || (data.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer'),
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
              lastLoginAt: data.lastLoginAt || data.createdAt || new Date().toISOString(),
            });
          });

          // Merge with any offline cached users
          const localUsers = getAdminMasterUsers();
          const mergedMap = new Map<string, UserProfile>();

          // Add local first
          localUsers.forEach((u) => mergedMap.set(u.uid, u));
          // Override/add Firestore official records
          firestoreUsers.forEach((u) => mergedMap.set(u.uid, u));

          const merged = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          localStorage.setItem(USERS_MASTER_STORAGE_KEY, JSON.stringify(merged));
          callback(merged);
        } else {
          // If Firestore collection is empty, return local users
          callback(getAdminMasterUsers());
        }
      },
      (err) => {
        console.warn('Firestore users listener alert (using local cache):', err.message);
        if (isSubscribed) {
          callback(getAdminMasterUsers());
        }
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  } catch (err: any) {
    console.warn('Could not initialize users listener:', err.message);
    callback(getAdminMasterUsers());
    return () => {
      isSubscribed = false;
    };
  }
};

/**
 * Sync all local user profiles directly to Firestore
 */
export const syncAllLocalUsersToFirestore = async (): Promise<{
  successCount: number;
  failedCount: number;
  errors: string[];
}> => {
  const localUsers = getAdminMasterUsers();
  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const u of localUsers) {
    try {
      const sanitized = sanitizeUserProfile(u);
      const userDocRef = doc(db, 'users', u.uid);
      await setDoc(
        userDocRef,
        {
          ...sanitized,
          serverUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      successCount++;
    } catch (err: any) {
      failedCount++;
      if (!errors.includes(err.message)) {
        errors.push(err.message);
      }
    }
  }

  return { successCount, failedCount, errors };
};
