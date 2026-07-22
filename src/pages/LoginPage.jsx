import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  getCurrentUser,
  getDashboardPath,
  login,
  registerUser,
  resetPassword
} from '../services/justifiFirebase.js';

const REMEMBER_KEY = 'justifi_remember_me';
const REMEMBER_EMAIL_KEY = 'justifi_remember_email';

const DEFAULT_SCHOOL_ID = 'mdps';
const DEFAULT_SCHOOL_NAME = 'Mother of Divine Providence School';

function buildSectionId(gradeLevel, section) {
  return [gradeLevel, section]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean)
    .join('-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getFriendlyFirebaseMessage(error, fallback) {
  const code = String(error?.code || '');

  const messages = {
    'auth/email-already-in-use': 'That email address is already registered.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account was found for that email.',
    'auth/wrong-password': 'The password you entered is incorrect.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/too-many-requests': 'Too many attempts. Please wait before trying again.',
    'auth/network-request-failed': 'Network error. Check your internet connection.'
  };

  return messages[code] || error?.message || fallback;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [mode, setMode] = useState('login');
  const [floatingMessage, setFloatingMessage] = useState(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);

  const [regRole, setRegRole] = useState('student');
  const [regFirstName, setRegFirstName] = useState('');
  const [regMiddleName, setRegMiddleName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [regStudentNumber, setRegStudentNumber] = useState('');
  const [regGradeLevel, setRegGradeLevel] = useState('');
  const [regSection, setRegSection] = useState('');
  const [registerBusy, setRegisterBusy] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotBusy, setForgotBusy] = useState(false);

  const isStudentRegistration = regRole === 'student';

  const panelClassName = useMemo(() => {
    return [
      'auth-panel',
      mode === 'register' ? 'show-register' : ''
    ]
      .filter(Boolean)
      .join(' ');
  }, [mode]);

  function showFloatingPanel(message) {
    setFloatingMessage(message);
    window.setTimeout(() => {
      setFloatingMessage(null);
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

    // Remove the old stored-password value, if it exists.
    localStorage.removeItem('justifi_remember_password');

    setRememberMe(remember);

    if (remember) {
      setLoginEmail(email);
    }
  }

  function clearRegistrationForm() {
    setRegRole('student');
    setRegFirstName('');
    setRegMiddleName('');
    setRegLastName('');
    setRegEmail('');
    setRegPassword('');
    setRegStudentNumber('');
    setRegGradeLevel('');
    setRegSection('');
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
        // The login page remains available when no session exists.
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

  async function handleRegister(event) {
    event.preventDefault();

    const firstName = regFirstName.trim();
    const middleName = regMiddleName.trim();
    const lastName = regLastName.trim();
    const email = regEmail.trim().toLowerCase();
    const password = regPassword;

    if (!firstName || !lastName || !email || !password) {
      showFloatingPanel(
        'Please complete all required account fields.'
      );
      return;
    }

    if (password.length < 6) {
      showFloatingPanel(
        'Password must be at least 6 characters.'
      );
      return;
    }

    if (isStudentRegistration) {
      if (
        !regStudentNumber.trim() ||
        !regGradeLevel ||
        !regSection.trim()
      ) {
        showFloatingPanel(
          'Student number, grade level, and section are required.'
        );
        return;
      }
    }

    const section =
      isStudentRegistration
        ? regSection.trim()
        : '';

    const gradeLevel =
      isStudentRegistration
        ? regGradeLevel
        : '';

    const payload = {
      role: regRole,

      firstName,
      middleName,
      lastName,

      email,
      password,

      schoolId:
        isStudentRegistration
          ? DEFAULT_SCHOOL_ID
          : null,

      school:
        isStudentRegistration
          ? DEFAULT_SCHOOL_NAME
          : '',

      studentNumber:
        isStudentRegistration
          ? regStudentNumber.trim()
          : '',

      studentId:
        isStudentRegistration
          ? regStudentNumber.trim()
          : '',

      gradeLevel,

      section,

      sectionId:
        isStudentRegistration
          ? buildSectionId(
              gradeLevel,
              section
            )
          : ''
    };

    try {
      setRegisterBusy(true);

      await registerUser(payload);

      clearRegistrationForm();
      setLoginEmail(email);
      setMode('login');

      showFloatingPanel(
        'Verification email sent. Verify your email before logging in.'
      );
    } catch (error) {
      console.error(
        '[JustiFi] Registration UI error',
        error
      );

      showFloatingPanel(
        getFriendlyFirebaseMessage(
          error,
          'Registration failed.'
        )
      );
    } finally {
      setRegisterBusy(false);
    }
  }

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

      // Only the email is stored locally. Passwords should not be
      // stored in localStorage.
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
    <>
      <div className="background">
        <img
          src="/assets/Login/LoginBG.jpg"
          alt=""
          aria-hidden="true"
        />
      </div>

      <div className="auth-frame">
        <img
          src="/assets/Background/frame.svg"
          alt=""
          className="frame-img"
          aria-hidden="true"
        />

        <div className="auth-container">
          <div className={panelClassName}>
            <form
              className="form login"
              onSubmit={handleLogin}
            >
              <img
                src="/assets/Login/login.svg"
                alt="Login"
                className="login-title-img"
              />

              <input
                value={loginEmail}
                onChange={(event) =>
                  setLoginEmail(event.target.value)
                }
                type="email"
                placeholder="Email"
                autoComplete="email"
                required
              />

              <input
                value={loginPassword}
                onChange={(event) =>
                  setLoginPassword(event.target.value)
                }
                type="password"
                placeholder="Password"
                autoComplete="current-password"
                required
              />

              <div className="remember-forgot-row">
                <label className="remember-row">
                  <input
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(
                        event.target.checked
                      )
                    }
                    type="checkbox"
                  />
                  Remember Me
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(loginEmail);
                    setForgotOpen(true);
                  }}
                  className="forgot-link forgot-link-button"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                className="login-btn"
                type="submit"
                disabled={loginBusy}
              >
                {loginBusy
                  ? 'Logging in...'
                  : 'Login'}
              </button>

              <p className="auth-prompt">
                Don't have an account?
              </p>

              <button
                className="switch"
                type="button"
                onClick={() =>
                  setMode('register')
                }
              >
                Register
              </button>

              <a
                className="back"
                href="/"
              >
                <img
                  src="/assets/Login/back-button.png"
                  alt="Back to Site"
                />
              </a>
            </form>

            <div className="info-area">
              <img
                src="/assets/Login/justifi-logo.png"
                alt="JustiFi"
                className="justifi-logo"
              />
            </div>

            <form
              className="form register register-scroll"
              onSubmit={handleRegister}
            >
              <img
                src="/assets/Login/ca.svg"
                alt="Create Account"
                className="register-title-img"
              />

              <label className="register-field-label">
                Account type
              </label>

              <select
                className="auth-select"
                value={regRole}
                onChange={(event) =>
                  setRegRole(event.target.value)
                }
              >
                <option value="student">
                  Student
                </option>
                <option value="nonStudent">
                  Not a Student
                </option>
              </select>

              <div className="two-col">
                <input
                  value={regLastName}
                  onChange={(event) =>
                    setRegLastName(
                      event.target.value
                    )
                  }
                  type="text"
                  placeholder="Last name *"
                  autoComplete="family-name"
                  required
                />

                <input
                  value={regFirstName}
                  onChange={(event) =>
                    setRegFirstName(
                      event.target.value
                    )
                  }
                  type="text"
                  placeholder="First name *"
                  autoComplete="given-name"
                  required
                />
              </div>

              <input
                value={regMiddleName}
                onChange={(event) =>
                  setRegMiddleName(
                    event.target.value
                  )
                }
                type="text"
                placeholder="Middle name (optional)"
                autoComplete="additional-name"
              />

              {isStudentRegistration ? (
                <div className="student-registration-fields">
                  <input
                    value={regStudentNumber}
                    onChange={(event) =>
                      setRegStudentNumber(
                        event.target.value
                      )
                    }
                    type="text"
                    placeholder="Student ID / Student number *"
                    required
                  />

                  <div className="two-col">
                    <select
                      className="auth-select"
                      value={regGradeLevel}
                      onChange={(event) =>
                        setRegGradeLevel(
                          event.target.value
                        )
                      }
                      required
                    >
                      <option value="">
                        Select grade level *
                      </option>
                      <option value="Grade 11">
                        Grade 11
                      </option>
                      <option value="Grade 12">
                        Grade 12
                      </option>
                    </select>

                    <input
                      value={regSection}
                      onChange={(event) =>
                        setRegSection(
                          event.target.value
                        )
                      }
                      type="text"
                      placeholder="Section *"
                      required
                    />
                  </div>

                  <p className="register-school-note">
                    School: {DEFAULT_SCHOOL_NAME}
                  </p>
                </div>
              ) : (
                <p className="register-school-note">
                  This account will be registered as
                  “Not a Student” and will not be assigned
                  to a grade or section.
                </p>
              )}

              <input
                value={regEmail}
                onChange={(event) =>
                  setRegEmail(event.target.value)
                }
                type="email"
                placeholder="Email *"
                autoComplete="email"
                required
              />

              <input
                value={regPassword}
                onChange={(event) =>
                  setRegPassword(
                    event.target.value
                  )
                }
                type="password"
                placeholder="Password (at least 6 characters) *"
                autoComplete="new-password"
                minLength={6}
                required
              />

              <button
                type="submit"
                disabled={registerBusy}
              >
                {registerBusy
                  ? 'Creating account...'
                  : 'Register'}
              </button>

              <p>Already have an account?</p>

              <button
                className="switch"
                type="button"
                onClick={() =>
                  setMode('login')
                }
              >
                Login
              </button>

              <a
                className="back"
                href="/"
              >
                <img
                  src="/assets/Login/back-button.png"
                  alt="Back to Site"
                />
              </a>
            </form>
          </div>
        </div>
      </div>

      <div
        className={[
          'forgot-modal',
          forgotOpen ? '' : 'hidden'
        ].join(' ')}
      >
        <form
          className="forgot-modal-content"
          onSubmit={handleSendReset}
        >
          <button
            className="forgot-modal-close"
            type="button"
            onClick={() =>
              setForgotOpen(false)
            }
            aria-label="Close reset-password form"
          >
            &times;
          </button>

          <h2>Reset Password</h2>

          <p>
            Enter your email address and we'll
            send you a password-reset link.
          </p>

          <input
            value={forgotEmail}
            onChange={(event) =>
              setForgotEmail(
                event.target.value
              )
            }
            type="email"
            placeholder="Enter your email"
            autoComplete="email"
            required
          />

          <button
            type="submit"
            disabled={forgotBusy}
          >
            {forgotBusy
              ? 'Sending...'
              : 'Send Reset Link'}
          </button>

          <p className="forgot-modal-back">
            <button
              type="button"
              className="forgot-back-button"
              onClick={() =>
                setForgotOpen(false)
              }
            >
              Back to Login
            </button>
          </p>
        </form>

        <button
          className="forgot-modal-overlay"
          type="button"
          aria-label="Close reset-password form"
          onClick={() =>
            setForgotOpen(false)
          }
        />
      </div>

      <div
        className={[
          'floating-panel',
          floatingMessage ? '' : 'hidden'
        ].join(' ')}
      >
        <span>{floatingMessage || ''}</span>
      </div>
    </>
  );
}