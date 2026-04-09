/* ============================================================
   RETELL VISUAL — article.js
   Reading progress · estimated reading time · font size
   focus mode · article carousel · TOC active highlight
   copy link · share
   ============================================================ */

(function () {
  'use strict';

  /* ── ESTIMATED READING TIME ───────────────────────────────── */
  var articleBody = document.getElementById('article-content');
  var rtBadge     = document.getElementById('reading-time-text');
  var WORDS_PM    = 200; // average reading speed

  if (articleBody && rtBadge) {
    var text     = articleBody.innerText || articleBody.textContent || '';
    var words    = text.trim().split(/\s+/).length;
    var minutes  = Math.max(1, Math.ceil(words / WORDS_PM));
    var lang     = document.documentElement.getAttribute('lang') || 'tr';
    rtBadge.textContent = lang === 'tr'
      ? minutes + ' dk okuma'
      : minutes + ' min read';

    /* Update when language changes */
    document.addEventListener('retell:langchange', function (e) {
      rtBadge.textContent = e.detail.lang === 'tr'
        ? minutes + ' dk okuma'
        : minutes + ' min read';
    });
  }

  /* ── READING PROGRESS BAR ─────────────────────────────────── */
  var progressBar   = document.getElementById('reading-progress');
  var readingStatus = document.getElementById('reading-status');

  if (progressBar && articleBody) {
    window.addEventListener('scroll', updateProgress, { passive: true });
  }

  function updateProgress() {
    var rect   = articleBody.getBoundingClientRect();
    var total  = articleBody.offsetHeight;
    var scrolled = -rect.top;
    var pct    = Math.min(100, Math.max(0, (scrolled / total) * 100));

    progressBar.style.width = pct + '%';
    progressBar.setAttribute('aria-valuenow', Math.round(pct));

    if (readingStatus) {
      var lang = document.documentElement.getAttribute('lang') || 'tr';
      if (pct < 1) {
        readingStatus.textContent = lang === 'tr' ? 'Okumaya başlayın' : 'Start reading';
      } else if (pct < 100) {
        readingStatus.textContent = lang === 'tr'
          ? '%' + Math.round(pct) + ' okundu'
          : Math.round(pct) + '% read';
      } else {
        readingStatus.textContent = lang === 'tr' ? 'Tamamlandı ✓' : 'Finished ✓';
      }
    }
  }

  /* ── FONT SIZE CONTROLS ───────────────────────────────────── */
  var fontLevels  = ['font-sm', '', 'font-lg', 'font-xl'];
  var fontIndex   = parseInt(localStorage.getItem('retell-font-idx') || '1', 10);
  var decBtn      = document.getElementById('font-decrease');
  var resetBtn    = document.getElementById('font-reset');
  var incBtn      = document.getElementById('font-increase');

  function applyFontSize(idx) {
    fontIndex = Math.min(Math.max(0, idx), fontLevels.length - 1);
    localStorage.setItem('retell-font-idx', fontIndex);
    if (!articleBody) return;
    fontLevels.forEach(function (cls) { if (cls) articleBody.classList.remove(cls); });
    if (fontLevels[fontIndex]) articleBody.classList.add(fontLevels[fontIndex]);
    if (decBtn)   decBtn.disabled   = fontIndex === 0;
    if (incBtn)   incBtn.disabled   = fontIndex === fontLevels.length - 1;
    if (resetBtn) resetBtn.classList.toggle('active', fontIndex !== 1);
  }

  applyFontSize(fontIndex);
  if (decBtn)   decBtn.addEventListener('click',  function () { applyFontSize(fontIndex - 1); });
  if (resetBtn) resetBtn.addEventListener('click', function () { applyFontSize(1); });
  if (incBtn)   incBtn.addEventListener('click',  function () { applyFontSize(fontIndex + 1); });

  /* ── FOCUS / READING MODE ─────────────────────────────────── */
  var focusBtn = document.getElementById('focus-mode');
  if (focusBtn) {
    var focusOn = localStorage.getItem('retell-focus') === '1';
    applyFocus(focusOn);

    focusBtn.addEventListener('click', function () {
      focusOn = !focusOn;
      localStorage.setItem('retell-focus', focusOn ? '1' : '0');
      applyFocus(focusOn);
    });
  }
  function applyFocus(on) {
    document.body.classList.toggle('focus-mode', on);
    if (focusBtn) focusBtn.classList.toggle('active', on);
  }

  /* ── ARTICLE CAROUSEL ─────────────────────────────────────── */
  var carousel     = document.getElementById('article-carousel');
  var carPrev      = document.getElementById('carousel-prev');
  var carNext      = document.getElementById('carousel-next');
  var carDotsWrap  = document.getElementById('carousel-dots');

  if (carousel) {
    var carSlides  = carousel.querySelectorAll('.carousel-slide');
    var carTotal   = carSlides.length;
    var carCurrent = 0;

    function carGoTo(idx) {
      if (idx < 0 || idx >= carTotal) return;
      carCurrent = idx;
      carousel.style.transform = 'translateX(-' + (carCurrent * 100) + '%)';

      if (carDotsWrap) {
        carDotsWrap.querySelectorAll('.c-dot').forEach(function (d, i) {
          d.classList.toggle('active', i === carCurrent);
          d.setAttribute('aria-selected', i === carCurrent ? 'true' : 'false');
        });
      }
      if (carPrev) carPrev.disabled = carCurrent === 0;
      if (carNext) carNext.disabled = carCurrent === carTotal - 1;
    }

    carGoTo(0);

    if (carPrev) carPrev.addEventListener('click', function () { carGoTo(carCurrent - 1); });
    if (carNext) carNext.addEventListener('click', function () { carGoTo(carCurrent + 1); });

    if (carDotsWrap) {
      carDotsWrap.querySelectorAll('.c-dot').forEach(function (dot, i) {
        dot.addEventListener('click', function () { carGoTo(i); });
      });
    }

    /* Touch swipe */
    var cTouchX = 0;
    carousel.addEventListener('touchstart', function (e) {
      cTouchX = e.changedTouches[0].clientX;
    }, { passive: true });
    carousel.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - cTouchX;
      if (Math.abs(dx) > 40) carGoTo(dx < 0 ? carCurrent + 1 : carCurrent - 1);
    }, { passive: true });
  }

  /* ── TABLE OF CONTENTS ACTIVE LINK ───────────────────────── */
  var tocLinks = document.querySelectorAll('.toc-link');
  if (tocLinks.length) {
    var headings = Array.from(
      document.querySelectorAll('.article-content h2[id], .article-content h3[id]')
    );

    var tocObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          tocLinks.forEach(function (link) {
            link.classList.toggle(
              'active',
              link.getAttribute('href') === '#' + entry.target.id
            );
          });
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });

    headings.forEach(function (h) { tocObserver.observe(h); });
  }

  /* ── COPY LINK ────────────────────────────────────────────── */
  function setupCopyBtn(btnId) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', function () {
      var url = window.location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function () { flashCopied(btn); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        flashCopied(btn);
      }
    });
  }
  function flashCopied(btn) {
    var span = btn.querySelector('span');
    if (!span) return;
    var lang = document.documentElement.getAttribute('lang') || 'tr';
    var orig = span.textContent;
    span.textContent = lang === 'tr' ? 'Kopyalandı ✓' : 'Copied ✓';
    setTimeout(function () { span.textContent = orig; }, 2000);
  }
  setupCopyBtn('share-copy');
  setupCopyBtn('share-copy-bottom');

  /* ── LANGUAGE CHANGE EVENT (fired by script.js) ───────────── */
  /* script.js dispatches 'retell:langchange' when language switches */
  /* We listen here to update reading time text */
  /* (event dispatched from script.js override of applyLang) */

})();
