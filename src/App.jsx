import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RequireRole from './components/RequireRole.jsx';

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

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
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
          </Routes>
        </Suspense>
      </BrowserRouter>
    );
  }
