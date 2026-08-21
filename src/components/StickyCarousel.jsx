import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../services/firebaseClient.js';

const ANNOUNCEMENT_COLLECTION = 'publicAnnouncements';

function getAnnouncementTime(item) {
  // Firestore Timestamp has toDate()
  if (item.createdAt && typeof item.createdAt.toDate === 'function') {
    return item.createdAt.toDate().getTime();
  }

  return new Date(item.createdAt || 0).getTime();
}

export default function StickyCarousel() {
  const [announcements, setAnnouncements] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadError, setLoadError] = useState('');

  const resolvedAnnouncements = useMemo(() => {
    if (loadError) {
      return [];
    }

    if (!announcements.length) {
      return [{ id: 'empty', title: 'No Announcements', description: 'Add one from the developer page.' }];
    }

    return announcements;
  }, [announcements, loadError]);

  useEffect(() => {
    const announcementQuery = query(
      collection(db, ANNOUNCEMENT_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      announcementQuery,
      (snapshot) => {
        const next = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((item) => item.title || item.description)
          .sort((a, b) => getAnnouncementTime(b) - getAnnouncementTime(a));

        setLoadError('');
        setAnnouncements(next);
        setActiveIndex(0);
      },
      (error) => {
        const isPermissionError = error?.code === 'permission-denied';
        if (!isPermissionError) {
          console.error('Error loading announcements:', error);
        }

        setLoadError(
          isPermissionError
            ? 'Announcements are unavailable because Firestore blocked read access. Check your rules and project settings.'
            : 'Announcements could not be loaded right now.'
        );
        setAnnouncements([]);
        setActiveIndex(0);
      }
    );
  }, []);



  const total = resolvedAnnouncements.length;
  const prevIndex = total > 0 ? (activeIndex - 1 + total) % total : 0;
  const nextIndex = total > 0 ? (activeIndex + 1) % total : 0;

  function goTo(offset) {
    if (total <= 1) return;
    setActiveIndex((idx) => (idx + offset + total) % total);
  }

  return (
    <div className="sticky-carousel" aria-label="Announcement sticky notes">
      {loadError ? (
        <div
          className="sticky-error"
          role="alert"
          style={{
            marginBottom: '12px',
            padding: '12px 14px',
            borderRadius: '14px',
            background: 'rgba(66, 16, 16, 0.92)',
            color: '#ffe6e6',
            border: '1px solid rgba(255, 125, 125, 0.45)',
            fontSize: '0.95rem',
            lineHeight: 1.45
          }}
        >
          {loadError}
        </div>
      ) : null}

      {loadError ? null : (
      <button
        className="sticky-arrow sticky-prev"
        type="button"
        aria-label="Previous announcement"
        onClick={() => goTo(-1)}
        style={{ display: total > 1 ? undefined : 'none' }}
      >
        <img src="/assets/Icons/right.svg" alt="" aria-hidden="true" width="32" height="32" />
      </button>
      )}

      <div className="sticky-window">
        {resolvedAnnouncements.map((item, index) => {
          const title = item.title || 'Announcement';
          const description = item.description || 'No description available.';

          const classes = ['sticky-note'];
          let ariaHidden = true;

          if (index === activeIndex) {
            classes.push('is-active');
            ariaHidden = false;
          } else if (total > 1 && index === prevIndex) {
            classes.push('is-prev');
          } else if (total > 1 && index === nextIndex) {
            classes.push('is-next');
          }

          return (
            <article key={item.id || index} className={classes.join(' ')} aria-hidden={ariaHidden}>
              <div className="sticky-pin" aria-hidden="true" />
              <div className="sticky-content">
                <h3 className="sticky-title">{title}</h3>
                <div className="sticky-body"><p>{description}</p></div>
              </div>
            </article>
          );
        })}
      </div>

      {loadError ? null : (
        <button
          className="sticky-arrow sticky-next"
          type="button"
          aria-label="Next announcement"
          onClick={() => goTo(1)}
          style={{ display: total > 1 ? undefined : 'none' }}
        >
          <img src="/assets/Icons/right.svg" alt="" aria-hidden="true" width="32" height="32" />
        </button>
      )}
    </div>
  );
}
