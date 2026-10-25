import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  shopName: string;
  createdAt: string;
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
          // Fetch user profile from Firestore
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setCurrentUser({
              uid: user.uid,
              email: user.email || data.email,
              fullName: data.fullName || user.displayName || 'Shop Owner',
              shopName: data.shopName || 'My Kirana Store',
              createdAt: data.createdAt || new Date().toISOString(),
            });
          } else {
            // Profile document missing, create fallback
            const fallbackProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              fullName: user.displayName || 'Shop Owner',
              shopName: 'My Retail Shop',
              createdAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, fallbackProfile);
            setCurrentUser(fallbackProfile);
          }
        } catch (err: any) {
          console.error('Error fetching user profile from Firestore:', err);
          // Fallback to basic auth info if firestore read is delayed
          setCurrentUser({
            uid: user.uid,
            email: user.email || '',
            fullName: user.displayName || 'Shop Owner',
            shopName: 'My Retail Shop',
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        setCurrentUser(null);
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
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      setCurrentUser(userProfile);
    } catch (err: any) {
      console.error('Registration error:', err);
      let message = 'Failed to register account. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'This email address is already registered. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Password is too weak. Please use at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
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

      // Ensure profile is loaded
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
        });
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let message = 'Failed to sign in. Please check your credentials.';
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        message = 'Invalid email or password. Please try again or use Forgot Password.';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Too many failed login attempts. Please reset your password or try again later.';
      }
      setAuthError(message);
      throw new Error(message);
    }
  };

  const logout = async () => {
    setAuthError(null);
    try {
      await firebaseSignOut(auth);
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
      if (err.code === 'auth/user-not-found') {
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
