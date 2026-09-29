/* ============================================================
   CHROME CORE — Interactive ASCII field (full viewport) + logic
   Boot : plus de lignes, copyright 2005-2077, easter egg Minecraft,
          progression 100 %, ne se relance pas en navigation interne
          (uniquement à la première visite ou au refresh).
   ============================================================ */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const pad2 = (n) => n.toString().padStart(2, '0');

  /* ============================================================
     1. INTERACTIVE ASCII FIELD — plein viewport
     ============================================================ */
  (function initAsciiField() {
    const canvas = document.getElementById('asciiField');
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });

    const GLYPHS = ['·', '.', ':', '-', '=', '+', '*', 'x', '#', '%', '@'];
    const CELL_W = 14;
    const CELL_H = 16;

    let W = 0, H = 0;
    let dpr = 1;
    let cols = 0, rows = 0;

    let mx = -9999, my = -9999;
    let tmx = -9999, tmy = -9999;
    let hasMouse = false;

    const MOUSE_R = 120;
    const MOUSE_R_SQ = MOUSE_R * MOUSE_R;

    const waves = [];
    const WAVE_LIFE = 1400;
    const WAVE_MAX_R = 480;
    const WAVE_THICKNESS = 60;

    const hudFps = document.getElementById('hudFps');
    const hudCells = document.getElementById('hudCells');

    let fpsFrames = 0;
    let fpsLast = performance.now();

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;

      canvas.width  = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width  = W + 'px';
      canvas.style.height = H + 'px';

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(W / CELL_W) + 1;
      rows = Math.ceil(H / CELL_H) + 1;

      if (hudCells) hudCells.textContent = (cols * rows).toLocaleString('fr-FR');
    }

    resize();
    window.addEventListener('resize', resize);
    setTimeout(resize, 80);
    setTimeout(resize, 400);

    window.addEventListener('mousemove', (e) => {
      tmx = e.clientX;
      tmy = e.clientY;
      if (!hasMouse) {
        mx = tmx;
        my = tmy;
        hasMouse = true;
      }
    });

    window.addEventListener('mouseleave', () => {
      hasMouse = false;
      tmx = -9999;
      tmy = -9999;
    });

    let tintShift = 0;

    window.addEventListener('click', (e) => {
      if (e.target.closest('a, button, input, select, textarea, .game-clip, .dot, .arrow')) return;

      const hue = (tintShift * 47 + performance.now() * 0.05) % 360;

      waves.push({
        x: e.clientX,
        y: e.clientY,
        t0: performance.now(),
        life: WAVE_LIFE,
        maxR: Math.min(WAVE_MAX_R, Math.max(W, H) * 0.8),
        hue: hue
      });

      tintShift = (tintShift + 1) % 12;
    });

    window.addEventListener('touchstart', (e) => {
      if (e.target.closest('a, button, input, select, textarea, .game-clip, .dot, .arrow')) return;
      const t = e.touches[0];
      if (!t) return;
      waves.push({
        x: t.clientX,
        y: t.clientY,
        t0: performance.now(),
        life: WAVE_LIFE,
        maxR: Math.min(WAVE_MAX_R, Math.max(W, H) * 0.8),
        hue: (performance.now() * 0.05) % 360
      });
    }, { passive: true });

    if (reduceMotion) {
      ctx.clearRect(0, 0, W, H);
      ctx.font = `500 ${Math.max(10, CELL_H * 0.75)}px 'JetBrains Mono', monospace`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const wave =
            Math.sin(x * 0.14) * 0.5 +
            Math.cos(y * 0.18) * 0.5;
          const intensity = 0.3 + wave * 0.15;
          if (intensity < 0.25) continue;

          const ci = Math.min(GLYPHS.length - 1, Math.floor(intensity * GLYPHS.length));
          const ch = GLYPHS[ci];
          if (ch === '·' && intensity < 0.28) continue;

          ctx.fillStyle = `rgba(167, 139, 250, ${intensity * 0.35})`;
          ctx.fillText(ch, x * CELL_W + CELL_W * 0.5, y * CELL_H + CELL_H * 0.5);
        }
      }
      return;
    }

    function render(now) {
      if (hasMouse) {
        mx += (tmx - mx) * 0.16;
        my += (tmy - my) * 0.16;
      } else {
        mx += (-9999 - mx) * 0.05;
        my += (-9999 - my) * 0.05;
      }

      for (let i = waves.length - 1; i >= 0; i--) {
        if (now - waves[i].t0 > waves[i].life) {
          waves.splice(i, 1);
        }
      }

      const t = now * 0.001;
      ctx.clearRect(0, 0, W, H);

      const fontSize = Math.max(10, CELL_H * 0.78);
      ctx.font = `500 ${fontSize}px 'JetBrains Mono', 'Menlo', monospace`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

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
              if (mouseFactor * 1.25 > intensity) {
                intensity = mouseFactor * 1.25;
              }
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

            const delta = dist - frontR;
            const absDelta = Math.abs(delta);

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

          if (intensity < 0.14) continue;

          const clamped = intensity > 1 ? 1 : intensity;

          const ci = Math.min(
            GLYPHS.length - 1,
            Math.floor(clamped * GLYPHS.length)
          );
          const glyph = GLYPHS[ci];
          if (glyph === '·' && clamped < 0.22) continue;

          const alpha = Math.min(1, 0.25 + clamped * 0.85);

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
     2. BOOT — plus de lignes · progression réelle 100 %
        Ne se rejoue pas en navigation interne (sessionStorage).
        Se rejoue au refresh (PerformanceNavigationTiming.type = 'reload').
     ============================================================ */
  (function initBoot() {
    const boot = document.getElementById('boot');
    const log  = document.getElementById('bootLog');
    const bar  = document.getElementById('bootBar');
    const hint = document.getElementById('bootHint');
    if (!boot || !log || !bar) return;

    // ---- Détection du contexte de chargement ----
    let navType = 'navigate';
    try {
      const entries = performance.getEntriesByType('navigation');
      if (entries && entries.length && entries[0].type) {
        navType = entries[0].type; // 'navigate' | 'reload' | 'back_forward' | 'prerender'
      }
    } catch (e) { /* performance API indisponible */ }

    let bootAlreadyDone = false;
    try {
      bootAlreadyDone = sessionStorage.getItem('rm_boot_done') === '1';
    } catch (e) { /* sessionStorage désactivé */ }

    const isReload = navType === 'reload';
    const isBack   = navType === 'back_forward';

    // Skip : navigation interne (lien) ou retour arrière — sauf refresh explicite.
    if (bootAlreadyDone && !isReload && !isBack) {
      boot.classList.add('hidden');
      boot.style.display = 'none';
      return;
    }

    function markDone() {
      try { sessionStorage.setItem('rm_boot_done', '1'); } catch (e) {}
    }

    // ---- 27 lignes dont un clin d'œil Minecraft ----
    const LINES = [
      'RM/OS  CHROME CORE  BIOS v4.0.1',
      'Copyright (C) 2005-2077 Robin Martinent',
      '',
      '> POST ............................. OK',
      '> Vérification mémoire ............ 640K OK',
      '> Détection clavier ............... OK',
      '> Détection souris ................ OK',
      '> Détection lecteur CD-ROM ........ OK',
      '> Détection carte son ............. OK',
      '> Vérification carte graphique .... OK',
      '> Initialisation GPU .............. OK',
      '> Compilation shaders WebGL ....... OK',
      '> Chargement MONTAGE.SYS .......... OK',
      '> Chargement MOTION.DLL ........... OK',
      '> Chargement CREATIVE.DRV ......... OK',
      '> Chargement CHROME.CORE .......... OK',
      '> Chargement ASCII.FIELD .......... OK',
      '> Chargement JAVA.RUNTIME ......... EXTERNAL',
      '> Chargement NETHER.PORTAL ........ OK',
      '> Chargement REDSTONE.CIRCUIT ..... OK',
      '> Chargement ENDER.PEARL .......... OK',
      '> Spawn du monde /projets ......... OK',
      '> Indexation rushes /projets ...... OK',
      '> Montage des volumes D:\\ ......... OK',
      '> Calibration timecode 25 fps ..... OK',
      '> Ouverture session ............... ROBIN',
      '',
      '> BIENVENUE, ROBIN.'
    ];

    // Total de caractères à taper = progression réaliste
    const totalChars = LINES.reduce((sum, l) => sum + l.length + 1, 0);

    let done = false;

    function finish() {
      if (done) return;
      done = true;
      markDone();
      // Force la barre à 100 % avant de masquer le loader.
      bar.style.width = '100%';
      boot.classList.add('hidden');
      setTimeout(() => { boot.style.display = 'none'; }, 450);
    }

    // Raccourcis utilisateur
    window.addEventListener('keydown', finish);
    window.addEventListener('click', finish);
    window.addEventListener('touchstart', finish, { passive: true });

    // Failsafe : on laisse la barre atteindre 100 % puis on ferme.
    const failsafe = setTimeout(() => {
      bar.style.width = '100%';
      if (hint) hint.textContent = 'CHARGEMENT DU PORTFOLIO...';
      setTimeout(finish, 500);
    }, 12000);

    if (reduceMotion) {
      log.textContent = LINES.join('\n');
      bar.style.width = '100%';
      clearTimeout(failsafe);
      setTimeout(finish, 400);
      return;
    }

    let lineIdx = 0;
    let charIdx = 0;
    let typedChars = 0;
    let out = '';

    function typeNext() {
      if (done) return;

      if (lineIdx >= LINES.length) {
        if (hint) hint.textContent = 'CHARGEMENT DU PORTFOLIO...';
        bar.style.width = '100%';
        clearTimeout(failsafe);
        setTimeout(finish, 500);
        return;
      }

      const line = LINES[lineIdx];

      if (charIdx < line.length) {
        out += line[charIdx];
        charIdx++;
        typedChars++;
        log.textContent = out;
        log.scrollTop = log.scrollHeight;

        // Progression réelle : caractères tapés / total
        const progress = Math.min((typedChars / totalChars) * 100, 100);
        bar.style.width = progress + '%';

        setTimeout(typeNext, 2);
      } else {
        out += '\n';
        typedChars++;
        log.textContent = out;
        log.scrollTop = log.scrollHeight;
        lineIdx++;
        charIdx = 0;

        const progress = Math.min((typedChars / totalChars) * 100, 100);
        bar.style.width = progress + '%';

        setTimeout(typeNext, 14);
      }
    }

    typeNext();
  })();

  /* ============================================================
     3. CLOCK
     ============================================================ */
  (function initClock() {
    const el = document.getElementById('navClock');
    if (!el) return;
    function tick() {
      const d = new Date();
      el.textContent =
        pad2(d.getHours()) + ':' +
        pad2(d.getMinutes()) + ':' +
        pad2(d.getSeconds());
    }
    tick();
    setInterval(tick, 1000);
  })();

  /* ============================================================
     4. NAV SHRINK
     ============================================================ */
  (function initNavScroll() {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    }, { passive: true });
  })();

  /* ============================================================
     5. CAROUSEL
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
     6. SCROLL REVEAL
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
     7. EXPLOSION / SMOKE / SOUND
     ============================================================ */
  const smokeContainer   = document.getElementById('smokeContainer');
  const explosionOverlay = document.getElementById('explosionOverlay');
  const explosionText    = document.getElementById('explosionText');

  const PANIC_MESSAGES = [
    '💥 BOOM !',
    '🔥 FEU !',
    '💀 RIP SITE',
    '🤯 PANIQUE',
    '😱 NOOOOOOON',
    '💻 FUMÉE'
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
    } catch (e) { /* silent */ }
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
     8. CLIPBOARD
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
     9. EMAIL BUTTON
     ============================================================ */
  (function initEmailBtn() {
    const btn = document.getElementById('copyEmailBtn');
    const fb  = document.getElementById('emailFeedbackMsg');
    if (!btn) return;

    const EMAIL = 'robin.martinent@gmail.com';
    const MSGS = [
      'Copié',
      'Copié ×2',
      'Copié ×3',
      'Copié ×4',
      'T\'as vraiment copié ?',
      'Recopie au cas où...',
      'Tu vas casser le bouton',
      'Arrête...',
      'Ça va casser le site',
      'NOOOOOOON'
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
     10. PHONE BUTTON
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
     11. CUSTOM CURSOR — global
     ============================================================ */
  (function initCursor() {
    const ring = document.getElementById('cursorRing');
    const dot  = document.getElementById('cursorDot');
    if (!ring || !dot) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx, ry = my;
    let dx = mx, dy = my;
    let visible = false;

    function loop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      dx += (mx - dx) * 0.4;
      dy += (my - dy) * 0.4;

      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      dot.style.left  = dx + 'px';
      dot.style.top   = dy + 'px';

      requestAnimationFrame(loop);
    }

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;

      if (!visible) {
        visible = true;
        ring.classList.add('visible');
        dot.classList.add('visible');
        rx = mx; ry = my;
        dx = mx; dy = my;
      }
    });

    document.addEventListener('mouseleave', () => {
      visible = false;
      ring.classList.remove('visible');
      dot.classList.remove('visible');
    });

    const hoverSel = 'a, button, .btn, .arrow, .dot, .game-clip, .cv-item, .skill-card, .tool-tag, .game-close, .nav-logo';

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverSel)) ring.classList.add('hovering');
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverSel)) ring.classList.remove('hovering');
    });

    loop();
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
        if (indicator) {
          indicator.textContent = '▶ 3x';
          indicator.classList.add('active');
        }
        e.preventDefault();
      } else if (k === 'j') {
        speed = -SPEED;
        cancelAnimationFrame(raf);
        step();
        if (indicator) {
          indicator.textContent = '◀ 3x';
          indicator.classList.add('active');
        }
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

})();
