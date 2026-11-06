/* ============================================================
   FOOTER ARC — vanilla WebGL port of Originkit's Predictive Arc Echo
   Rendu en arrière-plan du footer, plein cadre, réactif au curseur.
   Source originale : Predictive Arc 4 — Originkit (React → vanilla JS).
   ============================================================ */

(function () {
  'use strict';

  // Skip on touch devices (battery / perf) and reduced-motion users.
  if (window.matchMedia('(pointer: coarse)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('footerArc');
  if (!canvas) return;

  const container = canvas.parentElement;
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false
  });

  if (!gl) {
    canvas.style.display = 'none';
    return;
  }

  const VERT_SRC = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
  `;

  const FRAG_SRC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime, uDpr, uCell, uDot, uHover;
uniform vec2  uPtr;
uniform float uA, uB, uC, uD;
uniform vec3  uBg, uBase, uAccent, uHigh;

void main(){
  float cs = max(uCell, 2.0);
  vec2 ci = floor(gl_FragCoord.xy / cs);
  vec2 cc = (ci + 0.5) * cs;

  float x = cc.x / uDpr;
  float y = (uRes.y - cc.y) / uDpr;
  float w = uRes.x / uDpr;
  float h = uRes.y / uDpr;
  float t = uTime;

  float i = 0.0;
  float leanX = (uPtr.x - w * 0.5) * 0.5 * uHover;
  float leanY = (uPtr.y - h * 0.5) * 0.25 * uHover;
  float n1 = max(uA, 1.0);
  for (int n = 0; n < 8; n++) {
    float fn = float(n);
    if (fn >= n1) break;
    float par = 1.0 - 0.6 * fn / n1;
    float cx = w * 0.5 + leanX * par;
    float normX = (x - cx) / (w * 0.75);
    float curveY = h * 0.3 + fn * h * uB + leanY * par
                 + normX * normX * h * uC * (1.0 + 0.08 * fn);
    float th = (40.0 + (1.0 - min(abs(normX), 1.0)) * 25.0) * uD;
    float dist = abs(y - curveY);
    if (dist < th) {
      float b = 1.0 - dist / th;
      float waveX = sin(x * 0.015 + t);
      float waveY = cos(y * 0.02 + t);
      b = b * 0.7 + waveX * waveY * 0.3 * b;
      b *= max(0.0, 1.0 - pow(abs(normX), 2.5));
      b *= 0.45 + 0.55 * (0.5 + 0.5 * sin(t * 1.5 - fn * 0.9));
      i = max(i, b);
    }
  }

  vec3 col = uBg;
  if (i > 0.02) {
    float side = uDot * i * uDpr;
    vec2 d = abs(gl_FragCoord.xy - cc);
    float cov = 1.0 - smoothstep(side * 0.5 - 1.0, side * 0.5 + 1.0, max(d.x, d.y));

    vec3 ink = mix(uBase, uAccent, clamp(pow(i, 1.1), 0.0, 1.0));
    ink = mix(ink, uHigh, smoothstep(0.72, 1.0, i));
    col = mix(uBg, ink, cov * clamp(i * 1.6, 0.0, 1.0));
  }
  gl_FragColor = vec4(col, 1.0);
}
  `;

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('footer-arc shader:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT_SRC);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vs || !fs) { canvas.style.display = 'none'; return; }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('footer-arc link:', gl.getProgramInfoLog(prog));
    canvas.style.display = 'none';
    return;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const locs = {};
  function u(name) {
    if (!(name in locs)) locs[name] = gl.getUniformLocation(prog, name);
    return locs[name];
  }

  // ------------------------------------------------------------
  // Config — palette alignée sur le site (violet + chrome)
  // ------------------------------------------------------------
  const cfg = {
    density:     130,
    dotSize:     1.04,
    speed:       1,
    hover:       0.14,
    count:       5,
    gap:         0.09,
    archHeight:  0.7,
    thickness:   1,
    // Couleurs en RGB normalisé
    bg:     [0.039, 0.039, 0.039],   // #0a0a0a — fond du site
    base:   [0.298, 0.113, 0.584],   // #4c1d95 — violet profond
    accent: [0.655, 0.545, 0.980],   // #a78bfa — violet clair
    high:   [0.957, 0.957, 0.965]    // #f4f4f5 — texte du site
  };

  // ------------------------------------------------------------
  // Pointer state
  // ------------------------------------------------------------
  const ptr = { tx: 0.5, ty: 0.5, x: 0.5, y: 0.5 };

  // ------------------------------------------------------------
  // Sizing
  // ------------------------------------------------------------
  let W = 0, H = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = container.getBoundingClientRect();
    W = Math.max(1, Math.floor(rect.width * dpr));
    H = Math.max(1, Math.floor(rect.height * dpr));

    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    gl.viewport(0, 0, W, H);
  }

  resize();
  window.addEventListener('resize', resize);

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(resize);
    ro.observe(container);
  }

  // ------------------------------------------------------------
  // Render loop
  // ------------------------------------------------------------
  let raf = 0;
  let last = performance.now();
  let clock = 0;
  const PTR_RATE = 6.0;

  function render(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    clock = (clock + dt * 0.9 * cfg.speed) % 6283;

    const k = 1 - Math.exp(-dt * PTR_RATE);
    ptr.x += (ptr.tx - ptr.x) * k;
    ptr.y += (ptr.ty - ptr.y) * k;

    const cssW = W / dpr;
    const cssH = H / dpr;
    const pitchCss = Math.min(W, H) / dpr / cfg.density;

    gl.uniform2f(u('uRes'), W, H);
    gl.uniform1f(u('uTime'), clock);
    gl.uniform1f(u('uDpr'), dpr);
    gl.uniform1f(u('uCell'), Math.max(2, pitchCss * dpr));
    gl.uniform1f(u('uDot'), pitchCss * 1.2 * cfg.dotSize);
    gl.uniform1f(u('uA'), cfg.count);
    gl.uniform1f(u('uB'), cfg.gap);
    gl.uniform1f(u('uC'), cfg.archHeight);
    gl.uniform1f(u('uD'), cfg.thickness);
    gl.uniform1f(u('uHover'), cfg.hover);
    gl.uniform2f(u('uPtr'), ptr.x * cssW, ptr.y * cssH);
    gl.uniform3f(u('uBg'),     cfg.bg[0],     cfg.bg[1],     cfg.bg[2]);
    gl.uniform3f(u('uBase'),   cfg.base[0],   cfg.base[1],   cfg.base[2]);
    gl.uniform3f(u('uAccent'), cfg.accent[0], cfg.accent[1], cfg.accent[2]);
    gl.uniform3f(u('uHigh'),   cfg.high[0],   cfg.high[1],   cfg.high[2]);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(render);
  }

  raf = requestAnimationFrame(render);

  // ------------------------------------------------------------
  // Pointer tracking (sur le footer entier)
  // ------------------------------------------------------------
  function track(e) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    ptr.tx = nx < 0 ? 0 : nx > 1 ? 1 : nx;
    ptr.ty = ny < 0 ? 0 : ny > 1 ? 1 : ny;
  }

  function onLeave() {
    ptr.tx = 0.5;
    ptr.ty = 0.5;
  }

  container.addEventListener('pointermove', track);
  container.addEventListener('pointerenter', track);
  container.addEventListener('pointerleave', onLeave);

  // ------------------------------------------------------------
  // Pause when footer is off-screen (perf)
  // ------------------------------------------------------------
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!raf) {
            last = performance.now();
            raf = requestAnimationFrame(render);
          }
        } else {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      });
    }, { threshold: 0.01 });
    io.observe(container);
  }

  // ------------------------------------------------------------
  // Cleanup on page hide
  // ------------------------------------------------------------
  window.addEventListener('pagehide', () => {
    if (raf) cancelAnimationFrame(raf);
    container.removeEventListener('pointermove', track);
    container.removeEventListener('pointerenter', track);
    container.removeEventListener('pointerleave', onLeave);
  });
})();