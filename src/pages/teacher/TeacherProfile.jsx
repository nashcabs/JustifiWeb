import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getDisplayName, logout, updateCurrentUserProfile } from '../../services/justifiFirebase.js';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../../services/firebaseClient.js';


const DEFAULT_AVATAR = '/assets/Profile/default-avatar.webp';

function formatValue(value) {
  if (!value) return 'Not available';
  try {
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not available';
    return date.toLocaleString();
  } catch {
    return 'Not available';
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export default function TeacherProfile() {
  const navigate = useNavigate();
  const { user, setUser, loading } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [floatingMessage, setFloatingMessage] = useState('');
  const [floatingType, setFloatingType] = useState('success');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    adminId: '',
    department: '',
    position: '',
    school: ''
  });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if ((user.role || 'student') !== 'teacher') {
      navigate('/dashboard/student', { replace: true });
      return;
    }

    setForm({
      firstName: user.firstName || '',
      middleName: user.middleName || '',
      lastName: user.lastName || '',
      adminId: user.adminId || '',
      department: user.department || '',
      position: user.position || '',
      schoolName: user.schoolName || ''
    });
  }, [loading, user, navigate]);

  const displayName = useMemo(() => getDisplayName(user) || user?.email || 'Admin', [user]);
 const profileImageSrc = useMemo(() => {
  return (
    user?.profileImage?.cloudUrl ||
    user?.profileImage?.localPath ||
    user?.avatarDataUrl ||
    DEFAULT_AVATAR
  );
}, [user]);

  function showFloatingPanel(message, type = 'success') {
    setFloatingMessage(String(message || ''));
    setFloatingType(type);
    window.setTimeout(() => setFloatingMessage(''), 3000);
  }

  async function onLogout() {
    try {
      await logout();
    } catch {
      // ignore
    }
    navigate('/login', { replace: true });
  }

  async function onSave() {
    if (!user) return;

    const firstName = String(form.firstName || '').trim();
    const middleName = String(form.middleName || '').trim();
    const lastName = String(form.lastName || '').trim();

    if (!firstName || !lastName) {
      showFloatingPanel('First name and last name are required.', 'error');
      return;
    }

    const fullName = [firstName, middleName, lastName]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const patch = {
      firstName,
      middleName,
      lastName,
      fullName,
      adminId: String(form.adminId || '').trim(),
      department: String(form.department || '').trim(),
      position: String(form.position || '').trim(),
      school: String(form.school || '').trim()
    };

    const isComplete =
      patch.firstName && patch.lastName && patch.adminId && patch.department && patch.position && patch.school;

    setSaving(true);
    try {
      const updatedUser = await updateCurrentUserProfile({
        ...patch,
        profileCompleted: !!isComplete
      });
      setUser?.(updatedUser);
      showFloatingPanel('Profile updated successfully.', 'success');
    } catch (err) {
      console.error(err);
      showFloatingPanel('Failed to save profile.', 'error');
    } finally {
      setSaving(false);
    }
  }

async function onProfileImageChange(e) {
  const file = e.target.files && e.target.files[0];
  if (!file || !user) return;

  if (!file.type.startsWith('image/')) {
    showFloatingPanel('Please select an image file only.', 'error');
    e.target.value = '';
    return;
  }

if (file.size > 10 * 1024 * 1024) {
  showFloatingPanel('Image is too large. Please upload below 10MB.', 'error');
  e.target.value = '';
  return;
}

  try {
    const fileExt = file.name.split('.').pop();
    const imageRef = ref(storage, `profileImages/${user.uid}/profile.${fileExt}`);

    await uploadBytes(imageRef, file);

    const downloadUrl = await getDownloadURL(imageRef);

    const updatedUser = await updateCurrentUserProfile({
      profileImage: {
        localPath: '',
        cloudUrl: downloadUrl
      }
    });

    setUser?.(updatedUser);
    showFloatingPanel('Profile image updated.', 'success');
  } catch (err) {
    console.error(err);
    showFloatingPanel('Failed to update profile image.', 'error');
  } finally {
    e.target.value = '';
  }
}

  if (loading) return null;

  return (
    <div className="mdps-admin-page mdps-profile-page">
      <header className="mdps-admin-header">
        <button
          className="mdps-admin-brand"
          type="button"
          onClick={() => navigate('/dashboard/teacher')}
          aria-label="Go to admin dashboard"
        >
          <span className="mdps-brand-logo-wrap">
            <img
              src="/assets/Background/mdps.svg"
              alt="Mother of Divine Providence School logo"
            />
          </span>

          <span className="mdps-brand-divider" aria-hidden="true" />

          <span className="mdps-brand-copy">
            <strong>Mother of Divine Providence School</strong>
            <span>SCHOOL MANAGEMENT SYSTEM</span>
          </span>
        </button>

        <nav className="mdps-admin-nav" aria-label="Profile page navigation">
          <button type="button" onClick={() => navigate('/dashboard/teacher')}>
            Dashboard
          </button>
          <button type="button" onClick={() => navigate('/teacher/students')}>
            Students
          </button>
          <button className="is-active" type="button">
            Profile
          </button>
        </nav>

        <button
          className="mdps-mobile-menu"
          type="button"
          aria-label="Open profile menu"
          onClick={() => setMenuOpen(true)}
        >
          ☰
        </button>
      </header>

      <div
        id="menuOverlay"
        className={['menu-overlay', menuOpen ? '' : 'hidden'].join(' ')}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        id="sideMenu"
        className={['side-menu', menuOpen ? 'open' : ''].join(' ')}
      >
        <div className="side-menu-header">
          <div>
            <span className="mdps-side-menu-label">ADMIN ACCOUNT</span>
            <h3>{displayName}</h3>
          </div>

          <button
            className="close-menu-btn"
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="side-menu-body">
          <button
            className="menu-link"
            type="button"
            onClick={() => navigate('/dashboard/teacher')}
          >
            Dashboard
          </button>

          <button
            className="menu-link"
            type="button"
            onClick={() => navigate('/teacher/students')}
          >
            Student List
          </button>

          <button
            className="menu-link"
            type="button"
            onClick={() => navigate('/teacher/manage-students')}
          >
            Manage Students
          </button>

          <button
            className="menu-link logout-btn"
            type="button"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="mdps-admin-main mdps-page-main">
        <section className="mdps-admin-hero mdps-profile-hero">
          <div className="mdps-profile-hero-content">
            <div className="mdps-profile-photo-wrap">
              <img
                className="mdps-profile-photo"
                src={profileImageSrc}
                alt={`${displayName} profile`}
              />

              <label
                htmlFor="profileImageInput"
                className="mdps-photo-edit"
                aria-label="Change profile photo"
              >
                ✎
              </label>

              <input
                id="profileImageInput"
                className="mdps-hidden-file-input"
                type="file"
                accept="image/*"
                onChange={onProfileImageChange}
              />
            </div>

            <div className="mdps-profile-hero-copy">
              <p className="mdps-hero-eyebrow">ADMINISTRATOR PROFILE</p>
              <h1>{displayName}</h1>
              <p>
                {form.position || 'School Administrator'} ·{' '}
                {form.department || 'Administration Department'}
              </p>

              <div className="mdps-profile-status-row">
                <span className="mdps-profile-status">
                  {user?.profileCompleted
                    ? 'Profile complete'
                    : 'Profile incomplete'}
                </span>

                <span className="mdps-profile-status mdps-profile-status-light">
                  {(user?.accountStatus || 'active').replace(
                    /^\w/,
                    (letter) => letter.toUpperCase()
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mdps-overview-panel mdps-profile-form-panel">
          <div className="mdps-panel-heading">
            <div>
              <p className="mdps-panel-kicker">ACCOUNT INFORMATION</p>
              <h2>Personal and Administrative Details</h2>
            </div>

            <button
              className="mdps-export-btn"
              type="button"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <form
            id="profileForm"
            className="mdps-profile-form"
            onSubmit={(event) => {
              event.preventDefault();
              onSave();
            }}
          >
            <div className="mdps-form-section">
              <div className="mdps-form-section-heading">
                <span aria-hidden="true">01</span>
                <div>
                  <strong>Personal Information</strong>
                  <small>
                    Basic identity information for your administrator account.
                  </small>
                </div>
              </div>

              <div className="mdps-form-grid mdps-profile-grid">
                <div className="mdps-field">
                  <label htmlFor="firstName">First name</label>
                  <input
                    id="firstName"
                    type="text"
                    value={form.firstName}
                    onChange={(event) =>
                      setForm((state) => ({
                        ...state,
                        firstName: event.target.value
                      }))
                    }
                  />
                </div>

                <div className="mdps-field">
                  <label htmlFor="middleName">Middle name</label>
                  <input
                    id="middleName"
                    type="text"
                    value={form.middleName}
                    onChange={(event) =>
                      setForm((state) => ({
                        ...state,
                        middleName: event.target.value
                      }))
                    }
                  />
                </div>

                <div className="mdps-field">
                  <label htmlFor="lastName">Last name</label>
                  <input
                    id="lastName"
                    type="text"
                    value={form.lastName}
                    onChange={(event) =>
                      setForm((state) => ({
                        ...state,
                        lastName: event.target.value
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="mdps-form-section">
              <div className="mdps-form-section-heading">
                <span aria-hidden="true">02</span>
                <div>
                  <strong>Administrative Information</strong>
                  <small>
                    School assignment, role, and department details.
                  </small>
                </div>
              </div>

              <div className="mdps-form-grid mdps-profile-grid">
                <div className="mdps-field">
                  <label htmlFor="adminId">Admin ID</label>
                  <input
                    id="adminId"
                    type="text"
                    value={form.adminId}
                    onChange={(event) =>
                      setForm((state) => ({
                        ...state,
                        adminId: event.target.value
                      }))
                    }
                  />
                </div>

                <div className="mdps-field">
                  <label htmlFor="department">Department</label>
                  <input
                    id="department"
                    type="text"
                    value={form.department}
                    onChange={(event) =>
                      setForm((state) => ({
                        ...state,
                        department: event.target.value
                      }))
                    }
                  />
                </div>

                <div className="mdps-field">
                  <label htmlFor="position">Position</label>
                  <input
                    id="position"
                    type="text"
                    value={form.position}
                    onChange={(event) =>
                      setForm((state) => ({
                        ...state,
                        position: event.target.value
                      }))
                    }
                  />
                </div>

                <div className="mdps-field mdps-field-full">
                  <label htmlFor="school">School</label>
                  <input
                    id="school"
                    type="text"
                    value={form.school}
                    onChange={(event) =>
                      setForm((state) => ({
                        ...state,
                        school: event.target.value
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="mdps-form-section">
              <div className="mdps-form-section-heading">
                <span aria-hidden="true">03</span>
                <div>
                  <strong>Account Details</strong>
                  <small>Read-only account and activity information.</small>
                </div>
              </div>

              <div className="mdps-account-grid">
                <article>
                  <span>Email</span>
                  <strong>{user?.email || 'Not available'}</strong>
                </article>

                <article>
                  <span>Role</span>
                  <strong>Teacher</strong>
                </article>

                <article>
                  <span>Account Status</span>
                  <strong>
                    {(user?.accountStatus || 'active').replace(
                      /^\w/,
                      (letter) => letter.toUpperCase()
                    )}
                  </strong>
                </article>

                <article>
                  <span>Created At</span>
                  <strong>{formatValue(user?.createdAt)}</strong>
                </article>

                <article>
                  <span>Last Updated</span>
                  <strong>{formatValue(user?.updatedAt)}</strong>
                </article>
              </div>
            </div>

            <div className="mdps-profile-actions">
              <button
                className="mdps-btn mdps-btn-cancel"
                type="button"
                onClick={() => navigate('/dashboard/teacher')}
              >
                Back to Dashboard
              </button>

              <button
                className="mdps-btn mdps-btn-save"
                type="submit"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </section>
      </main>

      <div
        className={[
          'floating-panel',
          floatingType,
          floatingMessage ? '' : 'hidden'
        ].join(' ')}
      >
        <span id="floatingPanelMessage">{floatingMessage}</span>
      </div>
    </div>
  );
}