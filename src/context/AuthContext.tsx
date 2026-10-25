import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  shopName: string;
  createdAt: string;
  isGuest?: boolean;
}

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  register: (data: {
    fullName: string;
    shopName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  authError: string | null;
  setAuthError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setCurrentUser({
              uid: user.uid,
              email: user.email || data.email || '',
              fullName: data.fullName || user.displayName || 'Shop Owner',
              shopName: data.shopName || 'My Retail Shop',
              createdAt: data.createdAt || new Date().toISOString(),
              isGuest: false,
            });
          } else {
            // First-time sign in (e.g. Google Sign-In), initialize Firestore user profile
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              fullName: user.displayName || 'Shop Owner',
              shopName: 'My Retail Shop',
              createdAt: new Date().toISOString(),
              isGuest: false,
            };
            try {
              await setDoc(userDocRef, newProfile);
            } catch (writeErr) {
              console.warn('Profile write notice (rules check):', writeErr);
            }
            setCurrentUser(newProfile);
          }
        } catch (err: any) {
          console.warn('Error fetching user profile from Firestore:', err);
          setCurrentUser({
            uid: user.uid,
            email: user.email || '',
            fullName: user.displayName || 'Shop Owner',
            shopName: 'My Retail Shop',
            createdAt: new Date().toISOString(),
            isGuest: false,
          });
        }
      } else {
        // If not logged in and not guest, reset
        setCurrentUser((prev) => (prev?.isGuest ? prev : null));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const register = async ({
    fullName,
    shopName,
    email,
    password,
  }: {
    fullName: string;
    shopName: string;
    email: string;
    password: string;
  }) => {
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, {
        displayName: fullName.trim(),
      });

      // Write user profile to Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email || email.trim(),
        fullName: fullName.trim(),
        shopName: shopName.trim(),
        createdAt: new Date().toISOString(),
        isGuest: false,
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      setCurrentUser(userProfile);
    } catch (err: any) {
      console.error('Registration error:', err);
      let message = 'Failed to register account. Please try again.';
      if (err.code === 'auth/operation-not-allowed') {
        message =
          'Email/Password registration is not enabled in this Firebase project. Please click "Continue with Google" above for instant 1-click access, or enable the Email/Password provider in the Firebase Console (under Authentication > Sign-in method).';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'This email address is already registered. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password is too weak. Please use at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (err.message) {
        message = err.message;
      }
      setAuthError(message);
      throw new Error(message);
    }
  };

  const login = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = credential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentUser({
          uid: user.uid,
          email: user.email || data.email,
          fullName: data.fullName || user.displayName || 'Shop Owner',
          shopName: data.shopName || 'My Retail Shop',
          createdAt: data.createdAt || new Date().toISOString(),
          isGuest: false,
        });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let message = 'Failed to sign in. Please check your credentials.';
      if (err.code === 'auth/operation-not-allowed') {
        message =
          'Email/Password sign-in is not enabled in this Firebase project. Please click "Continue with Google" above for instant access, or enable Email/Password in the Firebase Console.';
      } else if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        message = 'Invalid email or password. Please try again or sign in with Google.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Too many failed login attempts. Please reset your password or try again later.';
      } else if (err.message) {
        message = err.message;
      }
      setAuthError(message);
      throw new Error(message);
    }
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentUser({
          uid: user.uid,
          email: user.email || data.email || '',
          fullName: data.fullName || user.displayName || 'Shop Owner',
          shopName: data.shopName || 'My Retail Shop',
          createdAt: data.createdAt || new Date().toISOString(),
          isGuest: false,
        });
      } else {
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          fullName: user.displayName || 'Shop Owner',
          shopName: 'My Retail Shop',
          createdAt: new Date().toISOString(),
          isGuest: false,
        };
        try {
          await setDoc(userDocRef, newProfile);
        } catch (e) {
          console.warn('Set doc notice:', e);
        }
        setCurrentUser(newProfile);
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in popup was closed before completion. Please try again.');
      } else if (err.code !== 'auth/cancelled-popup-request') {
        setAuthError(err.message || 'Failed to sign in with Google.');
      }
      throw err;
    }
  };

  const continueAsGuest = () => {
    setAuthError(null);
    const guestProfile: UserProfile = {
      uid: 'guest-local-user',
      email: 'guest@kathavoice.local',
      fullName: 'Shopkeeper (Guest Mode)',
      shopName: 'Demo Retail Khata',
      createdAt: new Date().toISOString(),
      isGuest: true,
    };
    setCurrentUser(guestProfile);
  };

  const logout = async () => {
    setAuthError(null);
    try {
      if (firebaseUser) {
        await firebaseSignOut(auth);
      }
      setCurrentUser(null);
      setFirebaseUser(null);
    } catch (err: any) {
      console.error('Logout error:', err);
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      console.error('Password reset error:', err);
      let message = 'Failed to send password reset email. Please check the email address.';
      if (err.code === 'auth/operation-not-allowed') {
        message = 'Email password reset is not enabled. Please sign in with Google.';
      } else if (err.code === 'auth/user-not-found') {
        message = 'No account found with this email address.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      }
      setAuthError(message);
      throw new Error(message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        register,
        login,
        signInWithGoogle,
        continueAsGuest,
        logout,
        resetPassword,
        authError,
        setAuthError,
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
