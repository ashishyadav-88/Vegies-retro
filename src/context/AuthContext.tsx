import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';
import { UserProfile } from '../types';
import { ADMIN_EMAIL } from '../services/bookingService';
import {
  saveUserToFirestore,
  saveAdminMasterUser,
  sanitizeUserProfile,
} from '../services/userService';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    pass: string,
    displayName: string,
    phoneNumber?: string
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAdminDirect: (pass: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfileData: (displayName: string, phoneNumber?: string) => Promise<void>;
}

const getProfileStorageKey = (uid: string) => `vegies_restro_profile_${uid}`;

const getLocalProfile = (currentUser: User): UserProfile => {
  try {
    const raw = localStorage.getItem(getProfileStorageKey(currentUser.uid));
    if (raw) return JSON.parse(raw);
  } catch {}

  const isCurrentAdmin = currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  return {
    uid: currentUser.uid,
    email: currentUser.email || '',
    displayName: isCurrentAdmin
      ? 'Parvati Yadav (Manager)'
      : currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Guest Foodie'),
    phoneNumber: currentUser.phoneNumber || '',
    photoURL: currentUser.photoURL || '',
    role: isCurrentAdmin ? 'admin' : 'customer',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
};

const saveLocalProfile = (profile: UserProfile) => {
  try {
    localStorage.setItem(getProfileStorageKey(profile.uid), JSON.stringify(profile));
    saveAdminMasterUser(profile);
  } catch (e) {
    console.warn('Could not cache profile locally:', e);
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const isAdmin = Boolean(
    user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
      userProfile?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  // Sync Auth State
  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Immediately initialize profile from local storage or auth object so UI is fast & never blocked
        const initialFallback = getLocalProfile(currentUser);
        setUserProfile(initialFallback);
        setLoading(false);

        // Attempt Firestore sync
        try {
          const userRef = doc(db, 'users', currentUser.uid);

          unsubscribeDoc = onSnapshot(
            userRef,
            async (snapshot) => {
              if (snapshot.exists()) {
                const data = snapshot.data() as UserProfile;
                setUserProfile(data);
                saveLocalProfile(data);
              } else {
                // Try writing initial profile if permitted
                try {
                  await setDoc(userRef, initialFallback);
                  saveLocalProfile(initialFallback);
                } catch (writeErr) {
                  // Firestore write permission restricted, rely on local cache
                  saveLocalProfile(initialFallback);
                }
              }
            },
            (err) => {
              console.warn('Firestore user profile sync noticed (using cached user profile):', err.message);
              setUserProfile(initialFallback);
            }
          );
        } catch (e) {
          console.warn('Could not attach Firestore profile listener:', e);
          setUserProfile(initialFallback);
        }
      } else {
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = null;
        }
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) {
        try {
          unsubscribeDoc();
        } catch {}
      }
    };
  }, []);

  // Email Sign In
  const signInWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    if (cred.user) {
      const prof = getLocalProfile(cred.user);
      prof.lastLoginAt = new Date().toISOString();
      await saveUserToFirestore(prof);
      setUserProfile(prof);
    }
  };

  // Dedicated Admin Direct Sign In
  const signInAdminDirect = async (pass: string) => {
    const adminEmail = ADMIN_EMAIL;
    try {
      // 1. Try standard sign in
      const cred = await signInWithEmailAndPassword(auth, adminEmail, pass);
      const adminProf: UserProfile = {
        uid: cred.user.uid,
        email: adminEmail,
        displayName: 'Parvati Yadav (Manager)',
        phoneNumber: '+91 70288 18440',
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      await saveUserToFirestore(adminProf);
      setUserProfile(adminProf);
    } catch (err: any) {
      // If user not found yet or invalid creds, try auto-provisioning admin user in Firebase Auth
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const cred = await createUserWithEmailAndPassword(auth, adminEmail, pass);
          await updateProfile(cred.user, { displayName: 'Parvati Yadav (Manager)' });
          const adminProf: UserProfile = {
            uid: cred.user.uid,
            email: adminEmail,
            displayName: 'Parvati Yadav (Manager)',
            phoneNumber: '+91 70288 18440',
            role: 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          await saveUserToFirestore(adminProf);
          setUserProfile(adminProf);
          return;
        } catch (createErr: any) {
          throw err;
        }
      }
      throw err;
    }
  };

  // Email Sign Up
  const signUpWithEmail = async (
    email: string,
    pass: string,
    displayName: string,
    phoneNumber?: string
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const createdUser = cred.user;

    // Update Firebase Auth profile
    if (displayName.trim()) {
      try {
        await updateProfile(createdUser, { displayName: displayName.trim() });
      } catch (e) {
        console.warn('Could not update Firebase Auth profile display name:', e);
      }
    }

    const isCurrentAdmin = email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const profile: UserProfile = {
      uid: createdUser.uid,
      email: createdUser.email || email.trim(),
      displayName: displayName.trim() || 'Foodie',
      phoneNumber: phoneNumber?.trim() || '',
      photoURL: createdUser.photoURL || '',
      role: isCurrentAdmin ? 'admin' : 'customer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    saveLocalProfile(profile);
    setUserProfile(profile);

    // Save to Firestore 'users' collection
    await saveUserToFirestore(profile);
  };

  // Google Sign In
  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const gUser = result.user;

    const isCurrentAdmin = (gUser.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const profile: UserProfile = {
      uid: gUser.uid,
      email: gUser.email || '',
      displayName: gUser.displayName || 'Vegies Guest',
      phoneNumber: gUser.phoneNumber || '',
      photoURL: gUser.photoURL || '',
      role: isCurrentAdmin ? 'admin' : 'customer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    saveLocalProfile(profile);
    setUserProfile(profile);

    // Save to Firestore 'users' collection
    await saveUserToFirestore(profile);
  };

  // Update Profile Data
  const updateUserProfileData = async (displayName: string, phoneNumber?: string) => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const isCurrentAdmin = (auth.currentUser.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const updatedProfile: UserProfile = {
      uid,
      email: auth.currentUser.email || '',
      displayName: displayName.trim() || userProfile?.displayName || 'Foodie',
      phoneNumber: phoneNumber?.trim() || userProfile?.phoneNumber || '',
      photoURL: auth.currentUser.photoURL || '',
      role: isCurrentAdmin ? 'admin' : userProfile?.role || 'customer',
      createdAt: userProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: userProfile?.lastLoginAt || new Date().toISOString(),
    };

    saveLocalProfile(updatedProfile);
    setUserProfile(updatedProfile);

    if (displayName) {
      try {
        await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      } catch (e) {
        console.warn('Could not update Firebase Auth user displayName:', e);
      }
    }

    // Save to Firestore 'users' collection
    await saveUserToFirestore(updatedProfile);
  };

  // Sign Out
  const logout = async () => {
    await signOut(auth);
  };

  // Password Reset
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isAdmin,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInAdminDirect,
        logout,
        resetPassword,
        updateUserProfileData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
