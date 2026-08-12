import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { getStudents, logout } from '../../services/justifiFirebase.js';

function getAverageProgress(student) {
  const progress = Array.isArray(student?.progress) ? student.progress : [];
  if (!progress.length) return 0;

  const total = progress.reduce(
    (sum, value) => sum + Number((value?.score ?? value) || 0),
    0
  );

  return total / progress.length;
}

function getStudentName(student, index = 0) {
  return (
    student?.fullName ||
    [
      student?.firstName,
      student?.middleName,
      student?.lastName
    ]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    student?.email ||
    `Student ${index + 1}`
  );
}

function getInitials(name) {
  return String(name || 'S')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

export default function TeacherStudents() {
  const PAGE_SIZE = 10;
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [progressSort, setProgressSort] = useState('');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [loadError, setLoadError] = useState('');

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

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (!user) return;

        const result = await getStudents(user, {
          pageSize: PAGE_SIZE
        });
        if (cancelled) return;

        setLoadError('');
        setStudents(Array.isArray(result?.items) ? result.items : []);
        setNextCursor(result?.nextCursor || null);
        setHasMore(Boolean(result?.hasMore));

        console.log('AFTER student list query:', {
          returnedRecords: Array.isArray(result?.items)
            ? result.items.length
            : 0,
          pageSize: PAGE_SIZE,
          pagination: true,
          strategy: 'Firestore cursor + startAfter',
          hasMore: Boolean(result?.hasMore)
        });
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          const code = error?.code;
          let message = 'Failed to load students.';

          if (code === 'permission-denied') {
            message =
              'Firestore blocked access to the student list. Check teacher permissions and the users collection rules.';
          }

          setLoadError(message);
          setStudents([]);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const adminName = useMemo(() => {
    return (
      user?.fullName ||
      [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
      user?.email ||
      'Administrator'
    );
  }, [user]);

  const filtered = useMemo(() => {
    const keyword = String(search || '').toLowerCase().trim();
    const gradeKey = String(grade || '').toLowerCase().trim();
    const sectionKey = String(section || '').toLowerCase().trim();

    let list = (Array.isArray(students) ? students : []).filter((student) => {
      const fullName = getStudentName(student).toLowerCase();
      const email = String(student?.email || '').toLowerCase();

      const matchesSearch =
        !keyword ||
        fullName.includes(keyword) ||
        email.includes(keyword);

      const matchesGrade =
        !gradeKey ||
        String(student?.gradeLevel || '').toLowerCase().includes(gradeKey);

      const matchesSection =
        !sectionKey ||
        String(student?.section || '').toLowerCase().includes(sectionKey);

      return matchesSearch && matchesGrade && matchesSection;
    });

    if (progressSort === 'high') {
      list = [...list].sort(
        (a, b) => getAverageProgress(b) - getAverageProgress(a)
      );
    }

    if (progressSort === 'low') {
      list = [...list].sort(
        (a, b) => getAverageProgress(a) - getAverageProgress(b)
      );
    }

    return list;
  }, [students, search, progressSort, grade, section]);

  async function onLogout() {
    try {
      await logout();
    } catch {
      // Ignore logout failures and continue to login.
    }

    navigate('/login', { replace: true });
  }

  async function loadMoreStudents() {
    if (!user || loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);

    try {
      const result = await getStudents(user, {
        pageSize: PAGE_SIZE,
        cursor: nextCursor
      });

      const nextItems = Array.isArray(result?.items)
        ? result.items
        : [];

      setStudents((current) => {
        const existingIds = new Set(
          (Array.isArray(current) ? current : []).map(
            (student) => student.id || student.uid
          )
        );

        const uniqueItems = nextItems.filter((student) => {
          const id = student.id || student.uid;
          if (!id || existingIds.has(id)) {
            return false;
          }
          existingIds.add(id);
          return true;
        });

        return [...(Array.isArray(current) ? current : []), ...uniqueItems];
      });

      setNextCursor(result?.nextCursor || null);
      setHasMore(Boolean(result?.hasMore));
    } catch (error) {
      console.error(error);

      const code = error?.code;
      let message = 'Failed to load more students.';

      if (code === 'permission-denied') {
        message =
          'Firestore blocked access to the student list. Check teacher permissions and the users collection rules.';
      }

      setLoadError(message);
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) return null;

  return (
    <div className="mdps-admin-page mdps-students-page">
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

        <nav className="mdps-admin-nav" aria-label="Student list navigation">
          <button
            type="button"
            onClick={() => navigate('/dashboard/teacher')}
          >
            Dashboard
          </button>

          <button className="is-active" type="button">
            Students
          </button>

          <button
            type="button"
            onClick={() => navigate('/teacher/manage-students')}
          >
            Manage
          </button>
        </nav>

        <button
          className="mdps-mobile-menu"
          type="button"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
        >
          ☰
        </button>
      </header>

      <div
        className={['menu-overlay', menuOpen ? '' : 'hidden'].join(' ')}
        onClick={() => setMenuOpen(false)}
      />

      <aside className={['side-menu', menuOpen ? 'open' : ''].join(' ')}>
        <div className="side-menu-header">
          <div>
            <span className="mdps-side-menu-label">ADMIN ACCOUNT</span>
            <h3>{adminName}</h3>
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
            onClick={() => navigate('/teacher/profile')}
          >
            Profile
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
              S.Y. 2026–2027 · REGISTERED STUDENTS
            </p>

            <h1>Student Monitoring Directory</h1>

            <p>
              Search registered students and open an individual record to review
              learning progress, quiz performance, and achievements.
            </p>

            <div className="mdps-hero-actions">
              <button
                className="mdps-btn mdps-btn-light"
                type="button"
                onClick={() => navigate('/teacher/manage-students')}
              >
                Manage Student Records
              </button>

              <button
                className="mdps-btn mdps-btn-outline"
                type="button"
                onClick={() => navigate('/dashboard/teacher')}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </section>

        {loadError ? (
          <section className="mdps-alert-panel" role="alert">
            <strong>Unable to load the student directory</strong>
            <p>{loadError}</p>
          </section>
        ) : null}

        <section className="mdps-overview-panel mdps-directory-panel">
          <div className="mdps-panel-heading">
            <div>
              <p className="mdps-panel-kicker">FILTER DIRECTORY</p>
              <h2>Find a Student</h2>
            </div>

            <span className="mdps-result-count">
              {filtered.length} {filtered.length === 1 ? 'student' : 'students'}
            </span>
          </div>

          <div className="mdps-directory-filters">
            <div className="mdps-field mdps-filter-search">
              <label htmlFor="studentSearch">Student name or email</label>
              <div className="mdps-input-with-icon">
                <span aria-hidden="true">⌕</span>
                <input
                  id="studentSearch"
                  type="search"
                  placeholder="Search student name or email"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="mdps-field">
              <label htmlFor="progressFilter">Progress order</label>
              <select
                id="progressFilter"
                value={progressSort}
                onChange={(event) => setProgressSort(event.target.value)}
              >
                <option value="">Default order</option>
                <option value="high">Highest progress</option>
                <option value="low">Lowest progress</option>
              </select>
            </div>

            <div className="mdps-field">
              <label htmlFor="gradeFilter">Grade level</label>
              <input
                id="gradeFilter"
                type="text"
                placeholder="Example: Grade 11"
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
              />
            </div>

            <div className="mdps-field">
              <label htmlFor="sectionFilter">Section</label>
              <input
                id="sectionFilter"
                type="text"
                placeholder="Example: Section A"
                value={section}
                onChange={(event) => setSection(event.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="mdps-overview-panel mdps-directory-list-panel">
          <div className="mdps-panel-heading">
            <div>
              <p className="mdps-panel-kicker">STUDENT ACCOUNTS</p>
              <h2>Registered Students</h2>
            </div>
          </div>

          {!filtered.length ? (
            <div className="mdps-empty-state">
              <span aria-hidden="true">⌕</span>
              <h3>No students found</h3>
              <p>Try changing the search term or one of the filters.</p>
            </div>
          ) : (
            <>
              <div className="mdps-directory-grid">
                {filtered.map((student, index) => {
                  const id = student.id || student.uid || `student-${index + 1}`;
                  const fullName = getStudentName(student, index);
                  const average = Math.round(getAverageProgress(student));

                  return (
                    <button
                      key={id}
                      className="mdps-directory-card"
                      type="button"
                      onClick={() =>
                        navigate(
                          `/teacher/students/view?id=${encodeURIComponent(id)}`
                        )
                      }
                    >
                      <span className="mdps-directory-avatar">
                        {getInitials(fullName)}
                      </span>

                      <span className="mdps-directory-copy">
                        <strong>{fullName}</strong>
                        <small>{student.email || 'No email available'}</small>

                        <span className="mdps-directory-meta">
                          <em>{student.gradeLevel || 'No grade'}</em>
                          <em>{student.section || 'No section'}</em>
                          <em>{average}% progress</em>
                        </span>
                      </span>

                      <span className="mdps-directory-action">
                        View Progress
                        <span aria-hidden="true">→</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {hasMore ? (
                <div className="mdps-directory-load-more">
                  <button
                    className="mdps-btn mdps-btn-primary"
                    type="button"
                    onClick={loadMoreStudents}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading...' : 'Load More Students'}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </main>
    </div>
  );
}