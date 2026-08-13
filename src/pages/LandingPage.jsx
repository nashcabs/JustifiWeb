import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { initLandingPage } from '../legacy/landing-init.js';
import {
  getDashboardPath,
  getDisplayName,
  submitContactMessage,
} from '../services/justifiFirebase.js';

const GAME_FEATURES = [
  'Interactive Visual Novel Gameplay',
  'Branching Decision-Making',
  'Legal Explanations After Choices',
  'Quizzes and Assessments',
  'Achievements & Progress Tracking',
  'Offline Play with Cloud Sync',
];

const LEARNING_MODULES = [
  {
    icon: '🛡️',
    title: 'Youth Protection & Welfare',
    description:
      "Learn about RA 7610 and children's rights under Philippine law through scenarios involving minors in vulnerable situations.",
  },
  {
    icon: '🌈',
    title: 'Gender & Safe Spaces',
    description:
      'Explore the Safe Spaces Act and gender-based protections through stories about respect, boundaries, and consent.',
  },
  {
    icon: '💻',
    title: 'Cyber Safety & Online Behavior',
    description:
      'Navigate digital rights, cyberbullying, and online harassment laws through interactive social media scenarios.',
  },
];

const TEAM_MEMBERS = [
  {
    name: 'Cabia, Nash Daniel S.',
    role: 'Web Developer',
    initials: 'NC',
    photo: '/assets/Team/nash.png',
  },
  {
    name: 'De Guzman, Grazelle P.',
    role: 'Documenter / Technical Writer',
    initials: 'GD',
    photo: '/assets/Team/zel.png',
  },
  {
    name: 'Estabillo, Yuan Maru A.',
    role: 'Project Manager',
    initials: 'YE',
    photo: '/assets/Team/maru.png',
  },
  {
    name: 'Gipaya, Jehu S.',
    role: 'System Designer',
    initials: 'JG',
    photo: '/assets/Team/jehu.png',
  },
  {
    name: 'Hufancia, Kobe Jan Dave M.',
    role: 'System Designer',
    initials: 'JG',
    photo: '/assets/Team/kobe.jpg',
  },
  {
    name: 'Salvador, Qjuin Dominic',
    role: 'System Analyst / Game Developer',
    initials: 'QS',
    photo: '/assets/Team/q.png',
  },
  
];

const SUPPORT_PARTNER_ASSETS = {
  ncmhLogo: '/assets/Background/ncmh.svg',
  pnpLogo: '/assets/Background/pnp.svg',
  partnerLogo: '/assets/Background/mdps.svg',
  partnerPhoto: '/assets/Background/collab.png',
};

const CHARACTER_CARDS = [
  { src: '/assets/Index/Justice.svg', alt: 'Justice character card' },
  { src: '/assets/Index/Lawson.svg', alt: 'Lawson character card' },
  { src: '/assets/Index/alfonso.svg', alt: 'Alfonso character card' },
  { src: '/assets/Index/Alex.svg', alt: 'Alex character card' },
  { src: '/assets/Index/Cora.svg', alt: 'Cora character card' },
  { src: '/assets/Index/Cynthia.svg', alt: 'Cynthia character card' },
  { src: '/assets/Index/Guzman.svg', alt: 'Guzman character card' },
  { src: '/assets/Index/Ian.svg', alt: 'Ian character card' },
  { src: '/assets/Index/Riri.svg', alt: 'Riri character card' },
];


function hideBrokenImage(event) {
  event.currentTarget.style.display = 'none';
}




export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactSending, setContactSending] = useState(false);
const [contactStatus, setContactStatus] = useState('');
const [contactSuccess, setContactSuccess] = useState(false);

  const navLabel = useMemo(() => getDisplayName(user), [user]);
  const navHref = useMemo(
    () => (user ? getDashboardPath(user) : '/login'),
    [user],
  );
  const floatingLabel = user ? 'ACCOUNT' : 'LOGIN';
  const floatingAria = user ? 'Account' : 'Login';

  useEffect(() => {
    const scrollTarget = location.state?.scrollTo;
    if (!scrollTarget) return;

    document.getElementById(scrollTarget)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });

    navigate('.', { replace: true, state: {} });
  }, [location.state, navigate]);

  useEffect(() => {
    if (!location.hash) return;

    document
      .getElementById(location.hash.slice(1))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    }

    function handleResize() {
      if (window.innerWidth > 768) {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    // React StrictMode mounts components twice in development.
    if (window.__justifiLandingInitRan) return undefined;

    window.__justifiLandingInitRan = true;
    const cleanup = initLandingPage();

    return () => {
      try {
        cleanup?.();
      } finally {
        window.__justifiLandingInitRan = false;
      }
    };
  }, []);
async function handleContactSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);

  const payload = {
    name: String(formData.get('name') || '').trim(),
    email: String(formData.get('email') || '').trim(),
    subject: String(formData.get('subject') || '').trim(),
    message: String(formData.get('message') || '').trim(),
  };

  setContactSending(true);
  setContactStatus('');
  setContactSuccess(false);

  try {
    await submitContactMessage(payload);

    form.reset();

    setContactSuccess(true);
    setContactStatus('Message sent successfully. Thank you for contacting us!');
  } catch (error) {
    console.error('Contact form submission failed:', error);

    setContactSuccess(false);

    if (error?.code === 'permission-denied') {
      setContactStatus(
        'Unable to send message. Firestore permission is not configured yet.'
      );
    } else {
      setContactStatus(
        error?.message || 'Unable to send your message. Please try again.'
      );
    }
  } finally {
    setContactSending(false);
  }
}
  return (
    <>
      <nav className="navbar" aria-label="Main navigation">
        <button
          className="logo nav-toggle"
          type="button"
          aria-label="Open navigation"
          aria-expanded="true"
          aria-controls="desktop-navigation-links"
        >
          <img src="/assets/Icons/Coin3.png" alt="" aria-hidden="true" />
        </button>

        <ul className="nav-links" id="desktop-navigation-links">
          <li><a href="#home">Home</a></li>
          <li><a href="#trailer">About</a></li>
          <li><a href="#about">Our Work</a></li>
          <li><a href="#partners">Our Partners</a></li>
          <li><a href="#contact">Contact Us</a></li>
        </ul>

        <a className="nav-user" href={navHref} id="nav-user">
          {navLabel}
        </a>
      </nav>

      <div
        className={[
          'mobile-nav-overlay',
          mobileMenuOpen ? 'is-visible' : ''
        ].join(' ')}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      <nav
        className={[
          'mobile-navbar',
          mobileMenuOpen ? 'is-open' : ''
        ].join(' ')}
        aria-label="Mobile navigation"
      >
        <a
          className="mobile-nav-brand"
          href="#home"
          aria-label="JustiFi home"
          onClick={() => setMobileMenuOpen(false)}
        >
          <img
            src="/assets/Icons/Coin3.png"
            alt=""
            aria-hidden="true"
          />
          <span>JustiFi</span>
        </a>

        <button
          className="mobile-menu-toggle"
          type="button"
          aria-label={
            mobileMenuOpen
              ? 'Close navigation menu'
              : 'Open navigation menu'
          }
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation-links"
          onClick={() =>
            setMobileMenuOpen((open) => !open)
          }
        >
          <span />
          <span />
          <span />
        </button>

        <div
          className="mobile-menu-panel"
          id="mobile-navigation-links"
        >
          <a href="#home" onClick={() => setMobileMenuOpen(false)}>
            Home
          </a>
          <a href="#trailer" onClick={() => setMobileMenuOpen(false)}>
            About
          </a>
          <a href="#about" onClick={() => setMobileMenuOpen(false)}>
            Our Work
          </a>
          <a href="#team" onClick={() => setMobileMenuOpen(false)}>
            Team
          </a>
          <a href="#characters" onClick={() => setMobileMenuOpen(false)}>
            Characters
          </a>
          <a href="#helpline" onClick={() => setMobileMenuOpen(false)}>
            Helpline
          </a>
          <a href="#partners" onClick={() => setMobileMenuOpen(false)}>
            Partners
          </a>
          <a href="#contact" onClick={() => setMobileMenuOpen(false)}>
            Contact
          </a>

          <a
            className="mobile-menu-account"
            href={navHref}
            onClick={() => setMobileMenuOpen(false)}
          >
            {navLabel}
          </a>
        </div>
      </nav>

      <div className="floating-nav">
        <a href="#home" aria-label="Home">
          <img src="/assets/Icons/home.png" alt="" aria-hidden="true" />
          <span className="visually-hidden">HOME</span>
        </a>
        <a href="#about" aria-label="Game information">
          <img src="/assets/Icons/info.png" alt="" aria-hidden="true" />
          <span className="visually-hidden">GAME INFO</span>
        </a>
        <a href="#characters" aria-label="Characters">
          <img src="/assets/Icons/reading.png" alt="" aria-hidden="true" />
          <span className="visually-hidden">CHARACTERS</span>
        </a>
        <a id="floating-auth" href={navHref} aria-label={floatingAria}>
          <img src="/assets/Icons/user.png" alt="" aria-hidden="true" />
          <span className="visually-hidden floating-auth-label">
            {floatingLabel}
          </span>
        </a>
      </div>

      <section id="home" className="hero room">
        <div className="room-stage">
          <div className="room-layer room-layer--background" aria-hidden="true" />
          <div className="room-layer room-layer--cloud1" aria-hidden="true" />
          <div className="room-layer room-layer--cloud2" aria-hidden="true" />
          <div className="room-layer room-layer--cloud3" aria-hidden="true" />
          <div className="room-layer room-layer--cloud4" aria-hidden="true" />
          <div className="room-layer room-layer--cloud5" aria-hidden="true" />
          <div className="room-layer room-layer--cloud6" aria-hidden="true" />
          <div className="room-layer room-layer--school" aria-hidden="true" />
          <div className="room-layer room-layer--cloud2A" aria-hidden="true" />
          <div className="room-layer room-layer--cloud2B" aria-hidden="true" />
          <div className="room-layer room-layer--cloud3A" aria-hidden="true" />

          <div className="JustifiLogo home-callout">
            <div className="home-callout-kickers">
              <span>EVERY CHOICE HAS POWER</span>
              <span>EVERY STUDENT HAS RIGHTS</span>
            </div>

            <h1>ARE YOU READY TO FIGHT FOR YOURS?</h1>
          </div>

          <div className="JustifiAction">
            <a href="#trailer" className="justifi-btn" aria-label="Watch Trailer">
              WATCH TRAILER
            </a>
          </div>

          <div className="Coin">
            <div className="coin-anim" aria-hidden="true">
              <img src="/assets/Parallax/Coin3.png" className="coin-frame coin-frame--3" alt="" />
              <img src="/assets/Parallax/Coin1.png" className="coin-frame coin-frame--1" alt="" />
              <img src="/assets/Parallax/Coin2.png" className="coin-frame coin-frame--2" alt="" />
            </div>
          </div>
        </div>
      </section>

      <section id="trailer" className="trailer section-bg bg1">
        <div className="overlay" />

        <div className="content trailer-content">
          <div className="trailer-grid">
            <div className="trailer-copy">
              <p className="trailer-kicker">Welcome to JustiFi</p>
              <p className="trailer-description">
                JustiFi is a mixed-dimension visual novel learning game that teaches
                Filipino senior high school students about their legal rights through
                interactive storytelling and real-life scenarios. Players navigate
                branching narratives, make decisions that affect outcomes, and learn
                essential legal concepts along the way.
              </p>
            </div>

            <div className="trailer-media">
              <div className="trailer-video">
                <iframe
                  src="https://www.youtube-nocookie.com/embed/gfTi3e6GcUA"
                  title="JustiFi official trailer"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
              <p className="trailer-caption">
                Teaser from the visual novel experience
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="about-showcase game-info-section section-bg">
        <div className="about-page-overlay game-info-overlay" aria-hidden="true" />

        <div className="about-page-content game-info-content">
          <div className="game-features game-info-block">
            <h2 className="about-page-title">GAME FEATURES</h2>

            <div className="features-grid">
              {GAME_FEATURES.map((feature) => (
                <article className="feature-card" key={feature}>
                  <h3>{feature}</h3>
                </article>
              ))}
            </div>
          </div>

          <div id="modules" className="learning-modules game-info-block">
            <h2 className="about-page-title">OUR LEARNING MODULES</h2>

            <div className="modules-stage">
              <img
                className="module-character module-character-left"
                src="/assets/Characters/module-girl.png"
                alt="Student presenting the learning modules"
                onError={hideBrokenImage}
              />

              <div className="modules-list">
                {LEARNING_MODULES.map((module) => (
                  <article className="module-card" key={module.title}>
                    <span className="module-icon" aria-hidden="true">
                      {module.icon}
                    </span>
                    <div className="module-copy">
                      <h3>{module.title}</h3>
                      <p>{module.description}</p>
                    </div>
                  </article>
                ))}
              </div>

              <img
                className="module-character module-character-right"
                src="/assets/Characters/module-boy.png"
                alt="Student presenting the learning modules"
                onError={hideBrokenImage}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="team-characters-flow team-characters-bg">
        <section
          id="team"
          className="about-showcase team-showcase team-characters-panel"
        >
          <div className="about-page-overlay team-overlay-bg" aria-hidden="true" />

          <div className="about-page-content team-showcase-content">
            <h2 className="about-page-title">MEET THE TEAM</h2>
            <img src="/assets/Title/Javachip-Logo.svg" alt="JAVACHIP.EXE" className="team-brand" />

            <div className="team-showcase-grid">
              {TEAM_MEMBERS.map((member) => (
                <article className="team-note-card" key={member.name}>
                  <div className="team-photo-frame">
                    <span className="team-photo-fallback" aria-hidden="true">
                      {member.initials}
                    </span>
                    <img
                      src={member.photo}
                      alt={member.name}
                      onError={hideBrokenImage}
                    />
                  </div>
                  <h3>{member.name}</h3>
                  <p>{member.role}</p>
                </article>
              ))}
            </div>

            <p className="team-mission">
              “Our mission is to empower Filipino youth with legal knowledge through
              engaging, story-driven gameplay that transforms complex laws into
              relatable, interactive experiences.”
            </p>
          </div>
        </section>

        <section
          id="characters"
          className="characters team-characters-panel"
        >
          <div className="content">
            <h2 className="characters-section-title">CHARACTERS</h2>

            <div className="character-layout">
              <div className="slider-area">
                <div className="card-stack" aria-label="Character cards">
                  {CHARACTER_CARDS.map((character, index) => (
                    <div
                      className="swipe-card"
                      data-card={index}
                      aria-hidden={index === 0 ? undefined : 'true'}
                      key={character.src}
                    >
                      <img
                        src={character.src}
                        alt={index === 0 ? character.alt : ''}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="support-partners-flow">
        <section
          id="helpline"
          className="support-page support-reference-layout"
        >
          <div className="support-reference-shell">
            <header className="support-reference-header">
              <h2>HELPLINE AND SUPPORT</h2>
              <p>
                JustiFi is built for educational purposes and does not provide
                legal advice. If you need immediate help, please contact the
                appropriate support channel below.
              </p>
            </header>

            <aside className="support-reference-notice">
              <span className="support-reference-info-icon" aria-hidden="true">
                i
              </span>
              <p>
                These hotlines are operated by independent government and
                law-enforcement bodies, not by JustiFi. Numbers and emails are
                provided for quick access—please verify current details on the
                organizations’ official pages when needed.
              </p>
            </aside>

            <article className="support-reference-card support-reference-makabata">
              <div className="support-reference-logo support-reference-logo--makabata">
                <img
                  src="/assets/Background/makabata.png"
                  alt="MAKABATA Helpline 1383"
                  onError={hideBrokenImage}
                />
              </div>

              <div className="support-reference-copy">
                <h3>MAKABATA Helpline 1383</h3>
                <p>
                  The Mahalin, Kalingain ang mga Bata (MAKABATA) Helpline 1383
                  serves as a direct contact point for reporting child abuse,
                  exploitation, neglect, and discrimination.
                </p>
                <p>
                  The helpline handles all forms of abuse—from physical and
                  verbal to sexual, emotional, exploitation, and neglect.
                </p>
              </div>

              <a
                className="support-reference-button support-reference-button--makabata"
                href="tel:1383"
              >
                Seek Child Protection Support
              </a>
            </article>

            <div className="support-reference-grid">
              <article className="support-reference-card support-reference-card--ncmh">
                <header className="support-reference-card-header">
                  <div className="support-reference-logo">
                    <img
                      src={SUPPORT_PARTNER_ASSETS.ncmhLogo}
                      alt="National Center for Mental Health"
                      onError={hideBrokenImage}
                    />
                  </div>

                  <div>
                    <h3>NCMH Crisis Hotline</h3>
                    <span>National Center for Mental Health</span>
                  </div>
                </header>

                <p>
                  A 24/7 mental-health support service for anyone experiencing
                  emotional distress, anxiety, depression, suicidal thoughts,
                  or any form of mental-health crisis—with immediate,
                  compassionate assistance from trained professionals.
                </p>

                <dl className="support-reference-hotlines">
                  <div>
                    <dt>Hotline</dt>
                    <dd>1553</dd>
                  </div>
                  <div>
                    <dt>Landline</dt>
                    <dd>1800-188-1553</dd>
                  </div>
                  <div>
                    <dt>Mobile</dt>
                    <dd>0917-899-8727</dd>
                  </div>
                  <div>
                    <dt>Mobile</dt>
                    <dd>0966-351-4518</dd>
                  </div>
                </dl>

                
              </article>

              <article className="support-reference-card support-reference-card--pnp">
                <header className="support-reference-card-header">
                  <div className="support-reference-logo">
                    <img
                      src={SUPPORT_PARTNER_ASSETS.pnpLogo}
                      alt="PNP Anti-Cybercrime Group"
                      onError={hideBrokenImage}
                    />
                  </div>

                  <div>
                    <h3>PNP Anti-Cybercrime Group</h3>
                    <span>Philippine National Police PNP-ACG</span>
                  </div>
                </header>

                <p>
                  Handles reports involving online crimes—hacking,
                  cyberbullying, identity theft, and other digital threats—for
                  anyone who has fallen victim to a cybercrime.
                </p>

                <div className="support-reference-evidence-note">
                  Before reporting, save any available evidence: screenshots,
                  links, messages, account details, and transaction records.
                </div>

                <p>
                  For concerns, reach out through the PNP-ACG official
                  eComplaint system or by email. Confirm the current address on
                  the PNP-ACG website before sending sensitive details.
                </p>

               <a
  className="support-reference-button support-reference-button--pnp"
  href="https://www.cybersecurityintelligence.com/philippine-national-police-anti-cybercrime-group-pnp-acg-4731.html"
  target="_blank"
  rel="noopener noreferrer"
>
  File a Cybercrime Complaint
</a>
              </article>
            </div>

            <article className="support-reference-card support-reference-guidance">
              <div>
                <h3>School Guidance Office</h3>
                <span>Your school’s counseling office</span>
                <p>
                  Reach out to your school’s guidance counselor for academic
                  concerns, personal support, or child-protection matters—a
                  familiar, trusted first step for students.
                </p>
              </div>

              <div className="support-reference-guidance-note">
                Available on campus during school hours. Ask your adviser or
                the front office for the fastest way to reach them.
              </div>
            </article>
          </div>
        </section>

        <section
          id="partners"
          className="partners-page partners-notebook-layout"
        >
          <div className="partners-notebook-shell">
            <header className="partners-notebook-header">
              <h2>PARTNERS</h2>
              <p>
                JustiFi is currently working with our partner school to support
                the implementation and evaluation of the project as an
                educational tool for improving legal literacy among senior high
                school students. This partnership helps us understand student
                needs, gather feedback, and improve the system based on real
                learning experiences.
              </p>
            </header>

            <article className="partners-collaboration-card">
              <div className="partners-photo-side">
                <img
                  className="partners-collaboration-photo"
                  src={SUPPORT_PARTNER_ASSETS.partnerPhoto}
                  alt="JustiFi collaboration with Mother of Divine Providence School"
                  onError={hideBrokenImage}
                />

                <div className="partners-school-badge">
                  <span className="partners-school-logo">
                    <img
                      src={SUPPORT_PARTNER_ASSETS.partnerLogo}
                      alt=""
                      aria-hidden="true"
                      onError={hideBrokenImage}
                    />
                  </span>

                  <strong>Mother of Divine Providence School</strong>
                </div>
              </div>

              <div className="partners-invitation-side">
                <p className="partners-question">
                  Want to collaborate with us?
                </p>

                <h3>Let’s expand legal literacy together!</h3>

                <p className="partners-invitation-copy">
                  For schools, organizations, or advocacy groups interested in
                  supporting legal literacy and youth protection, we welcome
                  partnerships and collaborations that put real student needs
                  first.
                </p>

                <a
                  className="partners-notebook-button"
                  href="#contact"
                >
                  Partner With Us
                </a>
              </div>
            </article>
          </div>
        </section>

      <section id="contact" className="contact-page contact-reference-layout">
        <div className="contact-page-overlay" aria-hidden="true" />

        <div className="contact-reference-shell">
          <h2>CONTACT US</h2>

          <div className="contact-reference-grid">
            <aside className="contact-info-card">
              <div className="contact-info-main">
                <h3>Let’s Talk</h3>

                <p className="contact-info-intro">
                  Whether it’s a question about the platform, a partnership
                  inquiry, or feedback on your experience—we’d love to hear
                  from you.
                </p>

                <div className="contact-info-item">
                  <span className="contact-info-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M3.5 5.5h17v13h-17z" />
                      <path d="m4.5 6.5 7.5 6 7.5-6" />
                    </svg>
                  </span>

                  <div>
                    <small>EMAIL</small>
                    <a href="mailto:javachip.exe@gmail.com">
                      javachip.exe@gmail.com
                    </a>
                  </div>
                </div>

                <div className="contact-info-item">
                  <span className="contact-info-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="8.5" />
                      <path d="M12 7.5v5l3.5 2" />
                    </svg>
                  </span>

                  <div>
                    <small>RESPONSE TIME</small>
                    <span>Within 2 business days</span>
                  </div>
                </div>
              </div>

              <div className="contact-social-area">
                <div className="contact-social-rule" aria-hidden="true" />

                <div className="contact-social-links">
                  <a
                    href="https://www.facebook.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M14 21v-8h3l.5-3H14V8.2c0-1 .4-1.7 1.9-1.7H18V3.7c-.5-.1-1.6-.2-2.8-.2-2.8 0-4.7 1.7-4.7 4.8V10H7.5v3h3v8" />
                    </svg>
                  </a>

                  <a
                    href="https://www.instagram.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.8" r="1" />
                    </svg>
                  </a>

                  <a
                    href="https://www.linkedin.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="5" cy="5" r="1.7" />
                      <path d="M3.6 9v11M8.8 9v11M8.8 14.2c0-3.1 1.8-5.2 4.7-5.2 3.5 0 4.9 2.2 4.9 5.8V20M3.6 9h2.8" />
                    </svg>
                  </a>
                </div>
              </div>
            </aside>

            <form className="contact-form-card" onSubmit={handleContactSubmit}>
              <div className="contact-form-two-column">
                <div className="contact-field">
                  <label htmlFor="contact-name">Name</label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    placeholder="Justice Juris"
                    autoComplete="name"
                    required
                  />
                </div>

                <div className="contact-field">
                  <label htmlFor="contact-email">Email</label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    placeholder="helloworld@email.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="contact-field">
                <label htmlFor="contact-subject">Subject</label>
                <input
                  id="contact-subject"
                  name="subject"
                  type="text"
                  placeholder="What’s this about?"
                  required
                />
              </div>

              <div className="contact-field contact-message-field">
                <label htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows="5"
                  placeholder="Tell us more..."
                  required
                />
              </div>

              <div className="contact-form-footer">
  <p
    aria-live="polite"
    style={{
      color: contactStatus
        ? contactSuccess
          ? '#d9f5d0'
          : '#ffd3d3'
        : undefined,
    }}
  >
    {contactStatus || 'We typically reply within 2 business days.'}
  </p>

  <button
    className="contact-submit"
    type="submit"
    disabled={contactSending}
  >
    {contactSending ? 'Sending...' : 'Send Message'}
  </button>
</div>
            </form>
          </div>
        </div>
        </section>
      </div>

      <footer className="site-footer site-footer--redesigned">
        <div className="footer-main">
          <div className="footer-brand-block">
            <h3>JustiFi</h3>
            <p>Learn Your Rights. Shape Your Choices.</p>
          </div>

          <nav className="footer-link-block" aria-label="Footer help links">
            <h4>Help</h4>
            <a href="#helpline">Help Center</a>
            <a href="#contact">Contacts</a>
          </nav>

          <div className="footer-social-block">
            <h4>Follow Us</h4>

            <div className="footer-social-links">
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.8" r="1" className="social-dot" />
                </svg>
              </a>

              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M14.4 21v-8h2.8l.4-3h-3.2V8.1c0-.9.3-1.6 1.7-1.6H18V3.8c-.4-.1-1.5-.2-2.6-.2-2.6 0-4.4 1.6-4.4 4.5V10H8v3h3v8h3.4Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-rule" aria-hidden="true" />

        <p className="footer-copyright">
          © 2026 JustiFi. All rights reserved.
        </p>
      </footer>
    </>
  );
}