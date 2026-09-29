/* ============================================================
   COOKIE BANNER — RGPD-compliant consent management
   - Stores choice in localStorage (essential — no consent needed)
   - Blocks / allows optional scripts (analytics, embeds)
   - "Refuser" and "Accepter" have equal weight (CNIL)
   ============================================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'rm_cookie_consent_v1';
  const CONSENT_VERSION = 1;

  const banner  = document.getElementById('cookieBanner');
  const btnOk   = document.getElementById('cookieAccept');
  const btnNo   = document.getElementById('cookieRefuse');
  const btnMg   = document.getElementById('manageCookies');

  /* ---------- Consent state ---------- */

  function readConsent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== CONSENT_VERSION) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeConsent(choice) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: CONSENT_VERSION,
        choice: choice,           // "accept" | "refuse"
        ts: Date.now()
      }));
    } catch (e) { /* localStorage unavailable — banner stays hidden */ }
  }

  /* ---------- Optional scripts ---------- */

  function loadAnalytics() {
    // Plausible : analytics sans cookies, sans données personnelles,
    // conforme RGPD par défaut. Aucun consentement requis, mais on
    // ne le charge que si l'utilisateur accepte, par principe.
    if (document.querySelector('script[data-analytics="plausible"]')) return;

    const s = document.createElement('script');
    s.defer = true;
    s.setAttribute('data-analytics', 'plausible');
    s.setAttribute('data-domain', 'robin-martinent.github.io');
    s.src = 'https://plausible.io/js/script.js';
    document.head.appendChild(s);
  }

  function enableOptional() {
    // Embeds YouTube : les iframes ont déjà loading="lazy" — ici on
    // remplace le placeholder par l'URL définitive si nécessaire.
    // Aucun tracker tiers n'est activé sans acceptation.
    loadAnalytics();

    // Notifie les autres scripts de l'acceptation.
    window.dispatchEvent(new CustomEvent('cookieConsent', {
      detail: { choice: 'accept' }
    }));
  }

  function disableOptional() {
    // Rien à bloquer : le site fonctionne sans tracker.
    window.dispatchEvent(new CustomEvent('cookieConsent', {
      detail: { choice: 'refuse' }
    }));
  }

  /* ---------- Banner visibility ---------- */

  function showBanner() {
    if (!banner) return;
    banner.hidden = false;
    // Force a reflow so the transition applies.
    void banner.offsetWidth;
    banner.classList.add('visible');
  }

  function hideBanner() {
    if (!banner) return;
    banner.classList.remove('visible');
    setTimeout(() => { banner.hidden = true; }, 500);
  }

  /* ---------- Actions ---------- */

  function accept() {
    writeConsent('accept');
    enableOptional();
    hideBanner();
  }

  function refuse() {
    writeConsent('refuse');
    disableOptional();
    hideBanner();
  }

  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    showBanner();
  }

  /* ---------- Init ---------- */

  function init() {
    const saved = readConsent();

    if (saved) {
      // Apply stored choice silently.
      if (saved.choice === 'accept') enableOptional();
      else disableOptional();
    } else {
      // First visit — wait a beat so the boot sequence can finish.
      setTimeout(showBanner, 3500);
    }

    if (btnOk) btnOk.addEventListener('click', accept);
    if (btnNo) btnNo.addEventListener('click', refuse);

    // "Gérer mes cookies" in the footer.
    if (btnMg) {
      btnMg.addEventListener('click', (e) => {
        e.preventDefault();
        reset();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
