import {
  useEffect,
  useState,
} from 'react';

import type {
  FormEvent,
} from 'react';

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from 'firebase/auth';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import { auth } from '../firebase';

export default function AdminLogin() {
  const navigate =
    useNavigate();

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    error,
    setError,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          navigate(
            '/admin',
            {
              replace: true,
            },
          );
        }
      },
    );
  }, [navigate]);

  async function login(
    event: FormEvent,
  ) {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      navigate('/admin');
    } catch {
      setError(
        'Invalid admin email or password.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <form
        className="login-card"
        onSubmit={login}
      >
        <img
          src="/palm-paddle-logo.png"
          alt="Palm & Paddle"
        />

        <span className="eyebrow">
          ADMIN ACCESS
        </span>

        <h1>
          Welcome back.
        </h1>

        <p className="muted">
          Manage ChocsDwacks Palm & Paddle Sports Center
          reservations.
        </p>

        <label>
          Email

          <input
            type="email"
            value={email}
            onChange={(
              event,
            ) =>
              setEmail(
                event.target
                  .value,
              )
            }
            required
          />
        </label>

        <label>
          Password

          <input
            type="password"
            value={password}
            onChange={(
              event,
            ) =>
              setPassword(
                event.target
                  .value,
              )
            }
            required
          />
        </label>

        {error && (
          <div className="alert error-alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="primary-button submit-button"
          disabled={loading}
        >
          {loading
            ? 'Signing In...'
            : 'Sign In'}
        </button>

        <Link
          to="/"
          className="text-link login-home"
        >
          ← Back to website
        </Link>
      </form>
    </main>
  );
}