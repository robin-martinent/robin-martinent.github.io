/* ============================================================
   Portfolio Robin Martinent — ASCII field (hero) + logique.

   Drag élastique : les 3 lignes du titre (Monteur / Réalisateur /
   Créatif) sont draggables indépendamment. Tu tires horizontalement,
   le mot s'étire (scaleX) comme un élastique, avec un léger squash
   vertical (scaleY < 1) — principe squash & stretch. Au relâchement,
   retour avec overshoot (cubic-bezier 1.8).
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

    const ctx = canvas.getContext('2d', { alpha: true });
    const GLYPHS = ['·', '.', ':', '-', '=', '+', '*', 'x', '#', '%', '@'];
    const CELL_W = 14;
    const CELL_H = 16;
    const MAX_DPR = 1.5;
    const FPS_CAP = 30;

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

    window.addEventListener('click', (e) => {
      if (e.target.closest('a, button, input, select, textarea, .game-clip, .dot, .arrow, .title-line')) return;
      const r = hero.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right) return;
      if (e.clientY < r.top  || e.clientY > r.bottom) return;
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
    });

    window.addEventListener('touchstart', (e) => {
      if (e.target.closest('a, button, input, select, textarea, .game-clip, .dot, .arrow, .title-line')) return;
      const t = e.touches[0];
      if (!t) return;
      const r = hero.getBoundingClientRect();
      if (t.clientX < r.left || t.clientX > r.right) return;
      if (t.clientY < r.top  || t.clientY > r.bottom) return;
      const p = heroPoint(t.clientX, t.clientY);
      waves.push({
        x: p.x, y: p.y,
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
          const wave = Math.sin(x * 0.14) * 0.5 + Math.cos(y * 0.18) * 0.5;
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
     2. DRAG ÉLASTIQUE AVEC ÉTIREMENT — sur chaque .title-line

     Principe :
     - pointerdown capture le pointeur et fixe le transform-origin
       au point de saisie (le côté attrapé reste ancré sous le
       doigt, l'autre côté s'étire en élastique).
     - pointermove calcule dx/dy. dx → scaleX (étirement horizontal).
       Un scaleY inversé (squash) affine le mot quand il s'étire.
     - pointerup : transition cubic-bezier(0.34, 1.8, ...) → le mot
       se re-squashe brièvement avant de reprendre sa forme exacte.
     ============================================================ */
  (function initTitleDrag() {
    const lines = document.querySelectorAll('.title-line');
    if (!lines.length || reduceMotion) return;

    // Petites valeurs pour garder un léger mouvement organique,
    // mais l'effet principal est l'étirement horizontal (scaleX).
    const MAX_ROT     = 3;      // degrés max (léger tilt)
    const ROT_K       = 0.035;  // degrés par pixel horizontal
    const TX_K        = 0.25;   // translation X = 25 % du déplacement
    const TY_K        = 0.20;   // translation Y = 20 % du déplacement
    const MAX_TX      = 14;     // pixels
    const MAX_TY      = 14;     // pixels

    // Étirement élastique — c'est ça l'effet principal.
    // 100 px de tirage → scaleX ≈ 1.7 (capé à 1.55).
    const STRETCH_K   = 0.007;
    const MAX_STRETCH = 1.55;
    // Squash & stretch : quand ça s'étire en X, ça s'affine en Y.
    const SQUASH_K    = 0.45;

    const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

    lines.forEach((el) => {
      let ready = false;
      let dragging = false;
      let pointerId = null;
      let startX = 0, startY = 0;
      let idleTimer = null;

      // Fin de fadeUp → on marque ready. Pas besoin de toucher
      // l'animation : fill-mode: backwards garantit que, l'anim
      // terminée, transform revient à sa valeur par défaut (none),
      // donc la propriété est libre pour le drag.
      el.addEventListener('animationend', () => { ready = true; }, { once: true });
      setTimeout(() => { ready = true; }, 1800);

      function apply(tx, ty, rot, sx, sy) {
        el.style.transform =
          'translate3d(' + tx + 'px,' + ty + 'px,0) ' +
          'rotate(' + rot + 'deg) ' +
          'scale(' + sx + ',' + sy + ')';
      }

      function onDown(e) {
        if (!ready || dragging) return;
        dragging = true;
        pointerId = e.pointerId;

        startX = e.clientX;
        startY = e.clientY;

        // Ancrage au point de saisie : si tu attrapes à gauche et
        // tires à droite, la droite s'étire. Si tu attrapes à droite
        // et tires à gauche, la gauche s'étire.
        const rect = el.getBoundingClientRect();
        const ox = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
        el.style.transformOrigin = ox + '% 50%';

        el.classList.remove('springing');
        el.classList.add('dragging');

        // Transition très courte pendant le drag : le texte suit le
        // doigt sans traîner, mais on évite le jitter frame-par-frame.
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
        const dy = e.clientY - startY;

        const rot = clamp(dx * ROT_K, -MAX_ROT, MAX_ROT);
        const tx  = clamp(dx * TX_K,  -MAX_TX,  MAX_TX);
        const ty  = clamp(dy * TY_K,  -MAX_TY,  MAX_TY);

        // Étirement élastique : la distance horizontale parcourue
        // étire le texte. |dx| → le mot s'étire dans les deux sens.
        const sx = clamp(1 + Math.abs(dx) * STRETCH_K, 1, MAX_STRETCH);
        // Squash : quand ça s'étire en X, ça s'affine en Y.
        const sy = 1 - (sx - 1) * SQUASH_K;

        apply(tx, ty, rot, sx, sy);
      }

      function release() {
        if (!dragging) return;
        dragging = false;
        pointerId = null;

        el.classList.remove('dragging');
        el.classList.add('springing');

        // Retour élastique : la classe .springing a déjà appliqué
        // la transition overshoot. On réinitialise juste la transform
        // → le mot va revenir en s'étirant/squashant brièvement avant
        // de se stabiliser.
        el.style.transition = '';
        apply(0, 0, 0, 1, 1);

        if (idleTimer) clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          el.classList.remove('springing');
          el.style.transform = '';
          el.style.transition = '';
          el.style.transformOrigin = '';
        }, 1100);
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
      '> Détection lecteur CD-ROM ........ OK',
      '> Détection carte son ............. OK',
      '> Vérification carte graphique .... OK',
      '> Initialisation GPU .............. OK',
      '> Compilation shaders WebGL ....... OK',
      '> Chargement MONTAGE.SYS .......... OK',
      '> Chargement MOTION.DLL ........... OK',
      '> Chargement CREATIVE.DRV ......... OK',
      '> Chargement PORTFOLIO.CORE ....... OK',
      '> Chargement ASCII.FIELD .......... OK',
      '> Chargement JAVA.RUNTIME ......... EXTERNAL',
      '> Chargement NETHER.PORTAL ........ OK',
     
