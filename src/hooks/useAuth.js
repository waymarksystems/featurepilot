// src/hooks/useAuth.js
import { useEffect, useState } from 'react';
import {
  auth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  signOut
} from '../firebase';

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      setAuthError(error);
    }
  };

  const loginWithGitHub = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, new GithubAuthProvider());
    } catch (error) {
      setAuthError(error);
    }
  };

  const loginWithMicrosoft = async () => {
    setAuthError(null);
    try {
      const provider = new OAuthProvider('microsoft.com');
      await signInWithPopup(auth, provider);
    } catch (error) {
      setAuthError(error);
    }
  };

  const logout = () => signOut(auth);

  return {
    user,
    authChecked,
    authError,
    loginWithGoogle,
    loginWithGitHub,
    loginWithMicrosoft,
    logout
  };
}
