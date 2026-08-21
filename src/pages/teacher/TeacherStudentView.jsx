import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Chart from 'chart.js/auto';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';

import { useAuth } from '../../contexts/AuthContext.jsx';
import { db } from '../../services/firebaseClient.js';
import TeacherAdminNav from '../../components/TeacherAdminNav.jsx';
  const BADGE_LIBRARY = {
  starter: {
    label: 'Starter',
    description: 'Created a JustiFi account',
    image: '/assets/Badges/badge1.png'
  },

  quiz_rookie: {
    label: 'Quiz Rookie',
    description: 'Recorded the first quiz score',
    image: '/assets/Badges/badge2.png'
  },

  consistent: {
    label: 'Consistent',
    description: 'Reached 70% average progress',
    image: '/assets/Badges/badge3.png'
  }
};
function useQueryParam(name) {
  const location = useLocation();

  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get(name);
  }, [location.search, name]);
}

function normalizeQuizValue(value) {
  if (!value) return 0;

  if (typeof value === 'number') {
    return value <= 1 ? Math.round(value * 100) : value;
  }

  if (value.latestPercent !== undefined) {
    return Math.round(Number(value.latestPercent) * 100);
  }

  if (value.bestPercent !== undefined) {
    return Math.round(Number(value.bestPercent) * 100);
  }

  if (value.percentage !== undefined) {
    return Number(value.percentage);
  }

  if (value.latestScore !== undefined && value.maxScore) {
    return Math.round(
      (Number(value.latestScore) / Number(value.maxScore)) * 100
    );
  }

  if (value.bestScore !== undefined && value.maxScore) {
    return Math.round(
      (Number(value.bestScore) / Number(value.maxScore)) * 100
    );
  }

  return 0;
}

function getQuizLabel(quiz, index) {
  const id = String(quiz?.quizId || '').toLowerCase();

  if (id.includes('ch1')) return 'Chapter 1';
  if (id.includes('ch2')) return 'Chapter 2';
  if (id.includes('ch3')) return 'Chapter 3';
  if (id.includes('ch4')) return 'Chapter 4';

  return `Quiz ${index + 1}`;
}

export default function TeacherStudentView() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const studentId = useQueryParam('id') || useQueryParam('uid');

  const [student, setStudent] = useState(null);
  const [floatingMessage, setFloatingMessage] = useState('');
  const [floatingType, setFloatingType] = useState('success');

  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if ((user.role || 'student') !== 'teacher') {
      navigate('/login', { replace: true });
    }
  }, [loading, user, navigate]);

  function showFloatingPanel(message, type = 'success') {
    setFloatingMessage(String(message || ''));
    setFloatingType(type);
    window.setTimeout(() => setFloatingMessage(''), 3000);
  }

  useEffect(() => {
    if (!studentId) {
      setStudent(null);
      showFloatingPanel('No student id provided.', 'error');
      return undefined;
    }

    let unsubscribe = null;

    async function start() {
      try {
        const studentRef = doc(db, 'users', studentId);
        const snapshot = await getDoc(studentRef);

        if (!snapshot.exists()) {
          const maybeEmail = decodeURIComponent(studentId || '');

          if (maybeEmail.includes('@')) {
            const result = await getDocs(
              query(
                collection(db, 'users'),
                where('email', '==', maybeEmail.toLowerCase().trim()),
                limit(1)
              )
            );

            if (!result.empty) {
              const matchedDocument = result.docs[0];

              setStudent({
                id: matchedDocument.id,
                ...matchedDocument.data()
              });

              unsubscribe = onSnapshot(
                doc(db, 'users', matchedDocument.id),
                (nextSnapshot) => {
                  setStudent(
                    nextSnapshot.exists()
                      ? {
                          id: nextSnapshot.id,
                          ...nextSnapshot.data()
                        }
                      : null
                  );
                }
              );

              return;
            }
          }

          setStudent(null);
          showFloatingPanel('Student not found in Firebase.', 'error');
          return;
        }

        setStudent({
          id: snapshot.id,
          ...snapshot.data()
        });

        unsubscribe = onSnapshot(studentRef, (nextSnapshot) => {
          setStudent(
            nextSnapshot.exists()
              ? {
                  id: nextSnapshot.id,
                  ...nextSnapshot.data()
                }
              : null
          );
        });
      } catch (error) {
        console.error(error);
        setStudent(null);
        showFloatingPanel('Failed to load student.', 'error');
      }
    }

    start();

    return () => {
      try {
        unsubscribe?.();
      } catch {
        // Ignore cleanup errors.
      }
    };
  }, [studentId]);

  const overview = useMemo(() => {
    const current = student || {};

    const fullName =
      current.fullName ||
      [current.firstName, current.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      current.email ||
      'Student';

    const progressData = Array.isArray(current.progress)
      ? current.progress
      : [];

    const completedLessons = progressData.length;
    const badges = Array.isArray(current.badges)
  ? current.badges
  : [];

const badgeCount = badges.length;
    const quizScoresRaw = Array.isArray(current.quizScores)
      ? current.quizScores
      : progressData;

    const quizScores = quizScoresRaw.map(normalizeQuizValue);

    const quizAverage = quizScores.length
      ? Math.round(
          quizScores.reduce(
            (sum, score) => sum + Number(score || 0),
            0
          ) / quizScores.length
        )
      : 0;

    

    return {
  fullName,
  completedLessons,
  badgeCount,
  badges,
  quizAverage,
  quizScores,
  gradeLevel: current.gradeLevel || 'Not assigned',
  section: current.section || 'Not assigned',
  email: current.email || 'Not available'
};
  }, [student]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const rawScores = Array.isArray(student?.quizScores)
      ? student.quizScores
      : [];

    const labels = rawScores.length
      ? rawScores.map(getQuizLabel)
      : overview.quizScores.map((_, index) => `Quiz ${index + 1}`);

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    chartRef.current = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Quiz Score',
            data: overview.quizScores,
            borderWidth: 3,
            tension: 0.35,
            borderColor: '#800020',
            backgroundColor: 'rgba(128, 0, 32, 0.10)',
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#800020',
            pointBorderWidth: 2,
            pointRadius: 4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#303845',
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.dataset.label}: ${context.raw || 0}%`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#697280',
              font: {
                size: 11,
                weight: '600'
              }
            },
            grid: {
              display: false
            },
            border: {
              display: false
            }
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              color: '#697280',
              callback(value) {
                return `${value}%`;
              }
            },
            grid: {
              color: 'rgba(128, 0, 32, 0.08)'
            },
            border: {
              display: false
            }
          }
        }
      }
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [overview.quizScores, student?.quizScores]);

  if (loading) return null;

  return (
    <div className="mdps-admin-page mdps-student-view-page">
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
              width="160"
              height="160"
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
          aria-label="Back to student list"
          onClick={() => navigate('/teacher/students')}
        >
          ←
        </button>
      </header>

      <main className="mdps-admin-main mdps-page-main">
        <section className="mdps-admin-hero mdps-student-profile-hero">
          <div className="mdps-student-profile-avatar" aria-hidden="true">
            {overview.fullName
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part.charAt(0))
              .join('')
              .toUpperCase()}
          </div>

          <div className="mdps-hero-copy">
            <p className="mdps-hero-eyebrow">STUDENT PROGRESS RECORD</p>
            <h1>{overview.fullName}</h1>

            <p>
              Review this student’s completed lessons, quiz scores, and
              achievement information.
            </p>

            <div className="mdps-student-hero-meta">
              <span>{overview.gradeLevel}</span>
              <span>{overview.section}</span>
              <span>{overview.email}</span>
            </div>

          </div>
        </section>

        <section className="mdps-overview-panel mdps-progress-panel">
          <div className="mdps-panel-heading">
            <div>
              <p className="mdps-panel-kicker">LIVE FIREBASE DATA</p>
              <h2>Progress Overview</h2>
            </div>
          </div>

          <div className="mdps-progress-stats">
            <article>
              <span>Completed Lessons</span>
              <strong>{overview.completedLessons}</strong>
              <small>Recorded learning activities</small>
            </article>

            <article>
              <span>Badges Earned</span>
              <strong>{overview.badgeCount}</strong>
              <small>Unlocked achievements</small>
            </article>

            <article>
              <span>Quiz Average</span>
              <strong>{overview.quizAverage}%</strong>
              <small>Average recorded score</small>
            </article>
          </div>

          <div className="mdps-progress-chart">
            {overview.quizScores.length ? (
              <canvas id="progressChart" ref={canvasRef} />
            ) : (
              <div className="mdps-chart-empty">
                <span aria-hidden="true">◇</span>
                <h3>No quiz scores recorded</h3>
                <p>Quiz performance will appear here after the student completes an assessment.</p>
              </div>
            )}
          </div>
<div className="mdps-achievement-section">
  <div className="mdps-achievement-heading">
    <div>
      <p className="mdps-panel-kicker">
        ACHIEVEMENT PROGRESS
      </p>

      <h2>Student Badges</h2>

      <p>
        Badges provide another indication of the student's
        participation and learning progress.
      </p>
    </div>

    <span className="mdps-badge-total">
      {overview.badgeCount} earned
    </span>
  </div>

  <div className="mdps-teacher-badge-grid">
    {Object.entries(BADGE_LIBRARY).map(
      ([badgeId, badge]) => {
        const earned =
          overview.badges.includes(badgeId);

        return (
          <article
            key={badgeId}
            className={[
              'mdps-teacher-badge',
              earned
                ? 'is-earned'
                : 'is-locked'
            ].join(' ')}
          >
            <div className="mdps-teacher-badge-image">
              <img
                src={badge.image}
                alt=""
                aria-hidden="true"
                width="120"
                height="120"
              />

              {!earned && (
                <span
                  className="mdps-badge-lock"
                  aria-hidden="true"
                >
                  🔒
                </span>
              )}
            </div>

            <div className="mdps-teacher-badge-copy">
              <h3>{badge.label}</h3>

              <p>{badge.description}</p>

              <span>
                {earned
                  ? 'Earned'
                  : 'Not yet earned'}
              </span>
            </div>
          </article>
        );
      }
    )}
  </div>
</div>
          
        </section>
      </main>

      <div
        className={[
          'floating-panel',
          floatingType,
          floatingMessage ? '' : 'hidden'
        ].join(' ')}
      >
        <span>{floatingMessage}</span>
      </div>
    </div>
  );
}