import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext.jsx';
import {
  formatRoleLabel,
  STANDARD_SECTIONS,
  subscribeToUsers,
  updateUserProfileById
} from '../../services/justifiFirebase.js';

const EMPTY_EDIT = {
  firstName: '',
  lastName: '',
  gradeLevel: '',
  section: 'No Section',
  assignedSections: [],
  isActive: true
};

export default function ManageAccounts() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [edit, setEdit] = useState(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);

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

    let list = Array.isArray(accounts)
      ? accounts.filter((account) => String(account.role || 'student').toLowerCase() !== 'developer')
      : [];

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

  function openEditor(account) {
    setSelected(account);
    setEdit({
      firstName: account.firstName || '',
      lastName: account.lastName || '',
      gradeLevel: account.gradeLevel || '',
      section: STANDARD_SECTIONS.includes(account.section) ? account.section : 'No Section',
      assignedSections: Array.isArray(account.assignedSections) ? account.assignedSections : [],
      isActive: account.isActive !== false
    });
  }

  function toggleSection(section) {
    setEdit((current) => ({
      ...current,
      assignedSections: current.assignedSections.includes(section)
        ? current.assignedSections.filter((item) => item !== section)
        : [...current.assignedSections, section]
    }));
  }

  async function saveAccount(event) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await updateUserProfileById(selected.id, {
        firstName: edit.firstName.trim(),
        lastName: edit.lastName.trim(),
        fullName: `${edit.firstName.trim()} ${edit.lastName.trim()}`.trim(),
        ...(selected.role === 'student'
          ? { gradeLevel: edit.gradeLevel.trim(), section: edit.section }
          : { assignedSections: edit.assignedSections }),
        isActive: edit.isActive,
        accountStatus: edit.isActive ? 'active' : 'inactive'
      });
      setSelected(null);
    } catch (saveError) {
      setError(`Failed to update account: ${saveError?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <div className="developer-page developer-inquiries-page">
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
          <p className="hero-subtext">Review, organize, and update registered accounts across the system.</p>
        </section>

        <section className="inquiry-stats">
          <article className="inquiry-stat-card inquiry-stat-total"><span className="inquiry-stat-label">Total Accounts</span><strong className="inquiry-stat-value">{accounts.length}</strong></article>
          <article className="inquiry-stat-card inquiry-stat-resolved"><span className="inquiry-stat-label">Active</span><strong className="inquiry-stat-value">{accounts.filter((account) => account.isActive !== false).length}</strong></article>
          <article className="inquiry-stat-card inquiry-stat-unread"><span className="inquiry-stat-label">Inactive</span><strong className="inquiry-stat-value">{accounts.filter((account) => account.isActive === false).length}</strong></article>
        </section>

        <section className="panel-card inquiry-panel">
          <div className="inquiry-panel-head">
            <div><p className="card-kicker">USER DIRECTORY</p><h2>Account Inbox</h2></div>
            <span className="inquiry-count">{accountCountLabel}</span>
          </div>

          <div className="inquiry-toolbar">
            <input className="inquiry-search" type="search" placeholder="Search name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <label htmlFor="account-role-filter">Filter by role</label>
            <select id="account-role-filter" className="inquiry-filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All roles</option><option value="student">Student</option><option value="teacher">Teacher</option><option value="developer">Organizational Admin</option>
            </select>
          </div>

          {loadingAccounts ? <div className="inquiry-empty-state">Loading accounts...</div> : null}
          {!loadingAccounts && error ? <div className="inquiry-empty-state is-error">{error}</div> : null}
          {!loadingAccounts && !error && !filteredAccounts.length ? (
            <div className="inquiry-empty-state"><strong>No accounts found</strong><p>Try changing the search or role filter.</p></div>
          ) : null}

          {!loadingAccounts && !error && filteredAccounts.length ? (
            <div className="inquiry-list">
              {filteredAccounts.map((account) => {
                const id = account.id || account.uid || account.email;
                const fullName =
                  account.fullName ||
                  [account.firstName, account.lastName].filter(Boolean).join(' ').trim() ||
                  account.email ||
                  'User';
                const role = account.role || 'student';
                const status = account.isActive === false ? 'inactive' : 'active';

                return (
                  <button key={id} className={['inquiry-item', status === 'inactive' ? 'is-unread' : ''].join(' ')} type="button" onClick={() => openEditor(account)}>
                    <div className="inquiry-main"><strong>{fullName}</strong><span>{account.email || 'No email'}</span></div>
                    <div className="inquiry-subject"><strong>{formatRoleLabel(role)}</strong><p>{role === 'teacher' ? `${account.assignedSections?.length || 0} assigned section(s)` : account.section || 'No section assigned'}</p></div>
                    <div className="inquiry-meta"><span className={`inquiry-status status-${status}`}>{status}</span><small>Click to edit</small></div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>
      </main>

      {selected ? (
        <div className="account-editor-backdrop" role="presentation" onMouseDown={() => !saving && setSelected(null)}>
          <form className="account-editor" onSubmit={saveAccount} onMouseDown={(event) => event.stopPropagation()}>
            <div className="form-header">
              <h2>Edit Account</h2>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close editor">X</button>
            </div>
            <p>{selected.email} · {formatRoleLabel(selected.role)}</p>
            <label>First name<input value={edit.firstName} onChange={(event) => setEdit({ ...edit, firstName: event.target.value })} /></label>
            <label>Last name<input value={edit.lastName} onChange={(event) => setEdit({ ...edit, lastName: event.target.value })} /></label>
            {selected.role === 'student' ? (
              <>
                <label>Grade level<input value={edit.gradeLevel} onChange={(event) => setEdit({ ...edit, gradeLevel: event.target.value })} /></label>
                <label htmlFor="account-section">Section</label>
                <select id="account-section" value={edit.section} onChange={(event) => setEdit({ ...edit, section: event.target.value })}>{STANDARD_SECTIONS.map((section) => <option key={section}>{section}</option>)}</select>
              </>
            ) : null}
            {selected.role === 'teacher' ? (
              <fieldset><legend>Assigned sections</legend>{STANDARD_SECTIONS.filter((section) => section !== 'No Section').map((section) => <label className="section-checkbox" key={section}><input type="checkbox" checked={edit.assignedSections.includes(section)} onChange={() => toggleSection(section)} />{section}</label>)}</fieldset>
            ) : null}
            <label className="active-toggle"><input type="checkbox" checked={edit.isActive} onChange={(event) => setEdit({ ...edit, isActive: event.target.checked })} /> Active account</label>
            <div className="account-editor-actions"><button type="button" onClick={() => setSelected(null)}>Cancel</button><button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button></div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
