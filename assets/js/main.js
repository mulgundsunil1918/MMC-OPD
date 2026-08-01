/* ==========================================================================
   Mulgund Multispeciality Clinic — main.js
   - Bilingual (English / Kannada) toggle with localStorage persistence
   - Mobile menu toggle
   - Google Business URL placeholder wiring
   ========================================================================== */

(function () {
  'use strict';

  // ----- Config -----
  // Google Business Profile review / share link for the clinic.
  const GOOGLE_BUSINESS_URL = 'https://share.google/Mz3Ftz0gaHrXleFBS';

  const STORAGE_KEY = 'mmc-lang';
  const SUPPORTED = ['en', 'kn'];
  const DEFAULT_LANG = 'en';

  const T = window.MMC_TRANSLATIONS || {};

  // ----- Helpers -----

  function getNested(obj, path) {
    return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
  }

  function getInitialLang() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;
    const browser = (navigator.language || '').slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(browser)) return browser;
    return DEFAULT_LANG;
  }

  // ----- i18n: apply translations -----

  function applyTranslations(lang) {
    const dict = T[lang];
    if (!dict) return;

    document.documentElement.lang = lang;

    // Page title + meta description
    const title = getNested(dict, 'meta.title');
    if (title) document.title = title;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      const desc = getNested(dict, 'meta.description');
      if (desc) metaDesc.setAttribute('content', desc);
    }

    // Plain text nodes (data-i18n)
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const value = getNested(dict, key);
      if (typeof value === 'string') {
        el.textContent = value;
      }
    });

    // List rendering (data-i18n-list)
    document.querySelectorAll('[data-i18n-list]').forEach((el) => {
      const key = el.getAttribute('data-i18n-list');
      const items = getNested(dict, key);
      if (!Array.isArray(items)) return;
      el.innerHTML = '';
      items.forEach((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        el.appendChild(li);
      });
    });

    // Toggle button label shows the OTHER language name
    const toggleLabel = document.querySelector('.lang-toggle-label');
    if (toggleLabel) {
      const otherLang = lang === 'en' ? 'kn' : 'en';
      const otherName = getNested(T[otherLang], 'a11y.langName') || (otherLang === 'kn' ? 'ಕನ್ನಡ' : 'EN');
      toggleLabel.textContent = otherName;
    }

    const toggleBtn = document.getElementById('lang-toggle');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-label', getNested(dict, 'a11y.switchLang') || 'Switch language');
    }
  }

  function setLang(lang) {
    if (!SUPPORTED.includes(lang)) return;
    localStorage.setItem(STORAGE_KEY, lang);
    applyTranslations(lang);
  }

  // ----- Mobile menu -----

  function setupMenu() {
    const header = document.querySelector('.site-header');
    const btn = document.getElementById('menu-toggle');
    if (!header || !btn) return;

    btn.addEventListener('click', () => {
      const open = header.classList.toggle('menu-open');
      btn.setAttribute('aria-expanded', String(open));
    });

    // Close menu when a nav link is clicked
    header.querySelectorAll('.nav a').forEach((a) => {
      a.addEventListener('click', () => {
        header.classList.remove('menu-open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ----- Google Business URL wiring -----

  function wireGoogleBusiness() {
    if (!GOOGLE_BUSINESS_URL) return;
    document.querySelectorAll('[data-google-review], [data-google-maps]').forEach((link) => {
      link.href = GOOGLE_BUSINESS_URL;
    });
  }

  // ----- Init -----

  document.addEventListener('DOMContentLoaded', () => {
    const initial = getInitialLang();
    applyTranslations(initial);

    const toggle = document.getElementById('lang-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const current = document.documentElement.lang || DEFAULT_LANG;
        setLang(current === 'en' ? 'kn' : 'en');
      });
    }

    setupMenu();
    wireGoogleBusiness();
    setupScrollReveal();
    setupLightbox();
    setupVisitorCount();
  });

  // ----- Visitor counter (server-side count via Abacus, free & no-auth) -----

  function setupVisitorCount() {
    const el = document.getElementById('visitor-count');
    if (!el) return;

    const BASE = 'https://abacus.jasoncameron.dev';
    const NS = 'mmc-bridgr-co-in';
    const KEY = 'visits-live';
    // Count each browser session once; plain reads on subsequent page views.
    const alreadyCounted = sessionStorage.getItem('mmc-visit-counted') === '1';
    const url = `${BASE}/${alreadyCounted ? 'get' : 'hit'}/${NS}/${KEY}`;

    fetch(url)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        const n = data && typeof data.value === 'number' ? data.value : null;
        if (n === null) return Promise.reject('no value');
        sessionStorage.setItem('mmc-visit-counted', '1');
        animateCount(el, n);
      })
      .catch(() => {
        // If the counter can't be reached, hide the band rather than show a broken dash.
        const section = el.closest('.visitor-count');
        if (section) section.style.display = 'none';
      });
  }

  function animateCount(el, target) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || target <= 0) {
      el.textContent = target.toLocaleString('en-IN');
      return;
    }
    const duration = 1200;
    const start = performance.now();
    function frame(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(target * eased).toLocaleString('en-IN');
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = target.toLocaleString('en-IN');
    }
    requestAnimationFrame(frame);
  }

  // ----- Lightbox: click any gallery / featured image to view full size -----

  function setupLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    const img = lightbox.querySelector('.lightbox-img');
    const cap = lightbox.querySelector('.lightbox-cap');
    const closeBtn = lightbox.querySelector('.lightbox-close');

    function open(src, alt, caption) {
      img.src = src;
      img.alt = alt || '';
      cap.textContent = caption || alt || '';
      lightbox.classList.add('is-open');
      document.body.classList.add('lightbox-open');
      // Focus close button so Esc and tab work naturally
      closeBtn.focus({ preventScroll: true });
    }

    function close() {
      lightbox.classList.remove('is-open');
      document.body.classList.remove('lightbox-open');
      // Clear after fade so the next open animates fresh
      setTimeout(() => {
        if (!lightbox.classList.contains('is-open')) {
          img.src = '';
          cap.textContent = '';
        }
      }, 300);
    }

    function bindClickable(el) {
      el.addEventListener('click', () => {
        if (!el.src || el.naturalWidth === 0) return;  // skip placeholders
        const figure = el.closest('figure');
        const caption = figure ? (figure.querySelector('figcaption')?.textContent || '') : '';
        open(el.src, el.alt, caption);
      });
    }

    document.querySelectorAll('.gallery-item img, .featured-photo img').forEach(bindClickable);

    closeBtn.addEventListener('click', close);
    lightbox.addEventListener('click', (e) => {
      // Click on backdrop or stage (but not the image itself) closes
      if (e.target === lightbox || e.target.classList.contains('lightbox-stage')) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('is-open')) close();
    });
  }

  // ----- Scroll-reveal animations (IntersectionObserver) -----

  function setupScrollReveal() {
    if (!('IntersectionObserver' in window)) {
      // Older browsers: just show everything
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  }
})();
