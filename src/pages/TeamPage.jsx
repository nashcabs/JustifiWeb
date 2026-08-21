import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function TeamPage() {
  const navigate = useNavigate();

  return (
    <>
      <main className="team-page">
        <button
          type="button"
          id="backButton"
          className="team-back-button"
          onClick={() => navigate('/', { state: { scrollTo: 'about' } })}
        >
          BACK
        </button>

        <section className="team-showcase-page">
          <h1 className="team-title">JAVACHIP.EXE</h1>

          <div className="team-grid">
            <figure className="team-card">
              <img src="/assets/Team/nash.png" alt="CABIA, Nash Daniel S." width="640" height="640" />
              <figcaption className="team-overlay">
                <h3>CABIA</h3>
                <div>Nash Daniel S.</div>
                <p>Web Developer</p>
              </figcaption>
            </figure>

            <figure className="team-card">
              <img src="/assets/Team/zel.png" alt="DE GUZMAN, Grazelle P." width="640" height="640" />
              <figcaption className="team-overlay">
                <h3>DE GUZMAN</h3>
                <div>Grazelle P.</div>
                <p>Documenter / Technical Writer</p>
              </figcaption>
            </figure>

            <figure className="team-card">
              <img src="/assets/Team/maru.png" alt="ESTABILLO, Yuan Maru A." width="640" height="640" />
              <figcaption className="team-overlay">
                <h3>ESTABILLO</h3>
                <div>Yuan Maru A.</div>
                <p>Project Manager</p>
              </figcaption>
            </figure>

            <figure className="team-card">
              <img src="/assets/Team/jehu.png" alt="GIPAYA, Jehu S." width="640" height="640" />
              <figcaption className="team-overlay">
                <h3>GIPAYA</h3>
                <div>Jehu S.</div>
                <p>System Designer</p>
              </figcaption>
            </figure>

            <figure className="team-card">
              <img src="/assets/Team/kobe.jpg" alt="HUFANCIA, Kobe Jan Dave M." width="640" height="640" />
              <figcaption className="team-overlay">
                <h3>HUFANCIA</h3>
                <div>Kobe Jan Dave M.</div>
                <p>System Designer</p>
              </figcaption>
            </figure>

            <figure className="team-card">
              <img src="/assets/Team/q.png" alt="SALVADOR, Qjuin Dominic" width="640" height="640" />
              <figcaption className="team-overlay">
                <h3>SALVADOR</h3>
                <div>Qjuin Dominic</div>
                <p>System Analyst / Game Developer</p>
              </figcaption>
            </figure>
          </div>
        </section>
      </main>
    </>
  );
}
