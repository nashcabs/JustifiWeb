import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../services/justifiFirebase.js';

export default function TeacherAdminNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const path = location.pathname;

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // ignore logout failures and continue to login
    }

    navigate('/login', { replace: true });
  }

  // Check which page is currently open
  const isDashboard = path === '/dashboard/teacher';

  const isProfile = path.startsWith('/teacher/profile');

  const isStudentList =
    path === '/teacher/students' ||
    path.startsWith('/teacher/students/');

  const isManage = path.startsWith('/teacher/manage-students');

  return (
    <nav
      className="mdps-admin-nav"
      aria-label="Admin navigation"
    >
      {/* WEBSITE */}
      <button
        type="button"
        onClick={() => navigate('/')}
      >
        Website
      </button>

      {/* DASHBOARD */}
      <button
        type="button"
        className={isDashboard ? 'is-active' : ''}
        onClick={() => navigate('/dashboard/teacher')}
      >
        Dashboard
      </button>

      {/* ADMIN PROFILE */}
      <button
        type="button"
        className={isProfile ? 'is-active' : ''}
        onClick={() => navigate('/teacher/profile')}
      >
        Admin Profile
      </button>

      {/* STUDENT LIST */}
      <button
        type="button"
        className={isStudentList ? 'is-active' : ''}
        onClick={() => navigate('/teacher/students')}
      >
        Student List
      </button>

      {/* MANAGE STUDENTS */}
      <button
        type="button"
        className={isManage ? 'is-active' : ''}
        onClick={() => navigate('/teacher/manage-students')}
      >
        Manage Student
      </button>

      <button
        type="button"
        className="mdps-admin-logout"
        onClick={handleLogout}
      >
        Logout
      </button>
    </nav>
  );
}