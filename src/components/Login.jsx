import React, { useEffect, useState } from 'react';
import {
  auth,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from '../firebase';

const Login = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return unsubscribe;
  }, []);

  const loginWithGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
  const loginWithGitHub = () => signInWithPopup(auth, new GithubAuthProvider());
  const loginWithMicrosoft = () => {
    const provider = new OAuthProvider('microsoft.com');
    return signInWithPopup(auth, provider);
  };
  const logout = () => signOut(auth);

  return (
    <div>
      {user ? (
        <div>
          <p>Welcome, {user.displayName || user.email}</p>
          <img src={user.photoURL} alt="profile" width="50" />
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <div>
          <button onClick={loginWithGoogle}>Login with Google</button>
          <button onClick={loginWithGitHub}>Login with GitHub</button>
          <button onClick={loginWithMicrosoft}>Login with Microsoft</button>
        </div>
      )}
    </div>
  );
};

export default Login;