import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Keep ref to profile unsubscribe so we can clean it up properly
  const unsubscribeProfileRef = useRef<(() => void) | null>(null);

  // Tạo user profile trong Firestore nếu chưa có (lần đăng ký đầu tiên)
  const ensureUserProfile = async (firebaseUser: User) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    // Use merge: true so existing fields (credits, onboardingCompleted) are not overwritten
    // onboardingCompleted is ONLY set to false for brand-new docs (first login)
    // For existing users, we only update non-critical fields
    await setDoc(userRef, {
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? '',
      displayName: firebaseUser.displayName ?? '',
      // These are set with merge, so they only apply if NOT already present
    }, { merge: true });

    // Check if this is a new user or existing user
    const { getDoc } = await import('firebase/firestore');
    const snap = await getDoc(userRef);
    const data = snap.exists() ? snap.data() : null;

    if (!snap.exists() || data?.credits === undefined) {
      // Brand new user - set defaults including onboardingCompleted: false to trigger popup
      await setDoc(userRef, {
        credits: 3,
        totalGenerated: 0,
        onboardingCompleted: false,
        createdAt: serverTimestamp(),
      }, { merge: true });
    } else if (data?.onboardingCompleted === undefined) {
      // Existing user who registered before onboardingCompleted field was added
      // Mark them as already onboarded so popup doesn't show
      await setDoc(userRef, {
        onboardingCompleted: true,
      }, { merge: true });
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up previous profile listener
      if (unsubscribeProfileRef.current) {
        unsubscribeProfileRef.current();
        unsubscribeProfileRef.current = null;
      }

      setUser(firebaseUser);

      if (!firebaseUser) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      // Ensure profile exists (fire and forget, don't await here)
      ensureUserProfile(firebaseUser).catch(console.error);

      // Set up realtime listener for user profile
      const userRef = doc(db, 'users', firebaseUser.uid);
      const unsubscribeProfile = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            setUserProfile(snap.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        },
        (error) => {
          console.error('Firestore onSnapshot error:', error);
          setLoading(false);
        }
      );

      unsubscribeProfileRef.current = unsubscribeProfile;
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfileRef.current) {
        unsubscribeProfileRef.current();
        unsubscribeProfileRef.current = null;
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(newUser, { displayName });
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null;
    return user.getIdToken();
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      getIdToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải được dùng trong AuthProvider');
  return ctx;
}
