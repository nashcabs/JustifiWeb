import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getStudents, updateUserProfileById } from '../../services/justifiFirebase.js';
import TeacherAdminNav from '../../components/TeacherAdminNav.jsx';


export default function TeacherManageStudents() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [allStudents, setAllStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [edit, setEdit] = useState({
  gradeLevel: 'Grade 11',
  section: ''
});
  const [loadError, setLoadError] = useState('');

  const [floatingMessage, setFloatingMessage] = useState('');
  const [floatingType, setFloatingType] = useState('success');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if ((user.role || 'student') !== 'teacher') {
      navigate('/dashboard/student', { replace: true });
    }
  }, [loading, user, navigate]);

  function showFloatingPanel(message, type = 'success') {
    setFloatingMessage(String(message || ''));
    setFloatingType(type);
    window.setTimeout(() => setFloatingMessage(''), 3000);
  }

  async function load() {
    try {
      if (!user) return;
      const rows = await getStudents(user);
      setLoadError('');
      setAllStudents(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error(err);
      setLoadError(
        err?.code === 'permission-denied'
          ? 'Firestore blocked the student management list. Check teacher read permissions and users rules.'
          : 'Failed to load students.'
      );
      setAllStudents([]);
      showFloatingPanel('Failed to load students.', 'error');
    }
  }

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filtered = useMemo(() => {
    const term = String(search || '').toLowerCase().trim();
    const grade = String(gradeFilter || '').trim();

    let list = Array.isArray(allStudents) ? allStudents : [];

    if (term) {
      list = list.filter((s) => {
        const email = String(s.email || '').toLowerCase();
        const firstName = String(s.firstName || '').toLowerCase();
        const lastName = String(s.lastName || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        return email.includes(term) || firstName.includes(term) || lastName.includes(term) || fullName.includes(term);
      });
    }

    if (grade) {
      list = list.filter((s) => String(s.gradeLevel || '') === grade);
    }

    return list;
  }, [allStudents, search, gradeFilter]);

  function openEditModal(student) {
    setSelectedStudent(student);
    setEdit({
      gradeLevel: student.gradeLevel || 'Grade 11',
      section: student.section || ''
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedStudent(null);
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!selectedStudent?.id) {
      showFloatingPanel('No student selected', 'error');
      return;
    }

    setSaving(true);
    try {
      const updates = {
        gradeLevel: String(edit.gradeLevel || ''),
        section: String(edit.section || '').trim()
      };

      await updateUserProfileById(selectedStudent.id, updates);

      showFloatingPanel('Student information updated successfully!', 'success');
      closeModal();
      await load();
    } catch (err) {
      console.error(err);
      showFloatingPanel(`Failed to update student: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <div className="mdps-admin-page mdps-manage-page">
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
<TeacherAdminNav />

        <button
          className="mdps-mobile-menu"
          type="button"
          aria-label="Open dashboard"
          onClick={() => navigate('/dashboard/teacher')}
        >
          ←
        </button>
      </header>

      <main className="mdps-admin-main mdps-page-main">
        <section className="mdps-admin-hero mdps-page-hero">
          <div className="mdps-hero-logo">
            <img
              src="/assets/Background/mdps.svg"
              alt=""
              aria-hidden="true"
            />
          </div>

          <div className="mdps-hero-copy">
            <p className="mdps-hero-eyebrow">
              S.Y. 2026–2027 · STUDENT MANAGEMENT
            </p>
            <h1>Manage Student Records</h1>
            <p>
              Search registered students, review their academic information,
              and update grade level and section assignments.
            </p>

            <div className="mdps-hero-actions">
              <button
                className="mdps-btn mdps-btn-light"
                type="button"
                onClick={() => navigate('/dashboard/teacher')}
              >
                Back to Dashboard
              </button>

              <button
                className="mdps-btn mdps-btn-outline"
                type="button"
                onClick={load}
              >
                Refresh Students
              </button>
            </div>
          </div>
        </section>

        {loadError ? (
          <section className="mdps-alert-panel" role="alert">
            <strong>Unable to load students</strong>
            <p>{loadError}</p>
          </section>
        ) : null}

        <section className="mdps-overview-panel mdps-search-panel">
          <div className="mdps-panel-heading">
            <div>
              <p className="mdps-panel-kicker">FIND A RECORD</p>
              <h2>Search and Filter Students</h2>
            </div>

            <span className="mdps-result-count">
              {filtered.length} {filtered.length === 1 ? 'student' : 'students'}
            </span>
          </div>

          <div className="mdps-search-grid">
            <div className="mdps-field">
              <label htmlFor="searchInput">Name or email</label>
              <div className="mdps-input-with-icon">
                <span aria-hidden="true">⌕</span>
                <input
                  id="searchInput"
                  type="search"
                  placeholder="Search by name or email"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="mdps-field">
              <label htmlFor="gradeFilter">Grade level</label>
              <select
                id="gradeFilter"
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
              >
                <option value="">All Grades</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
              </select>
            </div>
          </div>
        </section>

        <section className="mdps-overview-panel mdps-student-list-panel">
          <div className="mdps-panel-heading">
            <div>
              <p className="mdps-panel-kicker">REGISTERED ACCOUNTS</p>
              <h2>Students</h2>
            </div>
          </div>

          <div className="mdps-student-table-wrap">
            <div className="mdps-student-table-head" aria-hidden="true">
              <span>Student</span>
              <span>Email</span>
              <span>Grade</span>
              <span>Section</span>
              <span>Role</span>
              <span />
            </div>

            <div className="mdps-student-table-body">
              {filtered.map((student) => {
                const id = student.id || student.uid;
                const fullName =
                  [student.firstName, student.lastName]
                    .filter(Boolean)
                    .join(' ')
                    .trim() ||
                  student.fullName ||
                  student.email ||
                  'Unnamed Student';

                const initials = fullName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part.charAt(0))
                  .join('')
                  .toUpperCase();

                return (
                  <button
                    key={id}
                    className="mdps-student-row"
                    type="button"
                    onClick={() => openEditModal(student)}
                  >
                    <span className="mdps-student-identity">
                      <span className="mdps-student-avatar">{initials || 'S'}</span>
                      <span>
                        <strong>{fullName}</strong>
                        <small>Click to edit student information</small>
                      </span>
                    </span>

                    <span className="mdps-student-email">{student.email || 'Not available'}</span>
                    <span>{student.gradeLevel || 'Not assigned'}</span>
                    <span>{student.section || 'Not assigned'}</span>
                    <span>
                      <em className="mdps-role-pill">{student.role || 'student'}</em>
                    </span>
                    <span className="mdps-row-action">Edit</span>
                  </button>
                );
              })}
            </div>
          </div>

          {!filtered.length ? (
            <div className="mdps-empty-state">
              <span aria-hidden="true">⌕</span>
              <h3>No students found</h3>
              <p>Try changing the search term or selected grade level.</p>
            </div>
          ) : null}
        </section>
      </main>

      <div
        id="editFormModal"
        className={['mdps-modal', modalOpen ? 'is-open' : ''].join(' ')}
        aria-hidden={!modalOpen}
      >
        <button
          className="mdps-modal-backdrop"
          type="button"
          aria-label="Close edit student dialog"
          onClick={closeModal}
        />

        <section
          className="mdps-modal-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-student-title"
        >
          <div className="mdps-modal-header">
            <div>
              <p className="mdps-panel-kicker">STUDENT RECORD</p>
              <h2 id="edit-student-title">
                Edit {selectedStudent
                  ? `${selectedStudent.firstName || ''} ${selectedStudent.lastName || ''}`.trim()
                  : 'Student'}
              </h2>
            </div>

            <button
              className="mdps-modal-close"
              type="button"
              aria-label="Close modal"
              onClick={closeModal}
            >
              ✕
            </button>
          </div>

          <form className="mdps-edit-form" onSubmit={onSubmit}>
            <div className="mdps-form-grid">
              <div className="mdps-field mdps-field-full">
                <label htmlFor="editEmail">Email</label>
                <input
                  id="editEmail"
                  type="email"
                  readOnly
                  value={selectedStudent?.email || ''}
                />
              </div>

              <div className="mdps-field">
                <label htmlFor="editFirstName">First name</label>
                <input
                  id="editFirstName"
                  type="text"
                  readOnly
                  value={selectedStudent?.firstName || ''}
                />
              </div>

              <div className="mdps-field">
                <label htmlFor="editLastName">Last name</label>
                <input
                  id="editLastName"
                  type="text"
                  readOnly
                  value={selectedStudent?.lastName || ''}
                />
              </div>

              <div className="mdps-field">
                <label htmlFor="editGradeLevel">Grade level</label>
                <select
                  id="editGradeLevel"
                  value={edit.gradeLevel}
                  onChange={(e) =>
                    setEdit((state) => ({
                      ...state,
                      gradeLevel: e.target.value
                    }))
                  }
                >
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>

              <div className="mdps-field">
                <label htmlFor="editSection">Section</label>
                <input
                  id="editSection"
                  type="text"
                  placeholder="Example: Section A"
                  value={edit.section}
                  onChange={(e) =>
                    setEdit((state) => ({
                      ...state,
                      section: e.target.value
                    }))
                  }
                />
              </div>

              <div className="mdps-field mdps-field-full">
                <label htmlFor="editSchool">School</label>
                <input
                  id="editSchool"
                  type="text"
                  readOnly
                  value={selectedStudent?.school || 'Mother of Divine Providence School'}
                />
              </div>
            </div>

            <div className="mdps-modal-actions">
              <button
                className="mdps-btn mdps-btn-cancel"
                type="button"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="mdps-btn mdps-btn-save"
                type="submit"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </section>
      </div>

      <div className={['floating-panel', floatingType, floatingMessage ? '' : 'hidden'].join(' ')}>
        <span id="floatingPanelMessage">{floatingMessage}</span>
      </div>
    </div>
  );
}