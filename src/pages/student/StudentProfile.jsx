import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { logout, updateCurrentUserProfile } from '../../services/justifiFirebase.js';

import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../../services/firebaseClient.js';


const DEFAULT_AVATAR = '/assets/Profile/default-avatar.webp';



function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatBadgeLabel(value) {
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

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

export default function StudentProfile() {
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
    studentNumber: '',
    birthdate: '',
    age: '',
    sex: '',
    gradeLevel: '',
    section: '',
    school: ''
  });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    setForm({
      firstName: user.firstName || '',
      middleName: user.middleName || '',
      lastName: user.lastName || '',
      studentNumber: user.studentNumber || '',
      birthdate: user.birthdate || '',
      age: user.age || '',
      sex: user.sex || '',
      gradeLevel: user.gradeLevel || '',
      section: user.section || '',
      school: user.school || ''
    });
  }, [loading, user, navigate]);

  const displayName = useMemo(() => {
    const fallback = user?.email || 'Student';
    const composed = [user?.firstName, user?.middleName, user?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return user?.fullName || composed || fallback;
  }, [user]);

  const profileImageSrc = useMemo(() => {
  return user?.profileImage?.cloudUrl || user?.profileImage?.localPath || user?.avatarDataUrl || DEFAULT_AVATAR;
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
      studentNumber: String(form.studentNumber || '').trim(),
      birthdate: String(form.birthdate || '').trim(),
      age: form.age,
      sex: String(form.sex || '').trim(),
      gradeLevel: String(form.gradeLevel || '').trim(),
      section: String(form.section || '').trim(),
      school: String(form.school || '').trim()
    };

    const isComplete =
      patch.firstName &&
      patch.lastName &&
      patch.studentNumber &&
      patch.birthdate &&
      patch.sex &&
      patch.gradeLevel &&
      patch.section &&
      patch.school;

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
    <>
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <h1 className="brand-logo">JustiFi</h1>
        </a>

        <div className="topbar-right">
          <a className="manage-link" href="#" onClick={(e) => e.preventDefault()}>
            Profile
          </a>
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
          <button className="menu-link" onClick={() => navigate('/dashboard/student')}>
            Dashboard
          </button>
          <button className="menu-link logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>

      <div className="back-row">
        <a className="back-btn" href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard/student'); }}>
          Back
        </a>
      </div>

      <main className="profile-shell">
        <section className="profile-card">
          <div className="profile-image-wrap">
            <img id="profileImage" src={profileImageSrc} className="profile-img" alt="Profile photo" />
            <label htmlFor="profileImageInput" className="image-upload-btn" aria-label="Change photo">
              <img className="image-upload-icon" src="/assets/Icons/edit.png" alt="" aria-hidden="true" />
            </label>
          </div>

          <input
            id="profileImageInput"
            className="image-upload-input"
            type="file"
            accept="image/*"
            onChange={onProfileImageChange}
          />

          <h2 id="profileDisplayName">{displayName || 'Student'}</h2>
          <p id="userRole">{(user?.role || 'student').replace(/^\w/, (m) => m.toUpperCase())}</p>
          <p id="userStatus" className="sub-info">
            {user?.profileCompleted ? 'Profile Completed' : 'Complete your profile'}
          </p>

        </section>

        <section className="info-card">
          <div className="section-head">
            <h3>Personal Information</h3>
          </div>

          <form id="profileForm" className="info-grid" onSubmit={(e) => e.preventDefault()}>
            <div className="info-row">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                className="profile-input"
                type="text"
                value={form.firstName}
                onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))}
              />
            </div>

            <div className="info-row">
              <label htmlFor="middleName">Middle Name (optional)</label>
              <input
                id="middleName"
                className="profile-input"
                type="text"
                value={form.middleName}
                onChange={(e) => setForm((s) => ({ ...s, middleName: e.target.value }))}
              />
            </div>

            <div className="info-row">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                className="profile-input"
                type="text"
                value={form.lastName}
                onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))}
              />
            </div>

            <div className="info-row">
              <label htmlFor="studentNumber">Student Number</label>
              <input
                id="studentNumber"
                className="profile-input"
                type="text"
                value={form.studentNumber}
                onChange={(e) => setForm((s) => ({ ...s, studentNumber: e.target.value }))}
              />
            </div>

            <div className="info-row">
              <label htmlFor="birthdate">Birthdate</label>
              <input
                id="birthdate"
                className="profile-input"
                type="date"
                value={form.birthdate}
                onChange={(e) => setForm((s) => ({ ...s, birthdate: e.target.value }))}
              />
            </div>

            <div className="info-row">
              <label htmlFor="age">Age</label>
              <input
                id="age"
                className="profile-input"
                type="number"
                min="0"
                value={form.age}
                onChange={(e) => setForm((s) => ({ ...s, age: e.target.value }))}
              />
            </div>

            <div className="info-row">
              <label htmlFor="sex">Sex</label>
              <select
                id="sex"
                className="profile-input"
                value={form.sex}
                onChange={(e) => setForm((s) => ({ ...s, sex: e.target.value }))}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div className="info-row">
              <label htmlFor="gradeLevel">Grade Level</label>
              <input
                id="gradeLevel"
                className="profile-input"
                type="text"
                value={form.gradeLevel}
                onChange={(e) => setForm((s) => ({ ...s, gradeLevel: e.target.value }))}
              />
            </div>

            <div className="info-row">
              <label htmlFor="section">Section</label>
              <input
                id="section"
                className="profile-input"
                type="text"
                value={form.section}
                onChange={(e) => setForm((s) => ({ ...s, section: e.target.value }))}
              />
            </div>

            <div className="info-row">
              <label htmlFor="school">School</label>
              <input
                id="school"
                className="profile-input"
                type="text"
                value={form.school}
                onChange={(e) => setForm((s) => ({ ...s, school: e.target.value }))}
              />
            </div>

            <div className="info-row readonly-row">
              <span>Email</span>
              <strong id="email" dangerouslySetInnerHTML={{ __html: escapeHtml(user?.email || 'Not available') }} />
            </div>

            <div className="info-row readonly-row">
              <span>Role</span>
              <strong id="roleField">{(user?.role || 'student').replace(/^\w/, (m) => m.toUpperCase())}</strong>
            </div>

            <div className="info-row readonly-row">
              <span>Account Status</span>
              <strong id="accountStatus">{(user?.accountStatus || 'active').replace(/^\w/, (m) => m.toUpperCase())}</strong>
            </div>

            <div className="info-row readonly-row">
              <span>Created At</span>
              <strong id="createdAt">{formatValue(user?.createdAt)}</strong>
            </div>

            <div className="info-row readonly-row">
              <span>Last Updated</span>
              <strong id="updatedAt">{formatValue(user?.updatedAt)}</strong>
            </div>
          </form>

          <div className="form-actions">
            <button id="saveProfileBtn" className="edit-btn" type="button" onClick={onSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </section>
      </main>

      <div className={['floating-panel', floatingType, floatingMessage ? '' : 'hidden'].join(' ')}>
        <span id="floatingPanelMessage">{floatingMessage}</span>
      </div>
    </>
  );
}
