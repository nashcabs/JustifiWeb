import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import RequireRole from './components/RequireRole.jsx';
import { logout } from './services/justifiFirebase.js';

const LandingPage = lazy(() => import('./pages/LandingPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const TeamPage = lazy(() => import('./pages/TeamPage.jsx'));
const TeacherDashboard = lazy(() => import('./pages/dashboards/TeacherDashboard.jsx'));
const DeveloperDashboard = lazy(() => import('./pages/dashboards/DeveloperDashboard.jsx'));
const TeacherProfile = lazy(() => import('./pages/teacher/TeacherProfile.jsx'));
const TeacherStudents = lazy(() => import('./pages/teacher/TeacherStudents.jsx'));
const TeacherManageStudents = lazy(() => import('./pages/teacher/TeacherManageStudents.jsx'));
const TeacherStudentView = lazy(() => import('./pages/teacher/TeacherStudentView.jsx'));
const AssignRoles = lazy(() => import('./pages/developer/AssignRoles.jsx'));
const ManageAccounts = lazy(() => import('./pages/developer/ManageAccounts.jsx'));
const SystemSettings = lazy(() => import('./pages/developer/SystemSettings.jsx'));
const DeveloperInquiries = lazy(() => import('./pages/developer/DeveloperInquiries.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState(30);

  const INACTIVITY_MS = 120000;
  const WARNING_MS = 90000;

  const clearTimers = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      window.clearInterval(warningRef.current);
      warningRef.current = null;
    }
  };

  const resetTimer = () => {
    clearTimers();
    setShowSessionWarning(false);
    setSessionSecondsLeft(30);

    timeoutRef.current = window.setTimeout(() => {
      clearTimers();
      setShowSessionWarning(true);
      setSessionSecondsLeft(30);

      let remaining = 30;
      warningRef.current = window.setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          window.clearInterval(warningRef.current);
          warningRef.current = null;
          setShowSessionWarning(false);
          setSessionSecondsLeft(0);

          logout().catch(() => undefined).finally(() => {
            navigate('/login', { replace: true });
          });
          return;
        }

        setSessionSecondsLeft(remaining);
      }, 1000);
    }, INACTIVITY_MS - WARNING_MS);
  };

  const handleStaySignedIn = () => {
    clearTimers();
    setShowSessionWarning(false);
    setSessionSecondsLeft(30);
    resetTimer();
  };

  useEffect(() => {
    const publicPaths = new Set(['/', '/login', '/team']);
    if (publicPaths.has(location.pathname)) {
      clearTimers();
      setShowSessionWarning(false);
      setSessionSecondsLeft(30);
      return;
    }

    const activityEvents = ['click', 'keydown', 'pointerdown', 'mousemove', 'touchstart', 'touchmove', 'scroll'];
    for (const eventName of activityEvents) {
      window.addEventListener(eventName, resetTimer, { passive: true });
    }

    resetTimer();

    return () => {
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, resetTimer);
      }
      clearTimers();
    };
  }, [location.pathname, navigate]);

  return (
    <>
      {showSessionWarning ? (
        <div className="session-warning" role="alertdialog" aria-live="assertive">
          <div className="session-warning-card">
            <p className="session-warning-label">Session timeout</p>
            <h3>You will be logged out in {sessionSecondsLeft}s</h3>
            <p>Due to inactivity, your session will end automatically.</p>
            <button type="button" className="session-warning-button" onClick={handleStaySignedIn}>
              Stay signed in
            </button>
          </div>
        </div>
      ) : null}

      <Suspense fallback={<div className="route-loading" role="status">Loading...</div>}>
        <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/team" element={<TeamPage />} />

        <Route
          path="/dashboard/teacher"
          element={
            <RequireRole role="teacher">
              <TeacherDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/dashboard/developer"
          element={
            <RequireRole role="developer">
              <DeveloperDashboard />
            </RequireRole>
          }
        />

        <Route
          path="/teacher/profile"
          element={
            <RequireRole role="teacher">
              <TeacherProfile />
            </RequireRole>
          }
        />
        <Route
          path="/teacher/students"
          element={
            <RequireRole role="teacher">
              <TeacherStudents />
            </RequireRole>
          }
        />
        <Route
          path="/teacher/manage-students"
          element={
            <RequireRole role="teacher">
              <TeacherManageStudents />
            </RequireRole>
          }
        />
        <Route
          path="/teacher/students/view"
          element={
            <RequireRole role="teacher">
              <TeacherStudentView />
            </RequireRole>
          }
        />

        <Route
          path="/developer/assign-roles"
          element={
            <RequireRole role="developer">
              <AssignRoles />
            </RequireRole>
          }
        />
        <Route
          path="/developer/manage-accounts"
          element={
            <RequireRole role="developer">
              <ManageAccounts />
            </RequireRole>
          }
        />
        <Route
          path="/developer/system-settings"
          element={
            <RequireRole role="developer">
              <SystemSettings />
            </RequireRole>
          }
        />
        <Route
          path="/developer/inquiries"
          element={
            <RequireRole role="developer">
              <DeveloperInquiries />
            </RequireRole>
          }
        />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppShell />
    </BrowserRouter>
  );
}
