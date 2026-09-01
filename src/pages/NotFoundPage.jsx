import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <p className="not-found-kicker">404</p>
        <h1>Page not found</h1>
        <p>
          The page you’re looking for doesn’t exist or may have moved.
        </p>
        <button type="button" onClick={() => navigate('/')}>
          Back to home
        </button>
      </div>
    </div>
  );
}
