import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Chart from 'chart.js/auto';
import * as XLSX from 'xlsx';

import { useAuth } from '../../contexts/AuthContext.jsx';
import { getDisplayName, getStudents, logout } from '../../services/justifiFirebase.js';


function hasAnyProgress(progress) {
  if (!Array.isArray(progress)) return false;
  return progress.some((v) => Number(v?.score ?? v) > 0);
}

function normalizeQuizScorePercent(value) {
  if (!value) return null;

  if (typeof value === 'number') {
    return value <= 1 ? Math.round(value * 100) : value;
  }

  if (value.latestPercent !== undefined) {
    return Math.round(Number(value.latestPercent) * 100);
  }

  if (value.bestPercent !== undefined) {
    return Math.round(Number(value.bestPercent) * 100);
  }

  if (
    value.latestScore !== undefined &&
    value.maxScore
  ) {
    return Math.round(
      (Number(value.latestScore) /
        Number(value.maxScore)) *
        100
    );
  }

  if (
    value.bestScore !== undefined &&
    value.maxScore
  ) {
    return Math.round(
      (Number(value.bestScore) /
        Number(value.maxScore)) *
        100
    );
  }

  return null;
}

function computeAverageQuizScorePercent(students) {
  let total = 0;
  let count = 0;

  for (const student of students || []) {
    const scores = Array.isArray(student.quizScores) ? student.quizScores : [];
    for (const s of scores) {
      const percent = normalizeQuizScorePercent(s);
      if (percent === null) continue;
      total += percent;
      count += 1;
    }
  }

  return count ? total / count : 0;
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [floatingMessage, setFloatingMessage] = useState('');
  const [floatingType, setFloatingType] = useState('success');
  const [students, setStudents] = useState([]);

  const canvasRef = useRef(null);
  const chartRef = useRef(null);

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

  const adminName = useMemo(() => getDisplayName(user) || 'Admin', [user]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        if (!user) return;
        const rows = await getStudents(user);
        if (!cancelled) setStudents(Array.isArray(rows) ? rows : []);
      } catch (err) {
        console.error(err);
        if (!cancelled) setStudents([]);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const summary = useMemo(() => {
    const list = Array.isArray(students) ? students : [];
    const totalStudents = list.length;
    const activeStudents = list.filter((s) => String(s.accountStatus || 'active').toLowerCase() === 'active').length;
    const completedProfiles = list.filter((s) => !!s.profileCompleted).length;
    const studentsWithProgress = list.filter((s) => hasAnyProgress(s.progress)).length;
    const averageQuizScore = Math.round(computeAverageQuizScorePercent(list));
    const overallCompletion = totalStudents ? Math.round((completedProfiles / totalStudents) * 100) : 0;

    return {
      totalStudents,
      activeStudents,
      completedProfiles,
      studentsWithProgress,
      averageQuizScore,
      overallCompletion
    };
  }, [students]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    chartRef.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: [
          'Total Students',
          'Active Students',
          'Completed Profiles',
          'Students with Progress',
          'Average Quiz Score'
        ],
        datasets: [
          {
            label: 'Admin Overview',
            data: [
              summary.totalStudents ?? 0,
              summary.activeStudents ?? 0,
              summary.completedProfiles ?? 0,
              summary.studentsWithProgress ?? 0,
              summary.averageQuizScore ?? 0
            ],
            backgroundColor: [
              '#7f001f',
              '#98052c',
              '#b11a43',
              '#cb3a61',
              '#df6f8c'
            ],
            borderColor: '#7f001f',
            borderWidth: 1,
            borderRadius: 8,
            maxBarThickness: 54
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || '';
                const value = context.raw ?? 0;
                return label === 'Average Quiz Score'
                  ? `${label}: ${value}%`
                  : `${label}: ${value}`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#586171',
              font: { size: 11, weight: '600' }
            },
            grid: { display: false },
            border: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#7a8492',
              precision: 0
            },
            grid: { color: 'rgba(120, 0, 32, 0.08)' },
            border: { display: false }
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
  }, [summary]);

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

  function onPrintData() {
    try {
      const list = Array.isArray(students) ? students : [];
      if (!list.length) {
        showFloatingPanel('No student data available to export.', 'error');
        return;
      }

      const summaryRows = [
        { Metric: 'Total Students', Value: list.length },
        {
          Metric: 'Active Students',
          Value: list.filter((s) => String(s.accountStatus || 'active').toLowerCase() === 'active').length
        },
        { Metric: 'Completed Profiles', Value: list.filter((s) => !!s.profileCompleted).length },
        { Metric: 'Students with Progress', Value: list.filter((s) => hasAnyProgress(s.progress)).length },
        { Metric: 'Average Quiz Score', Value: `${Math.round(computeAverageQuizScorePercent(list))}%` }
      ];

      const studentRows = list.map((student) => {
        const progressItems = Array.isArray(student.progress) ? student.progress : [];
        const quizScores = Array.isArray(student.quizScores) ? student.quizScores : [];
        const avg = quizScores.length
          ? Math.round(
              quizScores.reduce((sum, s) => sum + (normalizeQuizScorePercent(s) || 0), 0) / quizScores.length
            )
          : 0;

        return {
          Name:
            student.fullName ||
            [student.firstName, student.lastName].filter(Boolean).join(' ').trim() ||
            student.email ||
            '',
          Email: student.email || '',
          Role: student.role || 'student',
          GradeLevel: student.gradeLevel || '',
          Section: student.section || '',
          Status: student.accountStatus || 'active',
          ProfileCompleted: student.profileCompleted ? 'Yes' : 'No',
          CompletedLessons: progressItems.length,
          BadgeCount: Array.isArray(student.badges) ? student.badges.length : 0,
          QuizAverage: `${avg}%`
        };
      });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(studentRows), 'Students');

      const fileName = `student-monitoring-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      showFloatingPanel('Student data exported to Excel.', 'success');
    } catch (err) {
      console.error(err);
      showFloatingPanel('Failed to export student data.', 'error');
    }
  }

  if (loading) return null;

  return (
    <div className="mdps-admin-page">
      <header className="mdps-admin-header">
        <button
          className="mdps-admin-brand"
          type="button"
          onClick={() => navigate('/')}
          aria-label="Go to the JustiFi website"
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

        <nav className="mdps-admin-nav" aria-label="Admin dashboard navigation">
          <button type="button" onClick={() => navigate('/')}>
            Website
          </button>
          <button type="button" onClick={() => navigate('/teacher/students')}>
            Students
          </button>
          <button
            className="is-active"
            type="button"
            onClick={() => setMenuOpen(true)}
          >
            Admin
          </button>
        </nav>

        <button
          className="mdps-mobile-menu"
          type="button"
          aria-label="Open admin menu"
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

      <aside id="sideMenu" className={['side-menu', menuOpen ? 'open' : ''].join(' ')}>
        <div className="side-menu-header">
          <div>
            <span className="mdps-side-menu-label">ADMIN ACCOUNT</span>
            <h3>{adminName}</h3>
          </div>
          <button
            id="closeMenuBtn"
            className="close-menu-btn"
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="side-menu-body">
          <button className="menu-link" onClick={() => navigate('/teacher/profile')}>
            Profile
          </button>
          <button className="menu-link" onClick={() => navigate('/teacher/students')}>
            Student List
          </button>
          <button className="menu-link" onClick={() => navigate('/teacher/manage-students')}>
            Manage Students
          </button>
          <button className="menu-link" onClick={onPrintData}>
            Export Student Data
          </button>
          <button className="menu-link logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="mdps-admin-main">
        <section className="mdps-admin-hero">
          <div className="mdps-hero-logo">
            <img
              src="/assets/Background/mdps.svg"
              alt=""
              aria-hidden="true"
            />
          </div>

          <div className="mdps-hero-copy">
            <p className="mdps-hero-eyebrow">
              S.Y. 2026–2027 · JUSTIFI ADMIN
            </p>
            <h1>Mother of Divine Providence School</h1>
            <p>
              Welcome, <strong>{adminName}</strong>. Review registered students,
              monitor learning progress, and manage academic information from
              one dashboard.
            </p>

            <div className="mdps-hero-actions">
              <button
                className="mdps-btn mdps-btn-light"
                type="button"
                onClick={() => navigate('/teacher/students')}
              >
                <span aria-hidden="true">◉</span>
                View Student List
              </button>

              <button
                className="mdps-btn mdps-btn-outline"
                type="button"
                onClick={() => navigate('/teacher/manage-students')}
              >
                <span aria-hidden="true">↻</span>
                Manage Students
              </button>
            </div>
          </div>
        </section>

        <section className="mdps-process-section" aria-labelledby="admin-process-title">
          <div className="mdps-section-heading">
            <span className="mdps-heading-icon" aria-hidden="true">◇</span>
            <h2 id="admin-process-title">Administration Process</h2>
          </div>

          <div className="mdps-process-grid">
            <button
              className="mdps-process-card"
              type="button"
              onClick={() => navigate('/teacher/students')}
            >
              <span className="mdps-process-number">1</span>
              <strong>Review Students</strong>
              <p>Open the complete student list and review registered accounts.</p>
              <span className="mdps-process-arrow" aria-hidden="true">›</span>
            </button>

            <button
              className="mdps-process-card"
              type="button"
              onClick={() => navigate('/teacher/students')}
            >
              <span className="mdps-process-number">2</span>
              <strong>Monitor Progress</strong>
              <p>Check learning activity, quiz scores, and completion status.</p>
              <span className="mdps-process-arrow" aria-hidden="true">›</span>
            </button>

            <button
              className="mdps-process-card"
              type="button"
              onClick={() => navigate('/teacher/manage-students')}
            >
              <span className="mdps-process-number">3</span>
              <strong>Manage Records</strong>
              <p>Update grade levels, sections, and student information.</p>
              <span className="mdps-process-arrow" aria-hidden="true">›</span>
            </button>

            <button
              className="mdps-process-card"
              type="button"
              onClick={onPrintData}
            >
              <span className="mdps-process-number">4</span>
              <strong>Export Reports</strong>
              <p>Download the latest student monitoring data as an Excel file.</p>
            </button>
          </div>
        </section>

        <section className="mdps-overview-panel">
          <div className="mdps-panel-heading">
            <div>
              <p className="mdps-panel-kicker">LIVE FIREBASE DATA</p>
              <h2>Student Monitoring Overview</h2>
            </div>

            <button className="mdps-export-btn" type="button" onClick={onPrintData}>
              Export Data
            </button>
          </div>

          <div className="mdps-stats-grid">
            <article className="mdps-stat-card">
              <span>Total Students</span>
              <strong>{summary.totalStudents}</strong>
              <small>Registered accounts</small>
            </article>

            <article className="mdps-stat-card">
              <span>Active Students</span>
              <strong>{summary.activeStudents}</strong>
              <small>Currently active</small>
            </article>

            <article className="mdps-stat-card">
              <span>Overall Completion</span>
              <strong>{summary.overallCompletion}%</strong>
              <small>Completed profiles</small>
            </article>

            <article className="mdps-stat-card">
              <span>Average Quiz Score</span>
              <strong>{summary.averageQuizScore}%</strong>
              <small>Across recorded quizzes</small>
            </article>
          </div>

          <div className="mdps-chart-wrap">
            <canvas id="adminOverviewChart" ref={canvasRef} />
          </div>
        </section>

        <section className="mdps-quick-panel">
          <div className="mdps-panel-heading">
            <div>
              <p className="mdps-panel-kicker">QUICK ACCESS</p>
              <h2>Administrative Tools</h2>
            </div>
          </div>

          <div className="mdps-quick-grid">
            <button type="button" onClick={() => navigate('/teacher/profile')}>
              <span className="mdps-quick-icon" aria-hidden="true">A</span>
              <span>
                <strong>Admin Profile</strong>
                <small>View and update your account information.</small>
              </span>
            </button>

            <button type="button" onClick={() => navigate('/teacher/students')}>
              <span className="mdps-quick-icon" aria-hidden="true">S</span>
              <span>
                <strong>Student List</strong>
                <small>Review individual progress, scores, and performance.</small>
              </span>
            </button>

            <button type="button" onClick={() => navigate('/teacher/manage-students')}>
              <span className="mdps-quick-icon" aria-hidden="true">M</span>
              <span>
                <strong>Manage Students</strong>
                <small>Edit grade level, section, and academic information.</small>
              </span>
            </button>
          </div>
        </section>
      </main>

      <div className={['floating-panel', floatingType, floatingMessage ? '' : 'hidden'].join(' ')}>
        <span id="floatingPanelMessage">{floatingMessage}</span>
      </div>
    </div>
  );
}