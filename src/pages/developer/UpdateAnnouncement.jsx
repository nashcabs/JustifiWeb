import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';

import { useAuth } from '../../contexts/AuthContext.jsx';
import { db } from '../../services/firebaseClient.js';

const ANNOUNCEMENT_COLLECTION = 'publicAnnouncements';

function isPermissionDenied(error) {
  return !!(error && (error.code === 'permission-denied' || /permission/i.test(error.message || '')));
}

function formatSortDate(timestamp) {
  if (!timestamp) return 0;
  try {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.getTime();
  } catch {
    return 0;
  }
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  try {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

export default function UpdateAnnouncement() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const isDeveloper = (user?.role || '').toLowerCase() === 'developer';

  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('• ');
  const [announcements, setAnnouncements] = useState([]);

  const [toast, setToast] = useState({ message: '', type: 'success' });

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

  function showToast(message, type = 'success') {
    setToast({ message: String(message || ''), type });
    window.setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  }

  async function loadAnnouncements() {
    try {
      const snap = await getDocs(query(collection(db, ANNOUNCEMENT_COLLECTION), orderBy('createdAt', 'desc')));
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => formatSortDate(b.createdAt) - formatSortDate(a.createdAt));
      setAnnouncements(rows);
      return;
    } catch (err) {
      console.error(err);
    }

    setAnnouncements([]);
  }

  useEffect(() => {
    if (!user) return;
    loadAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setDescription('• ');
  }

  async function onSubmit(e) {
    e.preventDefault();

    const t = String(title || '').trim();
    const d = String(description || '').trim();

    if (!t || !d) {
      showToast('Title and description are required', 'error');
      return;
    }

    if (!isDeveloper) {
      showToast('Sign in as Developer to manage announcements', 'error');
      return;
    }

    try {
      const payload = {
        title: t,
        description: d,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        try {
          await setDoc(doc(db, ANNOUNCEMENT_COLLECTION, editingId), payload, { merge: true });
          showToast('Announcement updated successfully!', 'success');
        } catch (saveError) {
          if (!isPermissionDenied(saveError)) throw saveError;
          showToast('Firestore denied update. Check developer permissions.', 'error');
        }
      } else {
        const newRef = doc(collection(db, ANNOUNCEMENT_COLLECTION));
        const createdId = newRef.id;
        const createPayload = {
          title: t,
          description: d,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        try {
          await setDoc(newRef, createPayload);
          showToast('Announcement added successfully!', 'success');
        } catch (saveError) {
          if (!isPermissionDenied(saveError)) throw saveError;
          showToast('Firestore denied create. Check developer permissions.', 'error');
        }
      }

      resetForm();
      await loadAnnouncements();
    } catch (err) {
      console.error(err);
      showToast(`Failed to save announcement: ${err?.message || 'Unknown error'}`, 'error');
    }
  }

  function onEdit(id) {
    const ann = announcements.find((a) => a.id === id);
    if (!ann) return;

    setEditingId(id);
    setTitle(ann.title || '');
    setDescription(ann.description || '');

    document.querySelector('.announcement-form')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function onDelete(id) {
    // matches legacy confirm() UX
    // eslint-disable-next-line no-alert
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      try {
        await deleteDoc(doc(db, ANNOUNCEMENT_COLLECTION, id));
        showToast('Announcement deleted successfully!', 'success');
      } catch (deleteError) {
        if (!isPermissionDenied(deleteError)) throw deleteError;
        showToast('Firestore denied delete. Check developer permissions.', 'error');
      }

      await loadAnnouncements();
    } catch (err) {
      console.error(err);
      showToast(`Failed to delete announcement: ${err?.message || 'Unknown error'}`, 'error');
    }
  }

  const formTitle = editingId ? 'Edit Announcement' : isDeveloper ? 'Add New Announcement' : 'Sign in as Developer to manage announcements';
  const submitLabel = editingId ? 'Update Announcement' : 'Add Announcement';

  const disabled = !isDeveloper;

  const announcementCountLabel = `${announcements.length} ${announcements.length === 1 ? 'announcement' : 'announcements'}`;

  const resetVisible = !!editingId;

  function onDescriptionFocus() {
    if (String(description || '').trim() === '') setDescription('• ');
  }

  function onDescriptionKeyDown(e) {
    if (e.key !== 'Enter') return;

    e.preventDefault();

    const el = e.target;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = String(description || '');

    const beforeCursor = value.substring(0, start);
    const currentLine = beforeCursor.split('\n').pop();

    // If current bullet is empty, pressing Enter stops the bullet list
    if (currentLine.trim() === '•') {
      const newValue = value.substring(0, start - currentLine.length) + value.substring(end);
      setDescription(newValue);

      window.setTimeout(() => {
        el.selectionStart = el.selectionEnd = start - currentLine.length;
      }, 0);

      return;
    }

    const newValue = value.substring(0, start) + '\n• ' + value.substring(end);
    setDescription(newValue);

    window.setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + 3;
    }, 0);
  }

  if (loading) return null;

  return (
    <div className="developer-page">
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <h1 className="brand-logo">JustiFi</h1>
        </a>
        <div className="topbar-right">
          <span className="welcome">Announcements</span>
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
          <h1>Update Announcement</h1>
          <p className="hero-subtext">Create, edit, or remove system-wide announcements that will appear on the homepage.</p>
        </section>

        <section className="panel-card">
          <div className="panel-head">
            <h2 id="formTitle">{formTitle}</h2>
            <button
              id="resetFormBtn"
              className="reset-btn"
              style={{ display: resetVisible ? 'inline-flex' : 'none' }}
              type="button"
              onClick={resetForm}
              disabled={disabled}
            >
              ✕ Cancel
            </button>
          </div>

          <form id="announcementForm" className="announcement-form" onSubmit={onSubmit}>
            <div className="form-group">
              <label htmlFor="announcementTitle">Title *</label>
              <input
                type="text"
                id="announcementTitle"
                placeholder="Enter announcement title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={disabled}
              />
            </div>

            <div className="form-group">
              <label htmlFor="announcementDescription">Description *</label>
              <textarea
                id="announcementDescription"
                placeholder="Enter announcement details"
                rows={5}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={onDescriptionFocus}
                onKeyDown={onDescriptionKeyDown}
                disabled={disabled}
              />
            </div>

            <div className="form-actions">
  <button
    className="assign-btn"
    id="submitBtn"
    type="submit"
    disabled={disabled}
  >
    {submitLabel}
  </button>

  <button
    className="close-form-btn cancel-announcement-btn"
    id="resetFormBtn2"
    type="button"
    onClick={resetForm}
    disabled={disabled}
  >
    Cancel
  </button>
</div>
          </form>
        </section>

        <section className="panel-card">
          <div className="panel-head">
            <h2>Current Announcements</h2>
            <span id="announcementCount" className="announcement-count">{announcementCountLabel}</span>
          </div>

          <div id="announcementsList" className="announcements-list">
            {announcements.map((ann) => {
              const actions = isDeveloper ? (
                <div className="announcement-item-actions">
                  <button className="action-btn" type="button" onClick={() => onEdit(ann.id)}>
                    Edit
                  </button>
                  <button className="action-btn delete" type="button" onClick={() => onDelete(ann.id)}>
                    Delete
                  </button>
                </div>
              ) : (
                <div className="announcement-item-actions" />
              );

              return (
                <div key={ann.id} className="announcement-item">
                  <div className="announcement-item-header">
                    <h3 className="announcement-item-title">{ann.title || ''}</h3>
                    <span className="announcement-item-date">{formatDate(ann.createdAt)}</span>
                  </div>
                  <p className="announcement-item-description">{ann.description || ''}</p>
                  {actions}
                </div>
              );
            })}
          </div>

          <div id="emptyState" className="empty-state" style={{ display: announcements.length ? 'none' : 'block' }}>
            <p>No announcements yet. Create one to get started!</p>
          </div>
        </section>
      </main>

      {toast.message ? (
        <div
          id="notificationPanel"
          style={{
            position: 'fixed',
            bottom: 30,
            right: 30,
            padding: '16px 24px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            zIndex: 10000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            backgroundColor: toast.type === 'error' ? '#f44336' : toast.type === 'info' ? '#2196f3' : '#4caf50',
            color: '#fff'
          }}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
