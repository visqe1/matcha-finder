import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { login, register } from '../lib/api';
import { useAuth } from '../lib/useAuth';
import Nav from '../components/Nav';

export default function LoginPage() {
  const router = useRouter();
  const { user, saveUser } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    const fn = mode === 'login' ? login : register;
    const data = await fn(username.trim(), password);

    if (data.error) {
      setError(data.error);
      setLoading(false);
      return;
    }

    if (data.user) {
      saveUser(data.user);
      router.push('/');
    }
    setLoading(false);
  };

  if (user) {
    return null;
  }

  return (
    <div className="page">
      <Nav />
      <main className="main-content centered">
        <div className="login-card">
          <h1>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h1>
          <p className="login-subtitle">
            {mode === 'login'
              ? 'Log in to access your favorites and lists'
              : 'Sign up to save favorites and create lists'}
          </p>

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              className="login-input"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <input
              type="password"
              className="login-input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />

            {error && <p className="login-error">{error}</p>}

            <button
              type="submit"
              className="login-btn"
              disabled={loading || !username.trim() || !password}
            >
              {loading ? 'Loading...' : mode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>

          <p className="login-switch">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button onClick={() => { setMode('register'); setError(''); }}>
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(''); }}>
                  Log in
                </button>
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
