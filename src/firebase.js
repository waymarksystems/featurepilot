import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyBzwHVJb0zri0PwkIekPI0pB7H6XZmlOVk",
    authDomain: "steprunner-abc1f.firebaseapp.com",
    projectId: "steprunner-abc1f",
    storageBucket: "steprunner-abc1f.firebasestorage.app",
    messagingSenderId: "1046556690598",
    appId: "1:1046556690598:web:4d09a036a2f66e76f5cc67",
    measurementId: "G-86P017PF76"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export {
  auth,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
};