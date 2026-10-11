/* ============================================================
   Portfolio Robin Martinent — ASCII field (hero) + logique.

   Drag élastique : les 3 lignes du titre (Monteur / Réalisateur /
   Créatif) sont draggables indépendamment. Tu tires vers la DROITE :
   le mot s'étire en scaleX depuis son bord gauche (ancrage à gauche),
   avec un léger squash vertical. Au relâchement, retour vif et
   nerveux avec un fort overshoot (cubic-bezier 2.6 sur 0.55s).

   Pas de rotation, pas de translation — uniquement de l'étirement.
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
              const
