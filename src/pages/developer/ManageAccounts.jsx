import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext.jsx';
import { subscribeToUsers } from '../../services/justifiFirebase.js';

export default function ManageAccounts() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if ((user.role || 'student') !== 'developer') {
      navigate('/dashboard/student', { replace: true });
    }
  }, [loading, user, navigate]);

useEffect(() => {
  if (!user) return;

  setLoadingAccounts(true);
  setError('');

  const unsubscribe = subscribeToUsers(
    (users) => {
      setAccounts(Array.isArray(users) ? users : []);
      setLoadingAccounts(false);
      setError('');
    },
    (err) => {
      console.error(err);
      setAccounts([]);
      setLoadingAccounts(false);
      setError('Failed to load accounts.');
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

  const filteredAccounts = useMemo(() => {
    const term = String(search || '').toLowerCase().trim();
    const role = String(roleFilter || '').toLowerCase().trim();

    let list = Array.isArray(accounts) ? accounts : [];

    if (role) {
      list = list.filter((account) => String(account.role || 'student').toLowerCase() === role);
    }

    if (term) {
      list = list.filter((account) => {
        const email = String(account.email || '').toLowerCase();
        const firstName = String(account.firstName || '').toLowerCase();
        const lastName = String(account.lastName || '').toLowerCase();
        const fullName = String(account.fullName || `${firstName} ${lastName}`).toLowerCase();
        return email.includes(term) || firstName.includes(term) || lastName.includes(term) || fullName.includes(term);
      });
    }

    return list;
  }, [accounts, search, roleFilter]);

  const accountCountLabel = `${filteredAccounts.length} ${filteredAccounts.length === 1 ? 'account' : 'accounts'}`;

  if (loading) return null;

  return (
    <div className="developer-page">
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard/developer'); }}>
          <h1>JustiFi</h1>
        </a>

        <div className="topbar-right">
          <span className="welcome">Manage Accounts</span>
        </div>
      </header>

      <div className="back-row">
        <a className="back-btn" href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard/developer'); }}>
          Back
        </a>
      </div>

      <main className="page-shell">
        <section className="hero-card">
          <p className="eyebrow">DEVELOPER TOOL</p>
          <h1>Manage Accounts</h1>
          <p className="hero-subtext">View and filter registered accounts across the system.</p>
        </section>

        <section className="panel-card">
          <div className="panel-head">
            <h2>Account Directory</h2>
            <span className="student-count">{accountCountLabel}</span>
            <div className="toolbar">
              <input
                className="search-input"
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="filter-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All roles</option>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="developer">Developer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {loadingAccounts ? <div className="empty-state">Loading accounts...</div> : null}
          {!loadingAccounts && error ? <div className="empty-state">{error}</div> : null}
          {!loadingAccounts && !error && !filteredAccounts.length ? (
            <div className="empty-state">No accounts found.</div>
          ) : null}

          {!loadingAccounts && !error && filteredAccounts.length ? (
            <div className="users-list">
              {filteredAccounts.map((account) => {
                const id = account.id || account.uid || account.email;
                const fullName =
                  account.fullName ||
                  [account.firstName, account.lastName].filter(Boolean).join(' ').trim() ||
                  account.email ||
                  'User';
                const role = account.role || 'student';
                const status = account.accountStatus || 'active';

                return (
                  <div key={id} className="user-item">
                    <div className="user-info">
                      <div className="user-name">{fullName}</div>
                      <div className="user-email">{account.email || 'No email'}</div>
                      <div className="user-role">Role: <strong>{role}</strong></div>
                      <div className="user-role">Status: <strong>{status}</strong></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
