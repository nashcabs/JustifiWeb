import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  getCurrentUser,
  getDashboardPath,
  login,
  resetPassword
} from '../services/justifiFirebase.js';

const REMEMBER_KEY = 'justifi_remember_me';
const REMEMBER_EMAIL_KEY = 'justifi_remember_email';

function getFriendlyFirebaseMessage(error, fallback) {
  const code = String(error?.code || '');

  const messages = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account was found for that email.',
    'auth/wrong-password': 'The password you entered is incorrect.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/too-many-requests':
      'Too many login attempts. Please wait before trying again.',
    'auth/network-request-failed':
      'Network error. Check your internet connection.'
  };

  return messages[code] || error?.message || fallback;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);

  const [floatingMessage, setFloatingMessage] = useState('');

  function showFloatingPanel(message) {
    setFloatingMessage(String(message || ''));

    window.setTimeout(() => {
      setFloatingMessage('');
    }, 3500);
  }

  function saveRememberedLogin(email, remember) {
    if (remember) {
      localStorage.setItem(REMEMBER_KEY, 'true');
      localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      return;
    }

    localStorage.removeItem(REMEMBER_KEY);
    localStorage.removeItem(REMEMBER_EMAIL_KEY);
  }

  function restoreRememberedLogin() {
    const remember =
      localStorage.getItem(REMEMBER_KEY) === 'true';

    const email =
      localStorage.getItem(REMEMBER_EMAIL_KEY) || '';

    // Remove old stored password if an older version saved one.
    localStorage.removeItem('justifi_remember_password');

    setRememberMe(remember);

    if (remember) {
      setLoginEmail(email);
    }
  }

  useEffect(() => {
    restoreRememberedLogin();

    let cancelled = false;

    async function redirectAuthenticatedUser() {
      try {
        const currentUser = await getCurrentUser();

        if (!cancelled && currentUser) {
          navigate(
            getDashboardPath(currentUser),
            { replace: true }
          );
        }
      } catch {
        // Stay on login page when no session exists.
      }
    }

    redirectAuthenticatedUser();

    if (searchParams.get('logout') === '1') {
      const nextParams =
        new URLSearchParams(searchParams);

      nextParams.delete('logout');

      setSearchParams(
        nextParams,
        { replace: true }
      );
    }

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams, setSearchParams]);

  async function handleLogin(event) {
    event.preventDefault();

    const email =
      loginEmail.trim().toLowerCase();

    const password =
      loginPassword;

    if (!email || !password) {
      showFloatingPanel(
        'Please enter your email and password.'
      );
      return;
    }

    try {
      setLoginBusy(true);

      const user = await login(
        email,
        password,
        { remember: rememberMe }
      );

      saveRememberedLogin(
        email,
        rememberMe
      );

      navigate(
        getDashboardPath(user),
        { replace: true }
      );
    } catch (error) {
      showFloatingPanel(
        getFriendlyFirebaseMessage(
          error,
          'Login failed.'
        )
      );
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleSendReset(event) {
    event.preventDefault();

    const email =
      forgotEmail.trim().toLowerCase();

    if (!email) {
      showFloatingPanel(
        'Please enter your email address.'
      );
      return;
    }

    if (!email.includes('@')) {
      showFloatingPanel(
        'Please enter a valid email address.'
      );
      return;
    }

    try {
      setForgotBusy(true);

      await resetPassword(email);

      showFloatingPanel(
        'Reset email sent. Check your inbox.'
      );

      setForgotOpen(false);
      setForgotEmail('');
    } catch (error) {
      showFloatingPanel(
        getFriendlyFirebaseMessage(
          error,
          'Unable to send the reset email.'
        )
      );
    } finally {
      setForgotBusy(false);
    }
  }

  return (
    <div className="justifi-login-page">
      <div
        className="justifi-login-background"
        aria-hidden="true"
      />

      <div
        className="justifi-login-overlay"
        aria-hidden="true"
      />

      <a
        href="/"
        className="justifi-login-back"
        aria-label="Back to JustiFi website"
      >
        Back to website
      </a>

      <main className="justifi-login-shell">
        <section className="justifi-login-brand">
          <span className="justifi-login-kicker">
            JUSTIFI
          </span>

          <h1>
            Legal knowledge.
            <br />
            Better decisions.
          </h1>

          <p>
            Sign in to continue your legal literacy
            learning experience.
          </p>

          <div className="justifi-brand-line" />

          <small>
            Learn your rights. Understand the law.
            Make informed choices.
          </small>
        </section>

        <section className="justifi-login-card">
          <div className="justifi-login-card-heading">


            <div>
              <p>WELCOME BACK</p>
              <h2>Sign in to JustiFi</h2>
            </div>
          </div>

          <p className="justifi-login-description">
            Enter your registered account credentials
            to continue.
          </p>

          <form
            className="justifi-login-form"
            onSubmit={handleLogin}
          >
            <div className="justifi-login-field">
              <label htmlFor="loginEmail">
                Email address
              </label>

              <input
                id="loginEmail"
                type="email"
                value={loginEmail}
                onChange={(event) =>
                  setLoginEmail(event.target.value)
                }
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="justifi-login-field">
              <label htmlFor="loginPassword">
                Password
              </label>

              <input
                id="loginPassword"
                type="password"
                value={loginPassword}
                onChange={(event) =>
                  setLoginPassword(event.target.value)
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </div>

            <div className="justifi-login-options">
              <label className="justifi-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) =>
                    setRememberMe(
                      event.target.checked
                    )
                  }
                />

                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="justifi-forgot-button"
                onClick={() => {
                  setForgotEmail(loginEmail);
                  setForgotOpen(true);
                }}
              >
                Forgot password?
              </button>
            </div>

            <button
              className="justifi-login-submit"
              type="submit"
              disabled={loginBusy}
            >
              {loginBusy
                ? 'Signing in...'
                : 'Sign In'}
            </button>
          </form>

          <div className="justifi-login-footer">
            <span />
            <p>JUSTIFI LEGAL LITERACY PLATFORM</p>
            <span />
          </div>
        </section>
      </main>

      {forgotOpen && (
        <div className="justifi-reset-modal">
          <button
            className="justifi-reset-overlay"
            type="button"
            aria-label="Close reset password"
            onClick={() =>
              setForgotOpen(false)
            }
          />

          <form
            className="justifi-reset-card"
            onSubmit={handleSendReset}
          >
            <button
              className="justifi-reset-close"
              type="button"
              aria-label="Close"
              onClick={() =>
                setForgotOpen(false)
              }
            >
              ×
            </button>

            <span className="justifi-reset-kicker">
              ACCOUNT RECOVERY
            </span>

            <h2>Reset your password</h2>

            <p>
              Enter your registered email address.
              We'll send you a password reset link.
            </p>

            <label htmlFor="forgotEmail">
              Email address
            </label>

            <input
              id="forgotEmail"
              type="email"
              value={forgotEmail}
              onChange={(event) =>
                setForgotEmail(
                  event.target.value
                )
              }
              placeholder="you@example.com"
              autoComplete="email"
              required
            />

            <button
              className="justifi-reset-submit"
              type="submit"
              disabled={forgotBusy}
            >
              {forgotBusy
                ? 'Sending...'
                : 'Send Reset Link'}
            </button>
          </form>
        </div>
      )}

      <div
        className={[
          'justifi-login-message',
          floatingMessage ? 'show' : ''
        ].join(' ')}
        role="status"
        aria-live="polite"
      >
        {floatingMessage}
      </div>
    </div>
  );
}