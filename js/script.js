/* ============================================================
   Portfolio Robin Martinent — ASCII field (hero) + logique.

   Drag élastique : les 3 lignes du titre (Monteur / Réalisateur /
   Créatif) sont draggables indépendamment. Tu tires vers la DROITE :
   le mot s'étire en scaleX depuis son bord gauche (ancrage à gauche),
   avec un léger squash vertical. Au relâchement, retour vif et
   nerveux avec un fort overshoot (cubic-bezier 2.6 sur 0.55s).

   Sur appareils tactiles, le drag est désactivé : la navigation
   au doigt passe avant l'effet.
   ============================================================ */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad2 = (n) => n.toString().padStart(2, '0');

  /* ============================================================
     1. ASCII FIELD — dans le hero
     ============================================================ */
  (function initAsciiField() {
    const hero   = document.getElementById('heroSection');
    const canvas = document.getElementById('asciiField');
    if (!hero || !canvas) return;

    // Mobile optimization: reduce grid density and FPS on small screens
    const isMobile = window.innerWidth < 768 || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
    const ctx = canvas.getContext('2d', { alpha: true });
    const GLYPHS = ['·', '.', ':', '-', '=', '+', '*', 'x', '#', '%', '@'];
    const CELL_W = isMobile ? 20 : 14;
    const CELL_H = isMobile ? 24 : 16;
    const MAX_DPR = isMobile ? 1.2 : 1.5;
    const FPS_CAP = isMobile ? 20 : 30;

    let W = 0, H = 0, dpr = 1;
    let cols = 0, rows = 0;

    let mx = -9999, my = -9999;
    let tmx = -9999, tmy = -9999;
    let hasMouse = false;

    const MOUSE_R = 100;
    const MOUSE_R_SQ = MOUSE_R * MOUSE_R;

    const waves = [];
    const WAVE_LIFE = 1200;
    const WAVE_MAX_R = 400;
    const WAVE_THICKNESS = 50;

    const hudFps   = document.getElementById('hudFps');
    const hudCells = document.getElementById('hudCells');

    let fpsFrames = 0;
    let fpsLast = performance.now();

    let resizeTimer = null;

    function isLightMode() {
      return document.documentElement.classList.contains('theme-light');
    }

    function doResize() {
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const rect = hero.getBoundingClientRect();
      W = Math.max(1, Math.floor(rect.width));
      H = Math.max(1, Math.floor(rect.height));

      canvas.width  = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(W / CELL_W) + 1;
      rows = Math.ceil(H / CELL_H) + 1;

      if (hudCells) hudCells.textContent = (cols * rows).toLocaleString('fr-FR');
    }

    function scheduleResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(doResize, 150);
    }

    doResize();
    window.addEventListener('resize', scheduleResize, { passive: true });
    window.addEventListener('orientationchange', scheduleResize, { passive: true });

    function heroPoint(clientX, clientY) {
      const r = hero.getBoundingClientRect();
      return { x: clientX - r.left, y: clientY - r.top };
    }

    window.addEventListener('mousemove', (e) => {
      const p = heroPoint(e.clientX, e.clientY);
      tmx = p.x;
      tmy = p.y;
      if (!hasMouse) { mx = p.x; my = p.y; hasMouse = true; }
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
      hasMouse = false;
      tmx = -9999; tmy = -9999;
    });

    let tintShift = 0;

    // Click handler - creates waves in dark mode, does nothing in light mode
    window.addEventListener('click', (e) => {
      if (e.target.closest('a, button, input, select, textarea, .game-clip, .dot, .arrow, .title-line')) return;
      const r = hero.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right) return;
      if (e.clientY < r.top  || e.clientY > r.bottom) return;

      if (!isLightMode()) {
        const p = heroPoint(e.clientX, e.clientY);
        const hue = (tintShift * 47 + performance.now() * 0.05) % 360;
        waves.push({
          x: p.x, y: p.y,
          t0: performance.now(),
          life: WAVE_LIFE,
          maxR: Math.min(WAVE_MAX_R, Math.max(W, H) * 0.8),
          hue
        });
        tintShift = (tintShift + 1) % 12;
      }
    });

    window.addEventListener('touchstart', (e) => {
      if (e.target.closest('a, button, input, select, textarea, .game-clip, .dot, .arrow, .title-line')) return;
      const t = e.touches[0];
      if (!t) return;
      const r = hero.getBoundingClientRect();
      if (t.clientX < r.left || t.clientX > r.right) return;
      if (t.clientY < r.top  || t.clientY > r.bottom) return;

      if (!isLightMode()) {
        const p = heroPoint(t.clientX, t.clientY);
        waves.push({
          x: p.x, y: p.y,
          t0: performance.now(),
          life: WAVE_LIFE,
          maxR: Math.min(WAVE_MAX_R, Math.max(W, H) * 0.8),
          hue: (performance.now() * 0.05) % 360
        });
      }
    }, { passive: true });

    if (reduceMotion) {
      ctx.clearRect(0, 0, W, H);
      ctx.font = `500 ${Math.max(10, CELL_H * 0.75)}px 'JetBrains Mono', monospace`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      const lightMode = isLightMode();
      const baseColor = lightMode ? '0, 120, 212' : '167, 139, 250'; // Blue for light, violet for dark

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const wave = Math.sin(x * 0.14) * 0.5 + Math.cos(y * 0.18) * 0.5;
          const intensity = 0.3 + wave * 0.15;
          if (intensity < 0.25) continue;
          const ci = Math.min(GLYPHS.length - 1, Math.floor(intensity * GLYPHS.length));
          const ch = GLYPHS[ci];
          if (ch === '·' && intensity < 0.28) continue;
          ctx.fillStyle = `rgba(${baseColor}, ${intensity * 0.35})`;
          ctx.fillText(ch, x * CELL_W + CELL_W * 0.5, y * CELL_H + CELL_H * 0.5);
        }
      }
      return;
    }

    let lastFrame = 0;
    const frameInterval = 1000 / FPS_CAP;

    function render(now) {
      if (now - lastFrame < frameInterval) {
        requestAnimationFrame(render);
        return;
      }
      lastFrame = now;

      if (hasMouse) {
        mx += (tmx - mx) * 0.16;
        my += (tmy - my) * 0.16;
      } else {
        mx += (-9999 - mx) * 0.05;
        my += (-9999 - my) * 0.05;
      }

      for (let i = waves.length - 1; i >= 0; i--) {
        if (now - waves[i].t0 > waves[i].life) waves.splice(i, 1);
      }

      const t = now * 0.001;
      ctx.clearRect(0, 0, W, H);

      const fontSize = Math.max(10, CELL_H * 0.78);
      ctx.font = `500 ${fontSize}px 'JetBrains Mono', 'Menlo', monospace`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      const lightMode = isLightMode();

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = x * CELL_W + CELL_W * 0.5;
          const py = y * CELL_H + CELL_H * 0.5;

          const baseWave =
            Math.sin(x * 0.14 + t * 0.55) * 0.55 +
            Math.cos(y * 0.18 - t * 0.42) * 0.55;

          let intensity = 0.22 + baseWave * 0.16;

          let mouseFactor = 0;
          if (hasMouse) {
            const dxm = px - mx;
            const dym = py - my;
            const d2 = dxm * dxm + dym * dym;
            if (d2 < MOUSE_R_SQ) {
              const d = Math.sqrt(d2);
              const tt = 1 - d / MOUSE_R;
              mouseFactor = tt * tt * (3 - 2 * tt);
              if (mouseFactor * 1.25 > intensity) intensity = mouseFactor * 1.25;
            }
          }

          let waveFactor = 0;
          let waveHue = 0;
          let waveProgress = 0;

          for (let w = 0; w < waves.length; w++) {
            const wv = waves[w];
            const age = (now - wv.t0) / wv.life;
            if (age < 0 || age > 1) continue;
            const frontR = age * wv.maxR;
            const dxw = px - wv.x;
            const dyw = py - wv.y;
            const dist = Math.sqrt(dxw * dxw + dyw * dyw);
            const absDelta = Math.abs(dist - frontR);
            if (absDelta < WAVE_THICKNESS) {
              const f = 1 - absDelta / WAVE_THICKNESS;
              const fade = 1 - age;
              const contrib = f * fade;
              if (contrib > waveFactor) {
                waveFactor = contrib;
                waveHue = wv.hue;
                waveProgress = age;
              }
            }
          }

          if (waveFactor > 0) {
            const target = waveFactor * 1.6;
            if (target > intensity) intensity = target;
          }

          if (intensity < 0.16) continue;

          const clamped = intensity > 1 ? 1 : intensity;

          const ci = Math.min(GLYPHS.length - 1, Math.floor(clamped * GLYPHS.length));
          const glyph = GLYPHS[ci];
          if (glyph === '·' && clamped < 0.24) continue;

          const alpha = Math.min(1, 0.25 + clamped * 0.85);

          if (lightMode) {
            // Light mode: blue color scheme
            if (waveFactor > 0.15) {
              ctx.fillStyle = `rgba(0, 120, 212, ${Math.min(1, alpha * (0.5 + waveFactor * 0.8))})`;
            } else if (mouseFactor > 0.65) {
              ctx.fillStyle = `rgba(0, 180, 255, ${alpha})`;
            } else if (mouseFactor > 0.25) {
              ctx.fillStyle = `rgba(0, 120, 212, ${alpha})`;
            } else if (clamped > 0.55) {
              ctx.fillStyle = `rgba(0, 120, 212, ${alpha * 0.8})`;
            } else {
              ctx.fillStyle = `rgba(90, 150, 180, ${alpha * 0.5})`;
            }
          } else {
            // Dark mode: original RGB/hue colors
            if (waveFactor > 0.15) {
              const baseHue = (waveHue + waveProgress * 180) % 360;
              ctx.fillStyle = `hsla(${baseHue}, 90%, ${58 + waveFactor * 15}%, ${Math.min(1, alpha * (0.6 + waveFactor * 0.9))})`;
            } else if (mouseFactor > 0.65) {
              ctx.fillStyle = `rgba(244, 236, 255, ${alpha})`;
            } else if (mouseFactor > 0.25) {
              ctx.fillStyle = `rgba(167, 139, 250, ${alpha})`;
            } else if (clamped > 0.55) {
              const h = (250 + tintShift * 12) % 360;
              ctx.fillStyle = `hsla(${h}, 55%, 68%, ${alpha * 0.9})`;
            } else {
              ctx.fillStyle = `rgba(113, 113, 122, ${alpha * 0.55})`;
            }
          }

          ctx.fillText(glyph, px, py);
        }
      }

      fpsFrames++;
      const nowMs = performance.now();
      if (nowMs - fpsLast > 500) {
        if (hudFps) hudFps.textContent = Math.round(fpsFrames * 1000 / (nowMs - fpsLast));
        fpsFrames = 0;
        fpsLast = nowMs;
      }

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  })();

  /* ============================================================
     2. DRAG ÉLASTIQUE AVEC ÉTIREMENT — sur chaque .title-line

     Désactivé sur appareils tactiles : sur mobile, le drag
     bloquerait la navigation (touch-action: none + pointer capture
     empêchent le scroll natif dès que le doigt touche un mot).
     ============================================================ */
  (function initTitleDrag() {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (reduceMotion) return;

    const lines = document.querySelectorAll('.title-line');
    if (!lines.length) return;

    const STRETCH_K   = 0.008;
    const MAX_STRETCH = 1.8;
    const SQUASH_K    = 0.30;

    const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

    lines.forEach((el) => {
      let ready = false;
      let dragging = false;
      let pointerId = null;
      let startX = 0;
      let idleTimer = null;

      el.addEventListener('animationend', () => { ready = true; }, { once: true });
      setTimeout(() => { ready = true; }, 1800);

      el.style.transformOrigin = '0% 50%';

      function apply(sx, sy) {
        el.style.transform = 'scale(' + sx + ',' + sy + ')';
      }

      function onDown(e) {
        if (!ready || dragging) return;
        dragging = true;
        pointerId = e.pointerId;
        startX = e.clientX;

        el.classList.remove('springing');
        el.classList.add('dragging');
        el.style.transition = 'transform 0.06s linear';

        if (el.setPointerCapture) {
          try { el.setPointerCapture(pointerId); } catch (err) {}
        }

        if (idleTimer) {
          clearTimeout(idleTimer);
          idleTimer = null;
        }

        e.preventDefault();
      }

      function onMove(e) {
        if (!dragging || e.pointerId !== pointerId) return;

        const dx = e.clientX - startX;
        const sx = clamp(1 + Math.max(0, dx) * STRETCH_K, 1, MAX_STRETCH);
        const sy = 1 - (sx - 1) * SQUASH_K;
        apply(sx, sy);
      }

      function release() {
        if (!dragging) return;
        dragging = false;
        pointerId = null;

        el.classList.remove('dragging');
        el.classList.add('springing');

        el.style.transition = '';
        apply(1, 1);

        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          el.classList.remove('springing');
          el.style.transform = '';
          el.style.transition = '';
        }, 700);
      }

      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('lostpointercapture', release);
      window.addEventListener('blur', release);
    });
  })();

  /* ============================================================
     3. BOOT
     ============================================================ */
  (function initBoot() {
    const boot = document.getElementById('boot');
    const log  = document.getElementById('bootLog');
    const bar  = document.getElementById('bootBar');
    const hint = document.getElementById('bootHint');
    if (!boot || !log || !bar) return;

    let navType = 'navigate';
    try {
      const entries = performance.getEntriesByType('navigation');
      if (entries && entries.length && entries[0].type) navType = entries[0].type;
    } catch (e) {}

    let bootAlreadyDone = false;
    try { bootAlreadyDone = sessionStorage.getItem('rm_boot_done') === '1'; } catch (e) {}

    const isReload = navType === 'reload';
    const isBack   = navType === 'back_forward';

    if (bootAlreadyDone && !isReload && !isBack) {
      boot.classList.add('hidden');
      boot.style.display = 'none';
      return;
    }

    function markDone() {
      try { sessionStorage.setItem('rm_boot_done', '1'); } catch (e) {}
    }

    const LINES = [
      'ROBIN MARTINENT · PORTFOLIO · v4.0.1',
      'Copyright (C) 1999-2026 Robin Martinent',
      '',
      '> POST ............................. OK',
      '> Vérification mémoire ............ 640K OK',
      '> Détection clavier ............... OK',
      '> Détection souris ................ OK',
      '> Initialisation GPU .............. OK',
      '> Compilation shaders WebGL ....... OK',
      '> Chargement MONTAGE.SYS .......... OK',
      '> Chargement MOTION.DLL ........... OK',
      '> Chargement CREATIVE.DRV ......... OK',
      '> Chargement PORTFOLIO.CORE ....... OK',
      '> Chargement ASCII.FIELD .......... OK',
      '> Vérification LUTs ............... OK',
      '> Génération PROXY ................ OK',
      '> Vérification TIMECODE 25 fps .... OK',
      '> RENDER QUEUE prête .............. OK',
      '> CONFORM vérifié ................. OK',
      '> DELIVERY H.264 1080p25 .......... OK',
      '> Indexation rushes /projets ...... OK',
      '> Montage volumes projets ......... OK',
      '> Ouverture session ............... ROBIN',
      '',
      '> BIENVENUE, ROBIN.'
    ];

    const totalChars = LINES.reduce((sum, l) => sum + l.length + 1, 0);

    let done = false;
    let out = '';
    let skipping = false;

    function renderProgress(pct) {
      const v = Math.min(100, Math.round(pct));
      bar.style.width = v + '%';
      if (hint) hint.textContent = '[ ' + v + ' % ]';
    }

    function finish() {
      if (done) return;
      done = true;
      markDone();
      renderProgress(100);
      boot.classList.add('hidden');
      setTimeout(() => { boot.style.display = 'none'; }, 400);
    }

    function skipToEnd() {
      if (skipping || done) return;
      skipping = true;
      out = LINES.join('\n');
      log.textContent = out;
      log.scrollTop = log.scrollHeight;
      renderProgress(100);
      if (hint) hint.textContent = '[ 100 % ] PRÊT';
      clearTimeout(failsafe);
      setTimeout(finish, 250);
    }

    window.addEventListener('keydown', skipToEnd);
    window.addEventListener('click', skipToEnd);
    window.addEventListener('touchstart', skipToEnd, { passive: true });

    const failsafe = setTimeout(() => {
      if (!done) skipToEnd();
    }, 1200);

    if (reduceMotion) {
      log.textContent = LINES.join('\n');
      renderProgress(100);
      if (hint) hint.textContent = '[ 100 % ] PRÊT';
      clearTimeout(failsafe);
      setTimeout(finish, 300);
      return;
    }

    let lineIdx = 0;
    let charIdx = 0;
    let typedChars = 0;

    const CHAR_DELAY = 1.5;
    const LINE_DELAY = 8;

    function typeNext() {
      if (done || skipping) return;

      if (lineIdx >= LINES.length) {
        renderProgress(100);
        if (hint) hint.textContent = '[ 100 % ] PRÊT';
        clearTimeout(failsafe);
        setTimeout(finish, 300);
        return;
      }

      const line = LINES[lineIdx];

      if (charIdx < line.length) {
        out += line[charIdx];
        charIdx++;
        typedChars++;
        log.textContent = out;
        log.scrollTop = log.scrollHeight;

        renderProgress((typedChars / totalChars) * 100);
        setTimeout(typeNext, CHAR_DELAY);
      } else {
        out += '\n';
        typedChars++;
        log.textContent = out;
        log.scrollTop = log.scrollHeight;
        lineIdx++;
        charIdx = 0;

        renderProgress((typedChars / totalChars) * 100);
        setTimeout(typeNext, LINE_DELAY);
      }
    }

    typeNext();
  })();

  /* ============================================================
     4. CLOCK
     ============================================================ */
  (function initClock() {
    const el = document.getElementById('navClock');
    if (!el) return;
    function tick() {
      const d = new Date();
      el.textContent = pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
    }
    tick();
    setInterval(tick, 1000);
  })();

  /* ============================================================
     5. NAV SHRINK
     ============================================================ */
  (function initNavScroll() {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });
  })();

  /* ============================================================
     6. CARROUSEL
     ============================================================ */
  (function initCarousel() {
    const track = document.getElementById('track');
    const dots  = document.getElementById('dots');
    const prev  = document.getElementById('prev');
    const next  = document.getElementById('next');
    if (!track || !dots) return;

    const slides = track.querySelectorAll('.carousel-slide');
    const TOTAL = slides.length;
    let index = 0;

    function build() {
      dots.innerHTML = '';
      for (let i = 0; i < TOTAL; i++) {
        const d = document.createElement('button');
        d.type = 'button';
        d.className = 'dot' + (i === 0 ? ' active' : '');
        d.setAttribute('aria-label', 'Aller au projet ' + (i + 1));
        d.addEventListener('click', () => go(i));
        dots.appendChild(d);
      }
    }

    function go(n) {
      index = ((n % TOTAL) + TOTAL) % TOTAL;
      track.style.transform = 'translateX(-' + (index * 100) + '%)';
      dots.querySelectorAll('.dot').forEach((d, i) => {
        d.classList.toggle('active', i === index);
      });
    }

    build();

    if (prev) prev.addEventListener('click', () => go(index - 1));
    if (next) next.addEventListener('click', () => go(index + 1));

    let touchX = 0;
    track.addEventListener('touchstart', (e) => {
      touchX = e.touches[0].clientX;
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
      const diff = touchX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) go(diff > 0 ? index + 1 : index - 1);
    });

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const modal = document.getElementById('gameModal');
      if (modal && modal.classList.contains('active')) return;
      if (e.key === 'ArrowLeft')  go(index - 1);
      if (e.key === 'ArrowRight') go(index + 1);
    });
  })();

  /* ============================================================
     7. SCROLL REVEAL
     ============================================================ */
  (function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('visible'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), i * 60);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    els.forEach((el) => io.observe(el));
  })();

  /* ============================================================
     7b. MOBILE NAV TOGGLE
     ============================================================ */
  (function initMobileNav() {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen);
      toggle.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
    });

    // Close menu when clicking a link
    links.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Ouvrir le menu');
      });
    });

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && links.classList.contains('open')) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Ouvrir le menu');
      }
    });
  })();

  /* ============================================================
     8. EXPLOSION / SMOKE / SOUND
     ============================================================ */
  const smokeContainer   = document.getElementById('smokeContainer');
  const explosionOverlay = document.getElementById('explosionOverlay');
  const explosionText    = document.getElementById('explosionText');

  const PANIC_MESSAGES = [
    '💥 BOOM !', '🔥 FEU !', '💀 RIP SITE', '🤯 PANIQUE', '😱 NOOOOOOON', '💻 FUMÉE'
  ];

  function createSmokeParticle() {
    if (!smokeContainer) return;
    const p = document.createElement('div');
    p.className = 'smoke-particle';

    const size  = 150 + Math.random() * 200;
    const left  = Math.random() * 100;
    const dur   = 5 + Math.random() * 4;
    const delay = Math.random() * 2;
    const op    = 0.3 + Math.random() * 0.3;

    p.style.width  = size + 'px';
    p.style.height = size + 'px';
    p.style.left   = left + '%';
    p.style.animationDuration = dur + 's';
    p.style.animationDelay    = delay + 's';
    p.style.opacity = op;
    p.style.background =
      'radial-gradient(circle, rgba(220,220,220,' + op + ') 0%, ' +
      'rgba(180,180,180,' + (op * 0.4) + ') 40%, ' +
      'rgba(150,150,150,0) 80%)';

    smokeContainer.appendChild(p);
    setTimeout(() => p.remove(), (dur + delay) * 1000 + 500);
  }

  function startSmoke() {
    if (!smokeContainer) return;
    smokeContainer.classList.add('active');
    const count = 40 + Math.floor(Math.random() * 25);
    for (let i = 0; i < count; i++) setTimeout(createSmokeParticle, i * 100);
    for (let i = 0; i < 20; i++) setTimeout(createSmokeParticle, 2000 + i * 150);
  }

  function stopSmoke() {
    if (!smokeContainer) return;
    smokeContainer.classList.remove('active');
    setTimeout(() => { smokeContainer.innerHTML = ''; }, 3000);
  }

  function playExplosionSound() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;

      const ac = new AC();
      const size = Math.floor(ac.sampleRate * 0.7);
      const buf  = ac.createBuffer(1, size, ac.sampleRate);
      const data = buf.getChannelData(0);

      for (let i = 0; i < size; i++) {
        const t = i / ac.sampleRate;
        const env = Math.exp(-t * 5);
        const sq  = Math.sign(Math.sin(2 * Math.PI * 80 * t));
        const noi = (Math.random() * 2 - 1) * 0.3;
        data[i] = (sq * 0.6 + noi) * env;
      }

      const src  = ac.createBufferSource();
      src.buffer = buf;

      const gain = ac.createGain();
      gain.gain.setValueAtTime(1.2, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.8);

      const dist = ac.createWaveShaper();
      const n = 44100;
      const curve = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i / n) * 2 - 1;
        curve[i] = Math.tanh(x * 2) * 1.5;
      }
      dist.curve = curve;

      src.connect(dist);
      dist.connect(gain);
      gain.connect(ac.destination);
      src.start();
    } catch (e) {}
  }

  let isExploding = false;

  function triggerExplosion(resetFn) {
    if (isExploding) return;
    isExploding = true;

    playExplosionSound();
    startSmoke();

    if (explosionOverlay) explosionOverlay.classList.add('active');
    document.body.classList.add('site-shake');

    if (explosionText) {
      explosionText.textContent =
        PANIC_MESSAGES[(Math.random() * PANIC_MESSAGES.length) | 0];
    }

    setTimeout(() => {
      document.body.classList.remove('site-shake');
      document.body.classList.add('site-fadeout');
      stopSmoke();

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.body.classList.remove('site-fadeout');
        document.body.classList.add('site-fadein');

        if (typeof resetFn === 'function') resetFn();
        if (explosionOverlay) explosionOverlay.classList.remove('active');

        setTimeout(() => {
          document.body.classList.remove('site-fadein');
          isExploding = false;
        }, 1000);
      }, 800);
    }, 1500);
  }

  /* ============================================================
     9. CLIPBOARD
     ============================================================ */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
      } catch (err) {
        return false;
      }
    }
  }

  /* ============================================================
     10. EMAIL BUTTON
     ============================================================ */
  (function initEmailBtn() {
    const btn = document.getElementById('copyEmailBtn');
    const fb  = document.getElementById('emailFeedbackMsg');
    if (!btn) return;

    const EMAIL = 'robin.martinent@gmail.com';
    const MSGS = [
      'Copié', 'Copié ×2', 'Copié ×3', 'Copié ×4',
      'T\'as vraiment copié ?', 'Recopie au cas où...',
      'Tu vas casser le bouton', 'Arrête...',
      'Ça va casser le site', 'NOOOOOOON'
    ];
    const SHAKES = ['', 'shake1', 'shake2', 'shake3', 'shake4', 'shake5'];

    let clicks = 0;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (isExploding) return;

      await copyText(EMAIL);

      clicks++;
      const idx = Math.min(clicks - 1, MSGS.length - 1);
      if (fb) fb.textContent = MSGS[idx];
      btn.classList.add('copied');

      let level = 0;
      if (clicks >= 10) level = 5;
      else if (clicks >= 8) level = 4;
      else if (clicks >= 6) level = 3;
      else if (clicks >= 4) level = 2;
      else if (clicks >= 2) level = 1;

      if (level > 0 && level < SHAKES.length) {
        btn.style.animation = SHAKES[level] + ' 0.5s ease';
        setTimeout(() => { btn.style.animation = ''; }, 500);
      }

      if (clicks >= MSGS.length) {
        setTimeout(() => {
          triggerExplosion(() => {
            btn.classList.remove('copied');
            btn.style.animation = '';
            if (fb) fb.textContent = 'Copié';
            clicks = 0;
          });
        }, 400);
        return;
      }

      setTimeout(() => {
        btn.classList.remove('copied');
        if (clicks < MSGS.length && fb) fb.textContent = 'Copié';
      }, 1800);
    });
  })();

  /* ============================================================
     11. PHONE BUTTON
     ============================================================ */
  (function initPhoneBtn() {
    const btn = document.getElementById('copyPhoneBtn');
    const fb  = document.getElementById('phoneFeedbackMsg');
    if (!btn) return;

    const PHONE = '0766740346';
    const MSGS = [
      'Copié',
      'J\'allais pas faire la même chose...',
      'Mais si, je l\'ai fait.',
      'T\'es têtu toi.',
      'Bon, voilà, c\'est copié.',
      'Tu veux que je le dise plus fort ?',
      '07 66 74 03 46',
      'Ça suffit maintenant.',
      'Je t\'ai copié 9 fois.',
      'T\'as gagné, j\'arrête.'
    ];
    const WOBBLES = ['', 'wobble1', 'wobble2', 'wobble3', 'wobble4', 'wobble5'];

    let clicks = 0;
    let locked = false;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (locked) return;

      await copyText(PHONE);

      clicks++;
      const idx = Math.min(clicks - 1, MSGS.length - 1);
      if (fb) fb.textContent = MSGS[idx];
      btn.classList.add('copied');

      let level = 0;
      if (clicks >= 10) level = 5;
      else if (clicks >= 8) level = 4;
      else if (clicks >= 6) level = 3;
      else if (clicks >= 4) level = 2;
      else if (clicks >= 2) level = 1;

      if (level > 0 && level < WOBBLES.length) {
        btn.style.animation = WOBBLES[level] + ' 0.6s ease';
        setTimeout(() => { btn.style.animation = ''; }, 600);
      }

      if (clicks >= MSGS.length) {
        locked = true;
        btn.disabled = true;
        btn.style.borderColor = 'var(--red)';
        btn.style.color = 'var(--red)';

        setTimeout(() => {
          btn.disabled = false;
          btn.classList.remove('copied');
          btn.style.borderColor = '';
          btn.style.color = '';
          if (fb) fb.textContent = 'Copié';
          clicks = 0;
          locked = false;
        }, 3000);
        return;
      }

      setTimeout(() => {
        btn.classList.remove('copied');
        if (clicks < MSGS.length && fb) fb.textContent = 'Copié';
      }, 1800);
    });
  })();

  /* ============================================================
     12. J / K / L AUTO-SCROLL
     ============================================================ */
  (function initAutoscroll() {
    const SPEED = 9;
    const indicator = document.getElementById('playIndicator');

    let speed = 0;
    let raf = null;

    function step() {
      if (speed !== 0) {
        window.scrollBy(0, speed);
        raf = requestAnimationFrame(step);
      }
    }

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const modal = document.getElementById('gameModal');
      if (modal && modal.classList.contains('active')) return;

      const k = e.key.toLowerCase();

      if (k === 'l') {
        speed = SPEED;
        cancelAnimationFrame(raf);
        step();
        if (indicator) { indicator.textContent = '▶ 3x'; indicator.classList.add('active'); }
        e.preventDefault();
      } else if (k === 'j') {
        speed = -SPEED;
        cancelAnimationFrame(raf);
        step();
        if (indicator) { indicator.textContent = '◀ 3x'; indicator.classList.add('active'); }
        e.preventDefault();
      } else if (k === 'k') {
        speed = 0;
        cancelAnimationFrame(raf);
        if (indicator) indicator.classList.remove('active');
        e.preventDefault();
      }
    });
  })();

  /* ============================================================
     13. MINI-GAME
     ============================================================ */
  const gameModal   = document.getElementById('gameModal');
  const gameBoard   = document.getElementById('gameBoard');
  const gameTimerEl = document.getElementById('gameTimer');
  const gameErrEl   = document.getElementById('gameErrors');
  const gameResult  = document.getElementById('gameResult');
  const gameClose   = document.getElementById('gameClose');
  const gameRestart = document.getElementById('gameRestart');

  let gameActive = false;
  let gameStart = 0;
  let gameInt = null;
  let gameNext = 1;
  let gameErr = 0;

  function openGame() {
    if (!gameModal) return;
    gameModal.classList.add('active');
    startGame();
  }

  function closeGame() {
    if (!gameModal) return;
    gameModal.classList.remove('active');
    gameActive = false;
    if (gameInt) clearInterval(gameInt);
  }

  function startGame() {
    if (!gameBoard) return;

    gameActive = true;
    gameNext = 1;
    gameErr = 0;

    if (gameErrEl) gameErrEl.textContent = '0';
    if (gameResult) {
      gameResult.textContent = '';
      gameResult.className = 'game-result';
    }

    gameStart = performance.now();

    const nums = [1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
    gameBoard.innerHTML = '';

    nums.forEach((num) => {
      const clip = document.createElement('button');
      clip.type = 'button';
      clip.className = 'game-clip';
      clip.dataset.num = String(num);
      clip.textContent = String(num);
      clip.addEventListener('click', () => handleClip(clip, num));
      gameBoard.appendChild(clip);
    });

    if (gameInt) clearInterval(gameInt);
    gameInt = setInterval(() => {
      if (!gameActive) return;
      const t = (performance.now() - gameStart) / 1000;
      if (gameTimerEl) gameTimerEl.textContent = t.toFixed(2);
    }, 50);
  }

  function handleClip(clip, num) {
    if (!gameActive || clip.classList.contains('done')) return;

    if (num === gameNext) {
      clip.classList.add('done');
      clip.textContent = '✓';
      gameNext++;

      if (gameNext > 5) {
        gameActive = false;
        clearInterval(gameInt);

        const t = (performance.now() - gameStart) / 1000;
        let msg;
        if (t < 2 && gameErr === 0)       msg = '🏆 Parfait. Monteur de génie.';
        else if (t < 3.5 && gameErr <= 1) msg = '🎬 Excellent montage.';
        else if (t < 5)                   msg = '👍 Bon rythme, continue comme ça.';
        else                              msg = '😅 Un peu lent, mais c\'est monté.';

        if (gameResult) {
          gameResult.textContent = msg + ' (' + t.toFixed(2) + 's · ' +
            gameErr + ' erreur' + (gameErr > 1 ? 's' : '') + ')';
          gameResult.classList.add('success');
        }
      }
    } else {
      gameErr++;
      if (gameErrEl) gameErrEl.textContent = String(gameErr);
      clip.classList.add('error');
      setTimeout(() => clip.classList.remove('error'), 400);
    }
  }

  if (gameModal) {
    if (gameClose)   gameClose.addEventListener('click', closeGame);
    if (gameRestart) gameRestart.addEventListener('click', startGame);

    gameModal.addEventListener('click', (e) => {
      if (e.target === gameModal) closeGame();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && gameModal.classList.contains('active')) closeGame();
    });
  }

  /* ============================================================
     14. EASTER EGG — TYPE "MONTAGE"
     ============================================================ */
  (function initEasterEgg() {
    let buffer = '';

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      buffer += e.key.toLowerCase();
      if (buffer.length > 12) buffer = buffer.slice(-12);

      if (buffer.includes('montage')) {
        buffer = '';
        openGame();
      }
    });
  })();

  /* ============================================================
     15. THEME TOGGLE (Light/Dark mode with time-based default)
     ============================================================ */
  (function initThemeToggle() {
    const toggleBtn = document.getElementById('themeToggle');
    if (!toggleBtn) return;

    const THEME_KEY = 'rm_theme';
    const DARK_CLASS = 'theme-light'; // We add this class for light mode (since default is dark)

    // Get current hour in Paris timezone
    function getParisHour() {
      const now = new Date();
      const parisTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
      return parisTime.getHours();
    }

    // Determine theme based on Paris time (08:00-20:00 = light, else dark)
    function getTimeBasedTheme() {
      const hour = getParisHour();
      return (hour >= 8 && hour < 20) ? 'light' : 'dark';
    }

    // Check saved preference, then time-based, then system preference
    function getInitialTheme() {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved) return saved; // User manual choice always wins
      return getTimeBasedTheme(); // Time-based default
    }

    function applyTheme(theme) {
      if (theme === 'light') {
        document.documentElement.classList.add(DARK_CLASS);
        toggleBtn.setAttribute('aria-label', 'Passer au thème sombre');
        toggleBtn.setAttribute('aria-pressed', 'true');
      } else {
        document.documentElement.classList.remove(DARK_CLASS);
        toggleBtn.setAttribute('aria-label', 'Passer au thème clair');
        toggleBtn.setAttribute('aria-pressed', 'false');
      }
    }

    // Initialize
    const initialTheme = getInitialTheme();
    applyTheme(initialTheme);

    toggleBtn.addEventListener('click', () => {
      const isLight = document.documentElement.classList.contains(DARK_CLASS);
      const newTheme = isLight ? 'dark' : 'light';
      localStorage.setItem(THEME_KEY, newTheme);
      applyTheme(newTheme);
    });

    // Listen for system preference changes (only if no user preference)
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        // Still prefer time-based over system
        applyTheme(getTimeBasedTheme());
      }
    });

    // Optional: Re-evaluate time-based theme periodically (e.g., every hour)
    setInterval(() => {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(getTimeBasedTheme());
      }
    }, 60 * 60 * 1000); // Check every hour
  })();

  /* ============================================================
     16. FIRST-VISIT ENTRANCE ANIMATIONS
     ============================================================ */
  (function initFirstVisitAnimations() {
    const FIRST_VISIT_KEY = 'rm_first_visit';
    const hasVisited = sessionStorage.getItem(FIRST_VISIT_KEY);

    if (!hasVisited) {
      // First visit in this session - add class to trigger animations
      document.body.classList.add('first-visit');
      sessionStorage.setItem(FIRST_VISIT_KEY, 'true');

      // Remove the class after animations complete (longest animation ~1.5s)
      // We keep it for a bit longer to ensure all staggered animations finish
      setTimeout(() => {
        document.body.classList.remove('first-visit');
      }, 3000);
    }
  })();

  /* ============================================================
     17. SKILLS CLICK-LOCK — Bidirectional highlight with persistence
     ============================================================ */
  (function initSkillsClickLock() {
    const skillCards = document.querySelectorAll('.skill-card[data-skill]');
    const toolTags = document.querySelectorAll('.tool-tag[data-skill]');
    if (!skillCards.length || !toolTags.length) return;

    let lockedSkill = null;

    function clearAllLocks() {
      skillCards.forEach(card => card.classList.remove('skill-card--locked'));
      toolTags.forEach(tag => {
        tag.classList.remove('tool-tag--highlighted', 'tool-tag--dimmed');
      });
      lockedSkill = null;
    }

    function applyLock(skill) {
      clearAllLocks();

      // Lock the clicked skill card
      const card = document.querySelector(`.skill-card[data-skill="${skill}"]`);
      if (card) card.classList.add('skill-card--locked');

      // Highlight matching tools, dim others
      toolTags.forEach(tag => {
        const tagSkills = tag.dataset.skill.split(' ');
        if (tagSkills.includes(skill)) {
          tag.classList.add('tool-tag--highlighted');
        } else {
          tag.classList.add('tool-tag--dimmed');
        }
      });

      lockedSkill = skill;
    }

    skillCards.forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't trigger if clicking on interactive elements inside
        if (e.target.closest('a, button')) return;

        const skill = card.dataset.skill;
        if (lockedSkill === skill) {
          // Click same skill again -> unlock
          clearAllLocks();
        } else {
          // Lock new skill
          applyLock(skill);
        }
      });

      // Keyboard support
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });

    // Also allow clicking a highlighted tool to unlock
    toolTags.forEach(tag => {
      tag.addEventListener('click', () => {
        if (lockedSkill && tag.classList.contains('tool-tag--highlighted')) {
          clearAllLocks();
        }
      });
    });

    // Click outside to unlock
    document.addEventListener('click', (e) => {
      if (lockedSkill &&
          !e.target.closest('.skill-card') &&
          !e.target.closest('.tool-tag')) {
        clearAllLocks();
      }
    });
  })();

})();
