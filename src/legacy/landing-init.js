// Port of the legacy landing script into an init function that can be called from React.
// This keeps behavior identical while the markup lives in JSX.

export function initLandingPage() {
  const cleanups = [];

  // ===============================
  // CHARACTER CARD DECK (DRAG TO SWITCH)
  // ===============================
  (function initCharacterDeck() {
    const deck = document.querySelector('.card-stack');
    const info = document.querySelector('.character-info');
    const charName = document.getElementById('char-name');
    const charDesc = document.getElementById('char-desc');

    if (!deck) return;

    const characterData = [
      {
        name: 'Student Alpha',
        desc: 'A disciplined academy prodigy known for tactical precision and calm leadership under pressure. Specializes in strategic combat planning.'
      },
      {
        name: 'Student Beta',
        desc: 'Energetic and fearless, this student excels in fast-paced encounters. Known for adaptability and relentless offensive skills.'
      },
      {
        name: 'Student Gamma',
        desc: 'Quiet and analytical, mastering advanced techniques through intelligence and patience. A powerful force when fully unleashed.'
      }
    ];

    const canUpdateInfo = !!(info && charName && charDesc);
    let index = 0;

    function showCharacter(i) {
      if (!canUpdateInfo) return;

      info.classList.add('fade');

      window.setTimeout(() => {
        charName.textContent = characterData[i].name;
        charDesc.textContent = characterData[i].desc;
        info.classList.remove('fade');
      }, 200);
    }

    function layoutCards() {
      const cards = Array.from(deck.querySelectorAll('.swipe-card'));
      cards.forEach((card, i) => {
        const offsetX = i * 26;
        const offsetY = i * 18;
        const scale = 1 - i * 0.04;
        const tilt = i * -2;

        card.style.zIndex = String(10 - i);
        card.style.opacity = i < 3 ? '1' : '0';
        card.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${tilt}deg) scale(${scale})`;
        card.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
      });
    }

    const SWIPE_THRESHOLD_PX = 90;
    const TAP_MOVE_THRESHOLD_PX = 10;
    let activeCard = null;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isDragging = false;

    function onPointerDown(e) {
      if (e.button != null && e.button !== 0) return;
      if (e.isPrimary === false) return;

      const topCard = deck.querySelector('.swipe-card');
      if (!topCard) return;
      if (e.target && !topCard.contains(e.target)) return;

      activeCard = topCard;
      startX = e.clientX;
      startY = e.clientY;
      currentX = 0;
      currentY = 0;
      isDragging = true;

      activeCard.classList.add('dragging');
      try {
        activeCard.setPointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    }

    function onPointerMove(e) {
      if (!isDragging || !activeCard) return;

      currentX = e.clientX - startX;
      currentY = e.clientY - startY;

      const rotate = currentX / 14;
      activeCard.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotate}deg)`;
    }

    function finishSwipe() {
      if (!activeCard) return;

      activeCard.classList.remove('dragging');

      deck.appendChild(activeCard);
      activeCard = null;
      isDragging = false;

      if (canUpdateInfo) {
        index = (index + 1) % characterData.length;
        showCharacter(index);
      }
      layoutCards();
    }

    function cancelSwipe() {
      if (!activeCard) return;
      activeCard.classList.remove('dragging');
      activeCard = null;
      isDragging = false;
      layoutCards();
    }

    function onPointerUp() {
      if (!isDragging || !activeCard) return;

      if (Math.abs(currentX) < TAP_MOVE_THRESHOLD_PX && Math.abs(currentY) < TAP_MOVE_THRESHOLD_PX) {
        finishSwipe();
        return;
      }

      if (Math.abs(currentX) >= SWIPE_THRESHOLD_PX) {
        const direction = currentX < 0 ? -1 : 1;
        const flyX = direction * (deck.clientWidth + 240);
        const flyY = currentY * 0.4;
        const rotate = direction * 20;

        activeCard.classList.remove('dragging');
        activeCard.style.transform = `translate(${flyX}px, ${flyY}px) rotate(${rotate}deg)`;

        window.setTimeout(() => {
          finishSwipe();
        }, 220);
        return;
      }

      cancelSwipe();
    }

    deck.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', cancelSwipe);

    cleanups.push(() => {
      deck.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', cancelSwipe);
    });

    showCharacter(index);
    layoutCards();
  })();

  // ===============================
  // WORLD PREVIEW CARDS (MAXIMIZE + FLIP)
  // ===============================
  (function initWorldPreviewCards() {
    const cards = Array.from(document.querySelectorAll('.gallery-item'));
    const overlay = document.querySelector('.gallery-overlay');

    if (!cards.length || !overlay) return;

    let expandedCard = null;

    function closeExpandedCard() {
      if (!expandedCard) return;

      expandedCard.classList.remove('is-expanded');
      expandedCard.setAttribute('aria-expanded', 'false');
      expandedCard = null;

      overlay.classList.remove('show');
      document.body.classList.remove('world-preview-open');
    }

    function expandCard(card) {
      if (expandedCard === card) {
        closeExpandedCard();
        return;
      }

      if (expandedCard) {
        expandedCard.classList.remove('is-expanded');
        expandedCard.setAttribute('aria-expanded', 'false');
      }

      expandedCard = card;
      expandedCard.classList.add('is-expanded');
      expandedCard.setAttribute('aria-expanded', 'true');

      overlay.classList.add('show');
      document.body.classList.add('world-preview-open');
    }

    const onOverlayClick = () => closeExpandedCard();
    const onDocClick = (event) => {
      if (!expandedCard) return;
      if (expandedCard.contains(event.target)) return;
      closeExpandedCard();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeExpandedCard();
      }
    };

    cards.forEach((card) => {
      const onClick = (event) => {
        event.stopPropagation();
        expandCard(card);
      };
      const onCardKeyDown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        expandCard(card);
      };

      card.addEventListener('click', onClick);
      card.addEventListener('keydown', onCardKeyDown);

      cleanups.push(() => {
        card.removeEventListener('click', onClick);
        card.removeEventListener('keydown', onCardKeyDown);
      });
    });

    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('click', onDocClick);
    window.addEventListener('keydown', onKeyDown);

    cleanups.push(() => {
      overlay.removeEventListener('click', onOverlayClick);
      document.removeEventListener('click', onDocClick);
      window.removeEventListener('keydown', onKeyDown);
    });
  })();

  // ===============================
  // EXPLORE BUTTON SCROLL
  // ===============================
  (function initExploreButton() {
  const exploreBtn = document.querySelector('.justifi-btn');

  if (!exploreBtn) return;

  const onClick = () => {
    document
      .querySelector('#trailer')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  exploreBtn.addEventListener('click', onClick);

  cleanups.push(() =>
    exploreBtn.removeEventListener('click', onClick)
  );
})();
  // ===============================
  // NAVBAR BACKGROUND ON SCROLL
  // ===============================
  (function initNavbarAlpha() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const onScroll = () => {
      if (window.scrollY > 50) {
        navbar.style.setProperty('--navbar-alpha', '0.96');
      } else {
        navbar.style.setProperty('--navbar-alpha', '0.85');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    cleanups.push(() => window.removeEventListener('scroll', onScroll));
  })();


  // ===============================
  // ROLLING COMPACT NAVBAR
  // Full on Home; circular logo from Trailer onward.
  // Hover/focus temporarily opens it. Clicking the logo pins/unpins it.
  // ===============================
  (function initRollingCompactNavbar() {
    const navbar = document.querySelector('.navbar');
    const toggle = navbar?.querySelector('.nav-toggle');
    const trailer = document.querySelector('#trailer');
    const desktopQuery = window.matchMedia('(min-width: 769px)');

    if (!navbar || !toggle || !trailer) return;

    let ticking = false;
    let pointerInside = false;

    const isCompact = () => navbar.classList.contains('is-compact');
    const isPinnedOpen = () => navbar.classList.contains('is-open');

    const setToggleState = (expanded) => {
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      toggle.setAttribute(
        'aria-label',
        expanded ? 'Close navigation' : 'Open navigation'
      );
    };

    const closePinnedNavbar = () => {
      navbar.classList.remove('is-open');
      if (isCompact() && !pointerInside && !navbar.matches(':focus-within')) {
        setToggleState(false);
      }
    };

    const updateCompactState = () => {
      ticking = false;

      if (!desktopQuery.matches) {
        navbar.classList.remove('is-compact', 'is-open');
        setToggleState(true);
        return;
      }

      // Collapse as soon as the Trailer page reaches the upper viewport.
      const shouldCompact = trailer.getBoundingClientRect().top <= 110;

      if (shouldCompact) {
        if (!isCompact()) {
          navbar.classList.add('is-compact');
          navbar.classList.remove('is-open');
        }

        setToggleState(
          isPinnedOpen() || pointerInside || navbar.matches(':focus-within')
        );
      } else {
        navbar.classList.remove('is-compact', 'is-open');
        setToggleState(true);
      }
    };

    const requestCompactUpdate = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateCompactState);
    };

    const onToggleClick = () => {
      if (!desktopQuery.matches) return;

      // Above the Trailer section, clicking the coin behaves like Home.
      if (!isCompact()) {
        document.querySelector('#home')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        return;
      }

      navbar.classList.toggle('is-open');
      setToggleState(isPinnedOpen() || pointerInside);
    };

    const onPointerEnter = () => {
      pointerInside = true;
      if (isCompact()) setToggleState(true);
    };

    const onPointerLeave = () => {
      pointerInside = false;
      if (isCompact() && !isPinnedOpen() && !navbar.matches(':focus-within')) {
        setToggleState(false);
      }
    };

    const onFocusIn = () => {
      if (isCompact()) setToggleState(true);
    };

    const onFocusOut = () => {
      window.requestAnimationFrame(() => {
        if (
          isCompact() &&
          !isPinnedOpen() &&
          !pointerInside &&
          !navbar.matches(':focus-within')
        ) {
          setToggleState(false);
        }
      });
    };

    const onDocumentPointerDown = (event) => {
      if (!isCompact() || !isPinnedOpen()) return;
      if (navbar.contains(event.target)) return;
      closePinnedNavbar();
    };

    const onKeyDown = (event) => {
      if (event.key !== 'Escape' || !isCompact()) return;
      closePinnedNavbar();
      toggle.focus();
    };

    const onNavLinkClick = (event) => {
      if (!event.target.closest('a')) return;
      closePinnedNavbar();
    };

    toggle.addEventListener('click', onToggleClick);
    navbar.addEventListener('pointerenter', onPointerEnter);
    navbar.addEventListener('pointerleave', onPointerLeave);
    navbar.addEventListener('focusin', onFocusIn);
    navbar.addEventListener('focusout', onFocusOut);
    navbar.addEventListener('click', onNavLinkClick);
    document.addEventListener('pointerdown', onDocumentPointerDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', requestCompactUpdate, { passive: true });
    window.addEventListener('resize', requestCompactUpdate);
    desktopQuery.addEventListener?.('change', requestCompactUpdate);

    cleanups.push(() => {
      toggle.removeEventListener('click', onToggleClick);
      navbar.removeEventListener('pointerenter', onPointerEnter);
      navbar.removeEventListener('pointerleave', onPointerLeave);
      navbar.removeEventListener('focusin', onFocusIn);
      navbar.removeEventListener('focusout', onFocusOut);
      navbar.removeEventListener('click', onNavLinkClick);
      document.removeEventListener('pointerdown', onDocumentPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', requestCompactUpdate);
      window.removeEventListener('resize', requestCompactUpdate);
      desktopQuery.removeEventListener?.('change', requestCompactUpdate);
    });

    updateCompactState();
  })();

  // ===============================
  // SCROLL REVEAL ANIMATION
  // ===============================
  (function initScrollReveal() {
    const sections = document.querySelectorAll('.content');

    const onScroll = () => {
      sections.forEach((section) => {
        const sectionTop = section.getBoundingClientRect().top;
        if (sectionTop < window.innerHeight - 100) {
          section.classList.add('show');
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    cleanups.push(() => window.removeEventListener('scroll', onScroll));

    // initial
    onScroll();
  })();

  // ===============================
  // HEADER ↔ SIDEBAR SYNC SYSTEM + PARALLAX ROOM
  // ===============================
  (function initNavSyncAndRoomParallax() {
    const navbar = document.querySelector('.navbar');
    const floatingNav = document.querySelector('.floating-nav');
    const homeSection = document.querySelector('#home');
    const room = document.querySelector('#home.room');

    if (!navbar || !floatingNav || !homeSection || !room) return;

    let roomProgress = 0;
    const NAV_REVEAL_START = 0.72;
    const NAV_REVEAL_END = 0.82;
    const END_HOLD_FRACTION =
  window.innerWidth <= 768 ? 0 : 0.18;

    const syncNavUI = () => {
      const homeBottom = homeSection.getBoundingClientRect().bottom;
      const leftHome = homeBottom <= 100;



      floatingNav.classList.remove('show');

      const revealT = (roomProgress - NAV_REVEAL_START) / (NAV_REVEAL_END - NAV_REVEAL_START);
      const reveal = Math.min(1, Math.max(0, revealT));

      if (reveal <= 0) {
        navbar.classList.add('hide');
        navbar.classList.remove('reveal-sync', 'scroll-up', 'scroll-down');
        navbar.style.removeProperty('--navbar-reveal');
        return;
      }

      navbar.classList.remove('hide');
      navbar.classList.add('reveal-sync');
      navbar.style.setProperty('--navbar-reveal', reveal.toFixed(3));
    };

    function scrollToParallaxProgress(targetProgress) {
      const rect = room.getBoundingClientRect();
      const viewH = window.innerHeight;
      const totalScrollable = Math.max(1, room.offsetHeight - viewH);

      const holdPx = totalScrollable * END_HOLD_FRACTION;
      const motionScrollable = Math.max(1, totalScrollable - holdPx);

      const p = Math.min(1, Math.max(0, Number(targetProgress) || 0));
      const targetScrolled = motionScrollable * p;
      const roomTopY = rect.top + window.scrollY;

      window.scrollTo({
        top: roomTopY + targetScrolled,
        behavior: 'smooth'
      });
    }

    const homeLinks = document.querySelectorAll('a[href="#home"]');
    const onHomeClick = (e) => {
      e.preventDefault();
      scrollToParallaxProgress(1);
    };

    homeLinks.forEach((link) => link.addEventListener('click', onHomeClick));
    cleanups.push(() => homeLinks.forEach((link) => link.removeEventListener('click', onHomeClick)));

    let roomTicking = false;
    const updateRoomProgress = () => {
      roomTicking = false;

      const rect = room.getBoundingClientRect();
      const viewH = window.innerHeight;
      const totalScrollable = Math.max(1, room.offsetHeight - viewH);
      const scrolled = Math.min(Math.max(-rect.top, 0), totalScrollable);

      const holdPx = totalScrollable * END_HOLD_FRACTION;
      const motionScrollable = Math.max(1, totalScrollable - holdPx);
      const progress = scrolled >= motionScrollable ? 1 : scrolled / motionScrollable;

      roomProgress = progress;
      room.style.setProperty('--room-progress', progress.toFixed(4));
      syncNavUI();
    };

    const requestRoomUpdate = () => {
      if (roomTicking) return;
      roomTicking = true;
      window.requestAnimationFrame(updateRoomProgress);
    };

    window.addEventListener('scroll', requestRoomUpdate, { passive: true });
    window.addEventListener('resize', requestRoomUpdate);

    cleanups.push(() => {
      window.removeEventListener('scroll', requestRoomUpdate);
      window.removeEventListener('resize', requestRoomUpdate);
    });

    // initial
    requestRoomUpdate();
  })();

  // ===============================
  // BUTTON NAV (non-React navigation kept minimal)
  // ===============================
  (function initButtons() {
    const viewPatchButton = document.getElementById('viewPatchButton');
    if (viewPatchButton) {
      const onClick = () => {
        document.getElementById('announcement')?.scrollIntoView({ behavior: 'smooth' });
      };
      viewPatchButton.addEventListener('click', onClick);
      cleanups.push(() => viewPatchButton.removeEventListener('click', onClick));
    }

    const backButton = document.getElementById('backButton');
    if (backButton) {
      const onClick = () => {
        window.location.href = '../index.html';
      };
      backButton.addEventListener('click', onClick);
      cleanups.push(() => backButton.removeEventListener('click', onClick));
    }
  })();

  return function cleanup() {
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore
      }
    });
  };
}
