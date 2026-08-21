import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../services/justifiFirebase.js';

export default function LogoutButton({ className = '', children = 'Logout' }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirmLogout() {
    setBusy(true);
    try {
      await logout();
    } catch {
      // Redirect even if Firebase has already lost the session.
    } finally {
      navigate('/login', { replace: true });
    }
  }

  return (
    <>
      <button className={className} type="button" onClick={() => setOpen(true)}>
        {children}
      </button>

      {open ? (
        <div className="logout-modal-backdrop" role="presentation" onMouseDown={() => !busy && setOpen(false)}>
          <div
            className="logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="logout-modal-title">End current session?</h2>
            <p>Are you sure you want to end your current session?</p>
            <div className="logout-modal-actions">
              <button type="button" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
              <button type="button" onClick={confirmLogout} disabled={busy}>
                {busy ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}