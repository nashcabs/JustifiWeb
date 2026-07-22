import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

// FIXED: IDs now match exactly what Unity sends via AchievementManager.cs
const BADGE_GROUPS = [
  {
    title: 'Quiz Badges',
    badges: [
      { id: 'ACH_BADGE_PARALEGAL', alt: 'Paralegal badge', src: '/assets/Badges/ACH_BADGE_PARALEGAL.png' },
      { id: 'ACH_BADGE_TOPNOTCHER', alt: 'Topnotcher badge', src: '/assets/Badges/ACH_BADGE_TOPNOTCHER.png' },
      { id: 'ACH_BADGE_DEANS_LISTER', alt: 'Deans Lister badge', src: '/assets/Badges/ACH_BADGE_DEANS_LISTER.png' },
      { id: 'ACH_BADGE_SUPREME_SCHOLAR', alt: 'Supreme Scholar badge', src: '/assets/Badges/ACH_BADGE_SUPREME_SCHOLAR.png' }
    ]
  },
  {
    title: 'Chapter Shields',
    requirePrevious: true,
    badges: [
      { id: 'ACH_SHIELD_1', alt: 'Chapter 1 shield', src: '/assets/Badges/1.png' },
      { id: 'ACH_SHIELD_2', alt: 'Chapter 2 shield', src: '/assets/Badges/2.png' },
      { id: 'ACH_SHIELD_3', alt: 'Chapter 3 shield', src: '/assets/Badges/3.png' },
      { id: 'ACH_SHIELD_4', alt: 'Chapter 4 shield', src: '/assets/Badges/4.png' }
    ]
  },
  {
    title: 'Gameplay Achievements',
    badges: [
      { id: 'ACH_TROPHY_GOOD_ENDING', alt: 'Good Ending trophy', src: '/assets/Badges/ACH_TROPHY_GOOD_ENDING.png' },
      { id: 'ACH_TROPHY_FLAWLESS', alt: 'Flawless trophy', src: '/assets/Badges/ACH_TROPHY_FLAWLESS.png' },
      { id: 'ACH_TROPHY_BAD_ENDING', alt: 'Bad Ending trophy', src: '/assets/Badges/ACH_TROPHY_BAD_ENDING.png' },
      { id: 'ACH_TROPHY_COMPLETIONIST', alt: 'Completionist trophy', src: '/assets/Badges/ACH_TROPHY_COMPLETIONIST.png' }
    ]
  }
];

export default function StudentBadges() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate('/login', { replace: true });
  }, [loading, user, navigate]);

  const earned = useMemo(() => new Set(Array.isArray(user?.badges) ? user.badges : []), [user]);

  if (loading) return null;

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => e.preventDefault()}>
          <h1 className="brand-logo">JustiFi</h1>
        </a>

        <div className="topbar-right">
          <a className="manage-link" href="#" onClick={(e) => e.preventDefault()}>
            Badges
          </a>
        </div>
      </header>

      <div className="back-row">
        <a className="back-btn" href="#" onClick={(e) => { e.preventDefault(); navigate('/dashboard/student'); }}>
          Back
        </a>
      </div>

      <div className="badges-page">
        <h1>Your Badges</h1>
        <div className="badges-groups">
          {BADGE_GROUPS.map((group) => (
            <section className="badge-group" key={group.title}>
              <h2>{group.title}</h2>

              <div className="badges-grid">
                {group.badges.map((b, idx) => {
                  const isEarned = earned.has(b.id);
                  const previousBadge = idx > 0 ? group.badges[idx - 1] : null;
                  const previousEarned = previousBadge ? earned.has(previousBadge.id) : true;
                  const isChapterLockedByOrder = group.requirePrevious && idx > 0 && !previousEarned;

                  return (
                    <div
                      key={b.id}
                      className={[
                        'badge',
                        isEarned ? '' : 'locked',
                        isChapterLockedByOrder ? 'finish-first' : ''
                      ].join(' ').trim()}
                    >
                      <img className="badge-img" alt={b.alt} src={b.src} />
                      {isChapterLockedByOrder && (
                        <p className="badge-lock-text">Finish previous chapter first</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}