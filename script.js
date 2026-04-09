/* ============================================================
   RETELL VISUAL — script.js
   Hero slider · scroll animations · mobile menu
   language toggle · theme toggle · tab filters
   ============================================================ */

(function () {
  'use strict';

  /* ── THEME ──────────────────────────────────────────────── */
  var html        = document.documentElement;
  var themeBtn    = document.getElementById('theme-toggle');
  var savedTheme  = localStorage.getItem('retell-theme') ||
                    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  function applyTheme(t) {
    html.setAttribute('data-theme', t);
    localStorage.setItem('retell-theme', t);
  }
  applyTheme(savedTheme);

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  /* ── LANGUAGE ───────────────────────────────────────────── */
  var langBtn   = document.getElementById('lang-toggle');
  var langLabel = langBtn ? langBtn.querySelector('.lang-label') : null;
  var currentLang = localStorage.getItem('retell-lang') || 'tr';

  function applyLang(lang) {
    currentLang = lang;
    html.setAttribute('lang', lang);
    localStorage.setItem('retell-lang', lang);
    if (langLabel) langLabel.textContent = lang === 'tr' ? 'EN' : 'TR';

    /* Translate every element that carries data-tr / data-en */
    document.querySelectorAll('[data-tr]').forEach(function (el) {
      var val = el.getAttribute('data-' + lang);
      if (!val) return;
      /* Use innerHTML so <br> tags in hero titles render correctly */
      if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3' ||
          el.tagName === 'BLOCKQUOTE') {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    });

    /* Input placeholder */
    var nlInput = document.getElementById('nl-email');
    if (nlInput) {
      nlInput.placeholder = lang === 'tr' ? 'E-posta adresiniz' : 'Your email address';
    }

    /* Notify article.js of language change */
    document.dispatchEvent(new CustomEvent('retell:langchange', { detail: { lang: lang } }));
  }

  applyLang(currentLang);

  if (langBtn) {
    langBtn.addEventListener('click', function () {
      applyLang(currentLang === 'tr' ? 'en' : 'tr');
    });
  }

  /* ── MOBILE MENU ────────────────────────────────────────── */
  var menuBtn   = document.getElementById('menu-toggle');
  var mobileNav = document.getElementById('mobile-nav');

  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', function () {
      var open = mobileNav.classList.toggle('open');
      menuBtn.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      mobileNav.setAttribute('aria-hidden', open ? 'false' : 'true');
    });

    /* Close on link click */
    mobileNav.querySelectorAll('.mobile-link').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileNav.classList.remove('open');
        menuBtn.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
        mobileNav.setAttribute('aria-hidden', 'true');
      });
    });
  }

  /* ── HEADER SCROLL SHADOW ───────────────────────────────── */
  var siteHeader = document.getElementById('site-header');
  if (siteHeader) {
    window.addEventListener('scroll', function () {
      siteHeader.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  /* ── ACTIVE NAV HIGHLIGHT ON SCROLL ────────────────────── */
  var sections  = document.querySelectorAll('[id]');
  var navLinks  = document.querySelectorAll('.nav-link[data-section]');

  if (navLinks.length && sections.length) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          navLinks.forEach(function (link) {
            link.classList.toggle(
              'active',
              link.getAttribute('data-section') === entry.target.id
            );
          });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });

    sections.forEach(function (s) {
      if (document.querySelector('.nav-link[data-section="' + s.id + '"]')) {
        navObserver.observe(s);
      }
    });
  }

  /* ── HERO SLIDER ────────────────────────────────────────── */
  var track       = document.getElementById('hero-track');
  var prevBtn     = document.getElementById('hero-prev');
  var nextBtn     = document.getElementById('hero-next');
  var dotsWrap    = document.getElementById('hero-dots');
  var progressBar = document.getElementById('hero-progress-bar');

  if (track) {
    var slides    = track.querySelectorAll('.hero-slide');
    var total     = slides.length;
    var current   = 0;
    var autoTimer = null;
    var AUTO_MS   = 5000;

    function goTo(index) {
      /* Wrap */
      if (index < 0)     index = total - 1;
      if (index >= total) index = 0;

      slides[current].classList.remove('active');
      current = index;
      slides[current].classList.add('active');

      track.style.transform = 'translateX(-' + (current * 100) + '%)';

      /* Dots */
      if (dotsWrap) {
        dotsWrap.querySelectorAll('.dot').forEach(function (d, i) {
          d.classList.toggle('active', i === current);
          d.setAttribute('aria-selected', i === current ? 'true' : 'false');
        });
      }

      /* Progress bar restart */
      if (progressBar) {
        progressBar.classList.remove('running');
        void progressBar.offsetWidth; /* reflow to reset animation */
        progressBar.classList.add('running');
      }
    }

    function startAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(function () { goTo(current + 1); }, AUTO_MS);
    }

    function pauseAuto() { clearInterval(autoTimer); }

    /* Init */
    slides[0].classList.add('active');
    if (progressBar) progressBar.classList.add('running');
    startAuto();

    /* Arrow clicks */
    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current - 1); startAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current + 1); startAuto(); });

    /* Dot clicks */
    if (dotsWrap) {
      dotsWrap.querySelectorAll('.dot').forEach(function (dot, i) {
        dot.addEventListener('click', function () { goTo(i); startAuto(); });
      });
    }

    /* Pause on hover */
    track.addEventListener('mouseenter', pauseAuto);
    track.addEventListener('mouseleave', startAuto);

    /* Touch / swipe */
    var touchStartX = 0;
    track.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });
    track.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) {
        goTo(dx < 0 ? current + 1 : current - 1);
        startAuto();
      }
    }, { passive: true });

    /* Keyboard nav when hero is in viewport */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft')  { goTo(current - 1); startAuto(); }
      if (e.key === 'ArrowRight') { goTo(current + 1); startAuto(); }
    });
  }

  /* ── SCROLL ANIMATIONS (IntersectionObserver) ───────────── */
  var animateEls = document.querySelectorAll('[data-animate]');
  if (animateEls.length && 'IntersectionObserver' in window) {
    var scrollObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          scrollObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    animateEls.forEach(function (el) { scrollObserver.observe(el); });
  } else {
    /* Fallback — just show everything */
    animateEls.forEach(function (el) { el.classList.add('in-view'); });
  }

  /* ── TAB FILTERS (category sections) ────────────────────── */
  document.querySelectorAll('.tab-group').forEach(function (group) {
    var section = group.closest('.section-category');
    if (!section) return;
    var cards = section.querySelectorAll('.card-article[data-category]');

    group.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        group.querySelectorAll('.tab').forEach(function (t) {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        var filter = tab.getAttribute('data-filter');
        cards.forEach(function (card) {
          var show = filter === 'all' || card.getAttribute('data-category') === filter;
          card.style.display = show ? '' : 'none';
        });
      });
    });
  });

  /* ── NEWSLETTER FORM ─────────────────────────────────────── */
  var nlForm = document.querySelector('.newsletter-form');
  if (nlForm) {
    nlForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = nlForm.querySelector('.nl-input');
      var btn   = nlForm.querySelector('.nl-btn');
      if (!input || !input.value.includes('@')) {
        input.focus();
        return;
      }
      var orig = btn.textContent;
      btn.textContent = currentLang === 'tr' ? 'Kaydedildi ✓' : 'Subscribed ✓';
      btn.disabled = true;
      input.value = '';
      setTimeout(function () {
        btn.textContent = orig;
        btn.disabled = false;
      }, 3000);
    });
  }

})();
