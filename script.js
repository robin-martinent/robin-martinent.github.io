/* ============================================================
   CHROME-CORE — Matrix rain + ASCII 3D skull + interactivity
   ============================================================ */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;

  const pad2 = (n) => n.toString().padStart(2, '0');

  /* ============================================================
     1. MATRIX RAIN
     ============================================================ */
  const MATRIX_GLYPHS = 'アカサタナハマヤラワ0123456789ABCDEF<>/\\|=+*#@$%&'.split('');
  const MATRIX_FONT_SIZE_MAX = 16;
  const MATRIX_FONT_SIZE_MIN = 11;

  function initMatrix() {
    const canvas = document.getElementById('matrixCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });

    let dpr = 1;
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let fontSize = 14;
    let drops = [];

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, width, height);

      fontSize = Math.max(
        MATRIX_FONT_SIZE_MIN,
        Math.min(MATRIX_FONT_SIZE_MAX, Math.round(width / 100))
      );

      cols = Math.floor(width / fontSize) + 1;
      rows = Math.floor(height / fontSize) + 1;

      drops = new Array(cols).fill(0).map(() => Math.random() * -rows);
    }

    resize();
    window.addEventListener('resize', resize);

    if (reduceMotion) {
      // Static render, no animation
      ctx.font = fontSize + "px 'JetBrains Mono', monospace";
      ctx.fillStyle = 'rgba(0, 255, 65, 0.4)';
      for (let i = 0; i < cols; i += 2) {
        const ch = MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)];
        ctx.fillText(ch, i * fontSize, Math.random() * height);
      }
      return;
    }

    let lastFrame = 0;
    const frameInterval = 1000 / 30; // 30 fps for matrix, plenty

    function draw(now) {
      if (now - lastFrame < frameInterval) {
        requestAnimationFrame(draw);
        return;
      }
      lastFrame = now;

      // Fade previous
      ctx.fillStyle = 'rgba(5, 5, 8, 0.09)';
      ctx.fillRect(0, 0, width, height);

      ctx.font = fontSize + "px 'JetBrains Mono', monospace";
      ctx.textBaseline = 'top';

      for (let i = 0; i < cols; i++) {
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        const glyph = MATRIX_GLYPHS[(Math.random() * MATRIX_GLYPHS.length) | 0];
        const r = Math.random
