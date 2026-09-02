import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { useAuth } from '../../contexts/AuthContext.jsx';
import { auth } from '../../services/firebaseClient.js';
import {
  createUserAccountByAdmin,
  formatRoleLabel,
  STANDARD_SECTIONS,
  deactivateUserProfileById,
  subscribeToUsers,
  updateUserProfileById
} from '../../services/justifiFirebase.js';

const GRADE_LEVELS = ['Grade 11', 'Grade 12'];
const CLASS_SECTIONS = ['Section A', 'Section B'];

const EMPTY_EDIT = {
  firstName: '',
  lastName: '',
  gradeLevel: 'Grade 11',
  section: 'Section A'
};

const EMPTY_NEW_ACCOUNT = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'student',
  gradeLevel: 'Grade 11',
  section: 'Section A',
  assignedSections: []
};

export default function ManageAccounts() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [edit, setEdit] = useState(EMPTY_EDIT);
  const [saving, setSaving] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState(EMPTY_NEW_ACCOUNT);
  const [addingAccount, setAddingAccount] = useState(false);
  const [accountAction, setAccountAction] = useState(null);

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

  function openEditor(account) {
    setSelected(account);
    setEdit({
      firstName: account.firstName || '',
      lastName: account.lastName || '',
      gradeLevel: GRADE_LEVELS.includes(account.gradeLevel) ? account.gradeLevel : 'Grade 11',
      section: CLASS_SECTIONS.includes(account.section) ? account.section : 'Section A',
      assignedSections: Array.isArray(account.assignedSections)
        ? account.assignedSections
        : (account.assignedSection ? [account.assignedSection] : [])
    });
  }

  function handleNewRoleChange(nextRole) {
    setNewAccount((current) => ({
      ...current,
      role: nextRole,
      assignedSections: nextRole === 'teacher' ? current.assignedSections : []
    }));
  }

  async function saveAccount(event) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const nextAssignedSections = Array.isArray(edit.assignedSections)
        ? edit.assignedSections.filter((section) => typeof section === 'string' && section.trim())
        : [];

      await updateUserProfileById(selected.id, {
        firstName: edit.firstName.trim(),
        lastName: edit.lastName.trim(),
        fullName: `${edit.firstName.trim()} ${edit.lastName.trim()}`.trim(),
        ...(selected.role === 'student'
          ? { gradeLevel: edit.gradeLevel, section: edit.section }
          : selected.role === 'teacher'
            ? {
                assignedGradeLevel: '',
                assignedSection: nextAssignedSections[0] || '',
                assignedSections: nextAssignedSections
              }
            : { assignedGradeLevel: '', assignedSection: '', assignedSections: [] })
      });
      setSelected(null);
    } catch (saveError) {
      setError(`Failed to update account: ${saveError?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  async function addAccount(event) {
    event.preventDefault();
    setAddingAccount(true);
    setError('');
    setSuccessMessage('');

    try {
      const createdAccount = await createUserAccountByAdmin({
        email: newAccount.email,
        password: newAccount.password,
        firstName: newAccount.firstName,
        lastName: newAccount.lastName,
        role: newAccount.role,
        gradeLevel: newAccount.gradeLevel,
        section: newAccount.section,
        assignedSections: newAccount.role === 'teacher' ? newAccount.assignedSections : [],
        isActive: true
      });

      const displayName = `${createdAccount.firstName} ${createdAccount.lastName}`.trim() || createdAccount.email;
      setPopupMessage(`Account created successfully for ${displayName}. Verification email sent.`);

      setShowAddAccount(false);
      setNewAccount(EMPTY_NEW_ACCOUNT);

      window.setTimeout(() => {
        setPopupMessage('');
      }, 2500);
    } catch (addError) {
      const message = addError?.message || 'Unknown error';

      if (/unauthenticated|Unauthorized|401|session expired|sign in again/i.test(message)) {
        setError('Your admin session expired. Please sign in again as an Organizational Admin and try again.');
      } else {
        setError(`Failed to create account: ${message}`);
      }
    } finally {
      setAddingAccount(false);
    }
  }

  async function handleDeleteAccount() {
    if (!selected) return;

    const targetUid = selected.uid || selected.id;
    if (!targetUid) {
      setError('No account selected for deletion.');
      return;
    }

    setSaving(true);
    setError('');
    setAccountAction(null);

    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }

      const deleteUserAccount = httpsCallable(getFunctions(), 'deleteUserAccountByAdmin');
      await deleteUserAccount({ uid: targetUid });

      setSelected(null);
      setPopupMessage('Account deleted successfully.');
      window.setTimeout(() => {
        setPopupMessage('');
      }, 2500);
    } catch (deleteError) {
      const message = deleteError?.message || 'Unknown error';

      if (/401|unauthenticated|permission|not authorized|session expired/i.test(message)) {
        setError('Your admin session is invalid or expired. Please sign in again and try again.');
      } else {
        setError(`Failed to delete account: ${message}`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deactivateAccount() {
    if (!selected) return;

    setSaving(true);
    setError('');
    setAccountAction(null);

    try {
      if (selected.isActive === false) {
        await updateUserProfileById(selected.id, {
          isActive: true,
          accountStatus: 'active'
        });
        setSelected(null);
        setPopupMessage('Account activated successfully.');
        window.setTimeout(() => {
          setPopupMessage('');
        }, 2500);
        return;
      }

      await deactivateUserProfileById(selected.id);
      setSelected(null);
      setPopupMessage('Account deactivated successfully.');
      window.setTimeout(() => {
        setPopupMessage('');
      }, 2500);
    } catch (deactivateError) {
      setError(`Failed to update account status: ${deactivateError?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  function requestAccountAction(action) {
    if (!selected) return;
    setAccountAction(action);
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
            <button type="button" className="inquiry-action-btn" onClick={() => setShowAddAccount(true)}>
              Add account
            </button>
            <div className="inquiry-role-filter">
              <label htmlFor="account-role-filter">Filter by role</label>
              <select id="account-role-filter" className="inquiry-filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="">All roles</option><option value="student">Student</option><option value="teacher">Teacher</option><option value="developer">Organizational Admin</option>
              </select>
            </div>
          </div>

          {loadingAccounts ? <div className="inquiry-empty-state">Loading accounts...</div> : null}
          {!loadingAccounts && error ? <div className="inquiry-empty-state is-error">{error}</div> : null}
          {!loadingAccounts && !error && !successMessage && !filteredAccounts.length ? (
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
                    <div className="inquiry-subject"><strong>{formatRoleLabel(role)}</strong><p>{role === 'student' ? `${account.gradeLevel || 'No grade'} · ${account.section || 'No section'}` : 'Account access managed below'}</p></div>
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
                <label>Grade level<select value={edit.gradeLevel} onChange={(event) => setEdit({ ...edit, gradeLevel: event.target.value })}>{GRADE_LEVELS.map((grade) => <option key={grade}>{grade}</option>)}</select></label>
                <label htmlFor="account-section">Section</label>
                <select id="account-section" value={edit.section} onChange={(event) => setEdit({ ...edit, section: event.target.value })}>{CLASS_SECTIONS.map((section) => <option key={section}>{section}</option>)}</select>
              </>
            ) : null}

            {selected.role === 'teacher' ? (
              <div>
                <label>Assigned class</label>
                <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
                  {STANDARD_SECTIONS.filter((section) => section !== 'No Section').map((section) => (
                    <label key={section} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={Array.isArray(edit.assignedSections) && edit.assignedSections.includes(section)}
                        onChange={() => setEdit((current) => ({
                          ...current,
                          assignedSections: current.assignedSections.includes(section)
                            ? current.assignedSections.filter((item) => item !== section)
                            : [...current.assignedSections, section]
                        }))}
                      />
                      <span>{section}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="account-editor-actions"><button type="button" onClick={() => requestAccountAction('deactivate')} disabled={saving}>{selected.isActive === false ? 'Activate' : 'Deactivate'}</button><button type="button" onClick={() => requestAccountAction('delete')} disabled={saving}>Delete profile</button><button type="button" onClick={() => setSelected(null)}>Cancel</button><button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button></div>
          </form>
        </div>
      ) : null}

      {accountAction ? (
        <div className="logout-modal-backdrop" role="presentation" onMouseDown={() => !saving && setAccountAction(null)}>
          <div
            className="logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-action-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="account-action-title">
              {accountAction === 'delete' ? 'Delete account profile?' : selected?.isActive === false ? 'Activate account?' : 'Deactivate account?'}
            </h2>
            <p>
              {accountAction === 'delete'
                ? `This removes ${selected?.email || 'this account'} from Firestore. Firebase Auth credentials cannot be deleted from the browser.`
                : selected?.isActive === false
                  ? `This re-enables ${selected?.email || 'this account'} so they can sign in again.`
                  : `This prevents ${selected?.email || 'this account'} from signing in. Firebase Auth credentials will remain unchanged.`}
            </p>
            <div className="logout-modal-actions">
              <button type="button" onClick={() => setAccountAction(null)} disabled={saving}>Cancel</button>
              <button
                type="button"
                onClick={accountAction === 'delete' ? handleDeleteAccount : deactivateAccount}
                disabled={saving}
              >
                {saving ? 'Working...' : accountAction === 'delete' ? 'Delete profile' : selected?.isActive === false ? 'Activate' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {popupMessage ? (
        <div className="logout-modal-backdrop" role="presentation" onMouseDown={() => setPopupMessage('')}>
          <div className="logout-modal" role="dialog" aria-modal="true" aria-labelledby="popup-message-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="popup-message-title">Success</h2>
            <p>{popupMessage}</p>
            <div className="logout-modal-actions">
              <button type="button" onClick={() => setPopupMessage('')}>Close</button>
            </div>
          </div>
        </div>
      ) : null}

      {showAddAccount ? (
        <div className="account-editor-backdrop" role="presentation" onMouseDown={() => !addingAccount && setShowAddAccount(false)}>
          <form className="account-editor" onSubmit={addAccount} onMouseDown={(event) => event.stopPropagation()}>
            <div className="form-header">
              <h2>Add Account</h2>
              <button type="button" onClick={() => setShowAddAccount(false)} aria-label="Close add account form">X</button>
            </div>

            <label>First name<input value={newAccount.firstName} onChange={(event) => setNewAccount({ ...newAccount, firstName: event.target.value })} /></label>
            <label>Last name<input value={newAccount.lastName} onChange={(event) => setNewAccount({ ...newAccount, lastName: event.target.value })} /></label>
            <label>Email<input type="email" value={newAccount.email} onChange={(event) => setNewAccount({ ...newAccount, email: event.target.value })} /></label>
            <label>Password<input type="password" value={newAccount.password} onChange={(event) => setNewAccount({ ...newAccount, password: event.target.value })} /></label>

            <label htmlFor="new-account-role">Role</label>
            <select id="new-account-role" value={newAccount.role} onChange={(event) => handleNewRoleChange(event.target.value)}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="developer">Organizational Admin</option>
            </select>

            {newAccount.role === 'student' ? (
              <>
                <label>Grade level<select value={newAccount.gradeLevel} onChange={(event) => setNewAccount({ ...newAccount, gradeLevel: event.target.value })}>{GRADE_LEVELS.map((grade) => <option key={grade}>{grade}</option>)}</select></label>
                <label htmlFor="new-account-section">Section</label>
                <select id="new-account-section" value={newAccount.section} onChange={(event) => setNewAccount({ ...newAccount, section: event.target.value })}>{CLASS_SECTIONS.map((section) => <option key={section}>{section}</option>)}</select>
              </>
            ) : null}

            {newAccount.role === 'teacher' ? (
              <div className="teacher-assignment-panel">
                <label className="teacher-assignment-label">Assigned class</label>
                <div className="teacher-assignment-grid">
                  {STANDARD_SECTIONS.filter((section) => section !== 'No Section').map((section) => (
                    <label key={section} className="teacher-assignment-option">
                      <input
                        type="checkbox"
                        checked={newAccount.assignedSections.includes(section)}
                        onChange={() => setNewAccount((current) => ({
                          ...current,
                          assignedSections: current.assignedSections.includes(section)
                            ? current.assignedSections.filter((item) => item !== section)
                            : [...current.assignedSections, section]
                        }))}
                      />
                      <span>{section}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="account-editor-actions">
              <button type="button" onClick={() => setShowAddAccount(false)}>Cancel</button>
              <button type="submit" disabled={addingAccount}>{addingAccount ? 'Creating...' : 'Create account'}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
