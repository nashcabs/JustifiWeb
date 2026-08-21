import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext.jsx';
import { getDisplayName, subscribeToUsers } from '../../services/justifiFirebase.js';
import LogoutButton from '../../components/LogoutButton.jsx';


export default function DeveloperDashboard() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [counts, setCounts] = useState({
    totalUsers: 0,
    studentAccounts: 0,
    teacherAccounts: 0,
    developerAccounts: 0
  });
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if ((user.role || 'student') !== 'developer') {
      navigate('/login', { replace: true });
    }
  }, [loading, user, navigate]);

  const devName = useMemo(() => getDisplayName(user) || 'Organizational Admin', [user]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUsers(
      (allUsers) => {
        const users = Array.isArray(allUsers) ? allUsers : [];
        setLoadError('');
        const nonDevUsers = users.filter((u) => (u.role || 'student') !== 'developer');
        setCounts({
          totalUsers: nonDevUsers.length,
          studentAccounts: nonDevUsers.filter((u) => (u.role || 'student') === 'student').length,
          teacherAccounts: nonDevUsers.filter((u) => (u.role || 'student') === 'teacher').length,
          developerAccounts: users.filter((u) => (u.role || 'student') === 'developer').length
        });
      },
      (err) => {
        if (err?.code === 'permission-denied') {
          setLoadError('Firestore blocked the users collection. Check your users rules and developer access.');
        } else {
          setLoadError('Unable to load user counts right now.');
        }
        setCounts({ totalUsers: 0, studentAccounts: 0, teacherAccounts: 0, developerAccounts: 0 });
      }
    );

    return () => {
      try {
        unsubscribe?.();
      } catch {
        // ignore
      }
    };
  }, [user]);

  if (loading) return null;

  return (
    <div className="developer-page">
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <h1 className="brand-logo">JustiFi</h1>
        </a>

        <div className="topbar-right">
          <span className="welcome">
            Welcome, <strong id="navUserName">{devName}</strong>
          </span>
          <button
            id="menuBtn"
            className="menu-btn"
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>
        </div>
      </header>

      <div
        id="menuOverlay"
        className={['menu-overlay', menuOpen ? '' : 'hidden'].join(' ')}
        onClick={() => setMenuOpen(false)}
      />

      <aside id="sideMenu" className={['side-menu', menuOpen ? 'open' : ''].join(' ')}>
        <div className="side-menu-header">
          <h3>Menu</h3>
          <button id="closeMenuBtn" className="close-menu-btn" type="button" onClick={() => setMenuOpen(false)}>
            ✕
          </button>
        </div>

        <div className="side-menu-body">
          <button className="menu-link" onClick={() => navigate('/developer/assign-roles')}>Assign Roles</button>
          <button className="menu-link" onClick={() => navigate('/developer/manage-accounts')}>Manage Accounts</button>
         <button className="menu-link" onClick={() => navigate('/developer/inquiries')}>Manage Inquiries</button>
          <LogoutButton className="menu-link logout-btn" />
        </div>
      </aside>

      <div className="back-row">
        <a className="back-btn" href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          Back
        </a>
      </div>

      <main className="dashboard-shell">
        <section className="hero-card">
          <p className="eyebrow">JUSTIFI ORGANIZATIONAL ADMIN DASHBOARD</p>
          <h1>
            Hello, <span id="heroDevName">{devName}</span>
          </h1>
          <p className="hero-subtext">
            Manage roles, organize accounts, and configure the organizational admin controls of the JustiFi system.
          </p>
        </section>

        {loadError ? (
          <section className="content-card" role="alert">
            <p style={{ margin: 0, color: '#ffd0d0' }}>{loadError}</p>
          </section>
        ) : null}

        <section className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Users</span>
            <strong className="stat-value" id="totalUsers">{counts.totalUsers}</strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Student Accounts</span>
            <strong className="stat-value" id="studentAccounts">{counts.studentAccounts}</strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Teacher Accounts</span>
            <strong className="stat-value" id="teacherAccounts">{counts.teacherAccounts}</strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">Organizational Admin Accounts</span>
            <strong className="stat-value" id="developerAccounts">{counts.developerAccounts}</strong>
          </div>
        </section>

        <section className="content-card">
          <p className="card-kicker">QUICK ACCESS</p>
          <h2>Main Developer Tools</h2>

          <div className="action-grid developer-action-grid">
  <button
    className="feature-card"
    type="button"
    onClick={() => navigate('/developer/assign-roles')}
  >
    <h3>Assign Roles</h3>
    <p>
      Promote users or change account roles inside the system.
    </p>
  </button>

  <button
    className="feature-card"
    type="button"
    onClick={() => navigate('/developer/manage-accounts')}
  >
    <h3>Manage Accounts</h3>
    <p>
      View, organize, and monitor registered user accounts.
    </p>
  </button>
  <button
  className="feature-card"
  type="button"
  onClick={() => navigate('/developer/inquiries')}
>
  <h3>Manage Inquiries</h3>
  <p>
    Review and manage messages submitted through the JustiFi contact form.
  </p>
</button>
</div>
        </section>
      </main>
    </div>
  );
}
