/* ============================================================
   RETELL VISUAL — admin.js
   LocalStorage-based CMS: articles · newsletter · subscribers
   ============================================================ */

(function () {
  'use strict';

  /* ── STORAGE HELPERS ──────────────────────────────────────── */
  var KEYS = { articles: 'rv_articles', subs: 'rv_subs', newsletters: 'rv_newsletters', settings: 'rv_settings' };

  function load(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; }
  }
  function loadObj(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; }
  }
  function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

  /* ── STATE ────────────────────────────────────────────────── */
  var articles    = load(KEYS.articles);
  var subs        = load(KEYS.subs);
  var newsletters = load(KEYS.newsletters);
  var settings    = loadObj(KEYS.settings);
  var tags        = [];           // current article's tags
  var editingId   = null;

  /* ── THEME ────────────────────────────────────────────────── */
  var html       = document.documentElement;
  var themeBtn   = document.getElementById('theme-toggle');
  var themeLabel = themeBtn ? themeBtn.querySelector('.theme-label') : null;
  var saved      = localStorage.getItem('retell-theme') ||
                   (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  function applyTheme(t) {
    html.setAttribute('data-theme', t);
    localStorage.setItem('retell-theme', t);
    if (themeLabel) themeLabel.textContent = t === 'dark' ? 'Açık Mod' : 'Koyu Mod';
  }
  applyTheme(saved);
  if (themeBtn) themeBtn.addEventListener('click', function () {
    applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  /* ── ROUTER / VIEW SWITCHER ───────────────────────────────── */
  var views     = document.querySelectorAll('.view');
  var navItems  = document.querySelectorAll('.nav-item');
  var topbarTitle = document.getElementById('topbar-title');
  var titles    = { dashboard: 'Dashboard', articles: 'Yazılar', 'new-article': 'Yeni Yazı', newsletter: 'Bülten Gönder', subscribers: 'Aboneler', settings: 'Ayarlar' };

  function showView(name) {
    views.forEach(function (v) { v.classList.remove('active'); });
    navItems.forEach(function (n) { n.classList.remove('active'); });
    var v = document.getElementById('view-' + name);
    if (v) v.classList.add('active');
    document.querySelectorAll('[data-view="' + name + '"]').forEach(function (el) {
      if (el.classList.contains('nav-item')) el.classList.add('active');
    });
    if (topbarTitle) topbarTitle.textContent = titles[name] || name;
    if (name === 'dashboard')    renderDashboard();
    if (name === 'articles')     renderArticleList();
    if (name === 'new-article')  resetEditor();
    if (name === 'newsletter')   renderNewsletter();
    if (name === 'subscribers')  renderSubscribers();
    if (name === 'settings')     renderSettings();
  }

  /* Delegate clicks on [data-view] */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-view]');
    if (el) { e.preventDefault(); showView(el.getAttribute('data-view')); }
  });

  /* ── SIDEBAR MOBILE ───────────────────────────────────────── */
  var sidebar      = document.getElementById('sidebar');
  var sidebarOpen  = document.getElementById('sidebar-open');
  var sidebarClose = document.getElementById('sidebar-close');
  if (sidebarOpen)  sidebarOpen.addEventListener('click',  function () { sidebar.classList.add('open'); });
  if (sidebarClose) sidebarClose.addEventListener('click', function () { sidebar.classList.remove('open'); });
  document.addEventListener('click', function (e) {
    if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== sidebarOpen) {
      sidebar.classList.remove('open');
    }
  });

  /* ── TOAST ────────────────────────────────────────────────── */
  var toastContainer = document.getElementById('toast-container');
  function toast(msg, type) {
    type = type || 'success';
    var el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    toastContainer.appendChild(el);
    setTimeout(function () {
      el.classList.add('fade-out');
      setTimeout(function () { el.remove(); }, 320);
    }, 3000);
  }

  /* ── CONFIRM MODAL ────────────────────────────────────────── */
  var modal        = document.getElementById('confirm-modal');
  var modalMsg     = document.getElementById('modal-message');
  var modalCancel  = document.getElementById('modal-cancel');
  var modalConfirm = document.getElementById('modal-confirm');
  var confirmCb    = null;
  function confirm(msg, cb) {
    modalMsg.textContent = msg;
    confirmCb = cb;
    modal.classList.remove('hidden');
  }
  if (modalCancel)  modalCancel.addEventListener('click',  function () { modal.classList.add('hidden'); });
  if (modalConfirm) modalConfirm.addEventListener('click', function () { modal.classList.add('hidden'); if (confirmCb) confirmCb(); });

  /* ── HELPERS ──────────────────────────────────────────────── */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function slugify(str) { return str.toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
  function formatDate(iso) { if (!iso) return ''; var d = new Date(iso); return d.toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' }); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function updateCounts() {
    var art  = document.getElementById('articles-count');
    var sub  = document.getElementById('subs-count');
    var dash = document.getElementById('dash-articles');
    var ds   = document.getElementById('dash-subs');
    var dnl  = document.getElementById('dash-newsletters');
    var ddr  = document.getElementById('dash-drafts');
    var activeSubs = subs.filter(function (s) { return s.status === 'active'; }).length;
    if (art)  art.textContent  = articles.length;
    if (sub)  sub.textContent  = activeSubs;
    if (dash) dash.textContent = articles.length;
    if (ds)   ds.textContent   = activeSubs;
    if (dnl)  dnl.textContent  = newsletters.length;
    if (ddr)  ddr.textContent  = articles.filter(function (a) { return a.status === 'draft'; }).length;
    var nlSubCount = document.getElementById('nl-sub-count');
    if (nlSubCount) nlSubCount.textContent = activeSubs + ' abone';
  }

  /* ── CATEGORY SUBCATEGORIES ───────────────────────────────── */
  var subCats = {
    saha:       ['Araştırma', 'Dosya', 'Odak'],
    cografya:   ['Hafıza', 'Göç', 'Portre', 'Şehir'],
    kultur:     ['Sinema', 'Kitap', 'Müzik'],
    multimedya: ['Video', 'Podcast', 'Fotoğraf']
  };
  var catSel    = document.getElementById('art-category');
  var subCatSel = document.getElementById('art-subcategory');
  if (catSel) {
    catSel.addEventListener('change', function () {
      var opts = subCats[catSel.value] || [];
      subCatSel.innerHTML = '<option value="">Seçin...</option>';
      opts.forEach(function (o) {
        var opt = document.createElement('option');
        opt.value = o.toLowerCase(); opt.textContent = o;
        subCatSel.appendChild(opt);
      });
    });
  }

  /* ── TAG INPUT ────────────────────────────────────────────── */
  var tagWrap  = document.getElementById('tag-input-wrap');
  var tagInput = document.getElementById('tag-input');

  function renderTags() {
    if (!tagWrap) return;
    tagWrap.querySelectorAll('.tag-chip').forEach(function (c) { c.remove(); });
    tags.forEach(function (tag, i) {
      var chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = tag + '<button class="tag-chip-remove" data-i="' + i + '" aria-label="Etiketi kaldır">✕</button>';
      tagWrap.insertBefore(chip, tagInput);
    });
  }
  if (tagInput) {
    tagInput.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ',') && tagInput.value.trim()) {
        e.preventDefault();
        var val = tagInput.value.trim().replace(/,/g,'');
        if (val && !tags.includes(val)) { tags.push(val); renderTags(); }
        tagInput.value = '';
      }
      if (e.key === 'Backspace' && !tagInput.value && tags.length) {
        tags.pop(); renderTags();
      }
    });
  }
  if (tagWrap) {
    tagWrap.addEventListener('click', function (e) {
      var btn = e.target.closest('.tag-chip-remove');
      if (btn) { tags.splice(parseInt(btn.dataset.i), 1); renderTags(); }
      tagInput && tagInput.focus();
    });
  }

  /* ── AUTO-SLUG ────────────────────────────────────────────── */
  var artTitle = document.getElementById('art-title');
  var artSlug  = document.getElementById('art-slug');
  if (artTitle && artSlug) {
    artTitle.addEventListener('input', function () {
      if (!editingId) artSlug.value = slugify(artTitle.value);
    });
  }

  /* ── STATUS BADGE SYNC ────────────────────────────────────── */
  var artStatus  = document.getElementById('art-status');
  var statusBadge = document.getElementById('status-badge');
  if (artStatus && statusBadge) {
    artStatus.addEventListener('change', function () {
      statusBadge.textContent = artStatus.value === 'published' ? 'Yayında' : 'Taslak';
      statusBadge.className   = 'status-badge ' + artStatus.value;
    });
  }

  /* ── IMAGE UPLOAD ─────────────────────────────────────────── */
  var imageUrl      = document.getElementById('art-image-url');
  var imageFile     = document.getElementById('art-image-file');
  var previewWrap   = document.getElementById('image-preview-wrap');
  var previewImg    = document.getElementById('image-preview-img');
  var placeholder   = document.getElementById('image-placeholder');
  var removeBtn     = document.getElementById('image-remove');
  var dropZone      = document.getElementById('image-drop-zone');

  function showPreview(src) {
    if (!src) { clearPreview(); return; }
    if (previewWrap) previewWrap.classList.remove('hidden');
    if (placeholder) placeholder.classList.add('hidden');
    if (previewImg)  previewImg.src = src;
  }
  function clearPreview() {
    if (previewWrap) previewWrap.classList.add('hidden');
    if (placeholder) placeholder.classList.remove('hidden');
    if (previewImg)  previewImg.src = '';
    if (imageUrl)    imageUrl.value = '';
  }
  if (imageUrl) {
    imageUrl.addEventListener('input', function () { showPreview(imageUrl.value); });
  }
  if (imageFile) {
    imageFile.addEventListener('change', function () {
      var file = imageFile.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) { showPreview(e.target.result); if (imageUrl) imageUrl.value = ''; };
      reader.readAsDataURL(file);
    });
  }
  if (removeBtn) removeBtn.addEventListener('click', clearPreview);
  if (dropZone) {
    dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('drag-over'); });
    dropZone.addEventListener('drop', function (e) {
      e.preventDefault(); dropZone.classList.remove('drag-over');
      var file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        var reader = new FileReader();
        reader.onload = function (ev) { showPreview(ev.target.result); };
        reader.readAsDataURL(file);
      }
    });
  }

  /* ── RICH TEXT EDITOR ─────────────────────────────────────── */
  var editorTools = document.querySelectorAll('.editor-tool');
  var contentArea = document.getElementById('art-content');

  editorTools.forEach(function (btn) {
    btn.addEventListener('mousedown', function (e) {
      e.preventDefault();
      var cmd = btn.dataset.cmd;
      if (cmd === 'h2' || cmd === 'h3') {
        document.execCommand('formatBlock', false, '<' + cmd + '>');
      } else if (cmd === 'blockquote') {
        document.execCommand('formatBlock', false, '<blockquote>');
      } else if (cmd === 'link') {
        var url = window.prompt('URL girin:');
        if (url) document.execCommand('createLink', false, url);
      } else {
        document.execCommand(cmd, false, null);
      }
      if (contentArea) contentArea.focus();
    });
  });

  /* ── ARTICLE CRUD ─────────────────────────────────────────── */
  function resetEditor() {
    editingId = null;
    tags = [];
    var fields = ['art-title','art-subtitle','art-image-url','art-author','art-author-role','art-author-img','art-slug','art-readtime'];
    fields.forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
    if (contentArea) contentArea.innerHTML = '';
    if (artStatus)   artStatus.value = 'draft';
    if (catSel)      { catSel.value = ''; }
    if (subCatSel)   subCatSel.innerHTML = '<option value="">Seçin...</option>';
    var artDate = document.getElementById('art-date');
    if (artDate) artDate.value = today();
    var artLang = document.getElementById('art-lang'); if (artLang) artLang.value = 'tr';
    if (statusBadge) { statusBadge.textContent = 'Taslak'; statusBadge.className = 'status-badge draft'; }
    clearPreview();
    renderTags();
    var delBtn = document.getElementById('delete-btn'); if (delBtn) delBtn.classList.add('hidden');
    var editId = document.getElementById('edit-article-id'); if (editId) editId.value = '';
    if (topbarTitle) topbarTitle.textContent = 'Yeni Yazı';
  }

  function getArticleFormData() {
    var imgSrc = (previewImg && previewImg.src && !previewImg.src.endsWith('/admin/')) ? previewImg.src : (imageUrl ? imageUrl.value : '');
    return {
      id:         editingId || uid(),
      title:      (document.getElementById('art-title')       || {}).value || '',
      subtitle:   (document.getElementById('art-subtitle')    || {}).value || '',
      image:      imgSrc,
      content:    contentArea ? contentArea.innerHTML : '',
      author:     (document.getElementById('art-author')      || {}).value || '',
      authorRole: (document.getElementById('art-author-role') || {}).value || '',
      authorImg:  (document.getElementById('art-author-img')  || {}).value || '',
      category:   catSel ? catSel.value : '',
      subcategory: subCatSel ? subCatSel.value : '',
      tags:       tags.slice(),
      status:     artStatus ? artStatus.value : 'draft',
      date:       (document.getElementById('art-date') || {}).value || today(),
      slug:       (document.getElementById('art-slug') || {}).value || '',
      lang:       (document.getElementById('art-lang') || {}).value || 'tr',
      readtime:   (document.getElementById('art-readtime') || {}).value || '',
      updatedAt:  new Date().toISOString()
    };
  }

  function saveArticle(status) {
    var data = getArticleFormData();
    if (!data.title.trim()) { toast('Başlık zorunlu!', 'error'); return; }
    if (!data.author.trim()) { toast('Yazar adı zorunlu!', 'error'); return; }
    if (status) data.status = status;
    if (!data.slug) data.slug = slugify(data.title);

    var idx = articles.findIndex(function (a) { return a.id === data.id; });
    if (idx >= 0) { articles[idx] = data; } else { articles.unshift(data); }
    save(KEYS.articles, articles);
    updateCounts();
    toast(data.status === 'published' ? 'Yazı yayınlandı! ✓' : 'Taslak kaydedildi ✓', 'success');
    editingId = data.id;
    var delBtn = document.getElementById('delete-btn'); if (delBtn) delBtn.classList.remove('hidden');
    var editId = document.getElementById('edit-article-id'); if (editId) editId.value = data.id;
  }

  function editArticle(id) {
    var art = articles.find(function (a) { return a.id === id; });
    if (!art) return;
    editingId = id;
    tags = art.tags ? art.tags.slice() : [];

    var set = function (elId, val) { var el = document.getElementById(elId); if (el) el.value = val || ''; };
    set('art-title',       art.title);
    set('art-subtitle',    art.subtitle);
    set('art-author',      art.author);
    set('art-author-role', art.authorRole);
    set('art-author-img',  art.authorImg);
    set('art-slug',        art.slug);
    set('art-readtime',    art.readtime);
    set('art-date',        art.date);
    set('art-image-url',   art.image && !art.image.startsWith('data:') ? art.image : '');
    set('art-lang',        art.lang || 'tr');
    if (artStatus)  artStatus.value  = art.status || 'draft';
    if (catSel)     { catSel.value   = art.category || ''; catSel.dispatchEvent(new Event('change')); }
    setTimeout(function () { if (subCatSel) subCatSel.value = art.subcategory || ''; }, 50);
    if (contentArea) contentArea.innerHTML = art.content || '';
    if (art.image)  showPreview(art.image);
    if (statusBadge) { statusBadge.textContent = art.status === 'published' ? 'Yayında' : 'Taslak'; statusBadge.className = 'status-badge ' + (art.status || 'draft'); }
    renderTags();
    var delBtn = document.getElementById('delete-btn'); if (delBtn) delBtn.classList.remove('hidden');
    var editId = document.getElementById('edit-article-id'); if (editId) editId.value = id;
    if (topbarTitle) topbarTitle.textContent = 'Yazıyı Düzenle';
    showView('new-article');
  }

  function deleteArticle(id) {
    confirm('Bu yazıyı silmek istediğinizden emin misiniz?', function () {
      articles = articles.filter(function (a) { return a.id !== id; });
      save(KEYS.articles, articles);
      updateCounts();
      toast('Yazı silindi', 'info');
      renderArticleList();
      showView('articles');
    });
  }

  var saveDraftBtn = document.getElementById('save-draft-btn');
  var publishBtn   = document.getElementById('publish-btn');
  var deleteBtn    = document.getElementById('delete-btn');
  if (saveDraftBtn) saveDraftBtn.addEventListener('click', function () { saveArticle('draft'); });
  if (publishBtn)   publishBtn.addEventListener('click',   function () { saveArticle('published'); });
  if (deleteBtn)    deleteBtn.addEventListener('click',    function () { deleteArticle(editingId); });

  /* ── RENDER: DASHBOARD ────────────────────────────────────── */
  function renderDashboard() {
    updateCounts();
    var list  = document.getElementById('dash-recent-list');
    var empty = document.getElementById('dash-empty');
    if (!list) return;
    var recent = articles.slice(0, 5);
    if (!recent.length) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    list.innerHTML = recent.map(articleRowHTML).join('');
    bindArticleRowActions(list);
  }

  /* ── RENDER: ARTICLE LIST ─────────────────────────────────── */
  function renderArticleList() {
    var list   = document.getElementById('articles-list');
    var empty  = document.getElementById('articles-empty');
    var search = (document.getElementById('article-search') || {}).value || '';
    var cat    = (document.getElementById('article-filter-cat') || {}).value || '';
    var status = (document.getElementById('article-filter-status') || {}).value || '';
    if (!list) return;

    var filtered = articles.filter(function (a) {
      return (!search || a.title.toLowerCase().includes(search.toLowerCase())) &&
             (!cat    || a.category === cat) &&
             (!status || a.status   === status);
    });

    if (!filtered.length) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    list.innerHTML = filtered.map(articleRowHTML).join('');
    bindArticleRowActions(list);
  }

  function articleRowHTML(art) {
    var img = art.image ? '<img src="' + art.image + '" alt="" class="article-row-thumb">' : '<div class="article-row-thumb"></div>';
    return '<div class="article-row" data-id="' + art.id + '">' +
      img +
      '<div class="article-row-info">' +
        '<div class="article-row-title">' + escHtml(art.title) + '</div>' +
        '<div class="article-row-meta">' +
          '<span>' + (art.author || '—') + '</span>' +
          '<span>' + formatDate(art.date) + '</span>' +
          '<span>' + (art.category || '—') + '</span>' +
        '</div>' +
      '</div>' +
      '<span class="status-badge ' + (art.status || 'draft') + '">' + (art.status === 'published' ? 'Yayında' : 'Taslak') + '</span>' +
      '<div class="article-row-actions">' +
        '<button class="row-action-btn edit-btn" data-id="' + art.id + '">Düzenle</button>' +
        '<button class="row-action-btn danger delete-btn" data-id="' + art.id + '">Sil</button>' +
      '</div>' +
    '</div>';
  }

  function bindArticleRowActions(container) {
    container.querySelectorAll('.edit-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { editArticle(btn.dataset.id); });
    });
    container.querySelectorAll('.delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { deleteArticle(btn.dataset.id); });
    });
  }

  /* Filter listeners */
  ['article-search', 'article-filter-cat', 'article-filter-status'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', renderArticleList);
  });

  /* ── RENDER: NEWSLETTER ───────────────────────────────────── */
  function renderNewsletter() {
    updateCounts();
    /* Populate featured article select */
    var sel = document.getElementById('nl-featured-article');
    if (sel) {
      var published = articles.filter(function (a) { return a.status === 'published'; });
      sel.innerHTML = '<option value="">Yazı seçin (opsiyonel)...</option>';
      published.forEach(function (a) {
        var opt = document.createElement('option');
        opt.value = a.id; opt.textContent = a.title;
        sel.appendChild(opt);
      });
    }
    renderNLHistory();
  }

  function renderNLHistory() {
    var list  = document.getElementById('nl-history-list');
    var empty = document.getElementById('nl-history-empty');
    if (!list) return;
    if (!newsletters.length) { list.innerHTML = ''; if (empty) empty.classList.remove('hidden'); return; }
    if (empty) empty.classList.add('hidden');
    list.innerHTML = newsletters.slice().reverse().slice(0, 8).map(function (nl) {
      return '<div class="nl-history-item"><span class="nl-history-subject">' + escHtml(nl.subject) + '</span><span class="nl-history-meta">' + formatDate(nl.sentAt.slice(0,10)) + ' · ' + nl.recipientCount + ' alıcı</span></div>';
    }).join('');
  }

  /* Template radio sync */
  document.querySelectorAll('.template-card').forEach(function (card) {
    card.querySelector('input').addEventListener('change', function () {
      document.querySelectorAll('.template-card').forEach(function (c) { c.classList.remove('selected'); });
      card.classList.add('selected');
    });
  });

  /* Schedule picker toggle */
  var nlSendTime   = document.getElementById('nl-send-time');
  var schedulePick = document.getElementById('schedule-picker');
  if (nlSendTime) {
    nlSendTime.addEventListener('change', function () {
      if (schedulePick) schedulePick.classList.toggle('hidden', nlSendTime.value !== 'schedule');
    });
  }

  /* Send newsletter */
  var nlSendBtn = document.getElementById('nl-send-btn');
  if (nlSendBtn) {
    nlSendBtn.addEventListener('click', function () {
      var subject = (document.getElementById('nl-subject') || {}).value || '';
      var body    = (document.getElementById('nl-body')    || {}).value || '';
      if (!subject.trim()) { toast('Konu satırı zorunlu!', 'error'); return; }
      if (!body.trim())    { toast('Bülten mesajı zorunlu!', 'error'); return; }
      var activeSubs = subs.filter(function (s) { return s.status === 'active'; });
      confirm(activeSubs.length + ' aboneye bülten gönderilecek. Onaylıyor musunuz?', function () {
        var record = {
          id: uid(), subject: subject, body: body,
          sentAt: new Date().toISOString(),
          recipientCount: activeSubs.length,
          template: document.querySelector('input[name="nl-template"]:checked') ? document.querySelector('input[name="nl-template"]:checked').value : 'weekly'
        };
        newsletters.push(record);
        save(KEYS.newsletters, newsletters);
        updateCounts();
        renderNLHistory();
        toast('Bülten gönderildi! (' + activeSubs.length + ' abone) ✓', 'success');
        /* Reset form */
        ['nl-subject','nl-preheader','nl-body'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
      });
    });
  }

  /* Preview */
  var nlPreviewBtn   = document.getElementById('nl-preview-btn');
  var nlPreviewWrap  = document.getElementById('nl-preview-wrap');
  var nlPreviewBody  = document.getElementById('nl-preview-body');
  var nlPreviewClose = document.getElementById('nl-preview-close');

  if (nlPreviewBtn) {
    nlPreviewBtn.addEventListener('click', function () {
      var subject    = (document.getElementById('nl-subject')   || {}).value || '(Konu yok)';
      var preheader  = (document.getElementById('nl-preheader') || {}).value || '';
      var body       = (document.getElementById('nl-body')      || {}).value || '';
      var cta        = (document.getElementById('nl-cta')       || {}).value || 'Devamını Oku →';
      var featId     = (document.getElementById('nl-featured-article') || {}).value || '';
      var featArt    = featId ? articles.find(function (a) { return a.id === featId; }) : null;

      if (nlPreviewBody) {
        nlPreviewBody.innerHTML =
          '<div class="nl-preview-header"><div class="nl-preview-logo">retell <strong>visual</strong></div>' +
          (preheader ? '<p style="font-size:0.78rem;opacity:0.6;margin-top:6px">' + escHtml(preheader) + '</p>' : '') + '</div>' +
          '<h2>' + escHtml(subject) + '</h2>' +
          (featArt ? '<div style="background:#f5f5f4;border-radius:8px;padding:16px;margin-bottom:20px"><strong style="font-size:0.7rem;text-transform:uppercase;color:#999;letter-spacing:.08em">Öne Çıkan</strong><p style="font-size:1rem;font-weight:700;margin-top:6px">' + escHtml(featArt.title) + '</p></div>' : '') +
          '<p>' + body.replace(/\n/g, '</p><p>') + '</p>' +
          '<a class="nl-preview-cta-btn" href="#">' + escHtml(cta) + '</a>' +
          '<div class="nl-preview-footer">Retell Visual bültenine abone oldunuz. <a href="#">Abonelikten çık</a></div>';
      }
      if (nlPreviewWrap) nlPreviewWrap.classList.remove('hidden');
    });
  }
  if (nlPreviewClose) nlPreviewClose.addEventListener('click', function () { if (nlPreviewWrap) nlPreviewWrap.classList.add('hidden'); });

  /* ── SUBSCRIBERS ──────────────────────────────────────────── */
  function renderSubscribers() {
    updateCounts();
    var tbody = document.getElementById('subscribers-tbody');
    var empty = document.getElementById('subs-empty');
    var search = (document.getElementById('sub-search')  || {}).value || '';
    var filter = (document.getElementById('sub-filter')  || {}).value || '';
    if (!tbody) return;

    var filtered = subs.filter(function (s) {
      return (!search || s.email.includes(search) || (s.name || '').toLowerCase().includes(search.toLowerCase())) &&
             (!filter || s.status === filter);
    });

    if (!filtered.length) { tbody.innerHTML = ''; if (empty) empty.classList.remove('hidden'); return; }
    if (empty) empty.classList.add('hidden');

    tbody.innerHTML = filtered.map(function (s) {
      return '<tr>' +
        '<td><input type="checkbox" class="sub-check" data-id="' + s.id + '" aria-label="Seç"></td>' +
        '<td>' + escHtml(s.email) + '</td>' +
        '<td>' + escHtml(s.name || '—') + '</td>' +
        '<td>' + formatDate(s.createdAt ? s.createdAt.slice(0,10) : '') + '</td>' +
        '<td><span class="sub-status ' + (s.status || 'active') + '">' + (s.status === 'unsubscribed' ? 'Çıkmış' : 'Aktif') + '</span></td>' +
        '<td><button class="row-action-btn danger remove-sub-btn" data-id="' + s.id + '">Sil</button></td>' +
      '</tr>';
    }).join('');

    tbody.querySelectorAll('.remove-sub-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        confirm('Bu aboneyi silmek istediğinizden emin misiniz?', function () {
          subs = subs.filter(function (s) { return s.id !== btn.dataset.id; });
          save(KEYS.subs, subs);
          updateCounts();
          renderSubscribers();
          toast('Abone silindi', 'info');
        });
      });
    });
  }

  /* Add subscriber */
  var addSubBtn     = document.getElementById('add-sub-btn');
  var addSubForm    = document.getElementById('add-sub-form');
  var confirmSubBtn = document.getElementById('confirm-sub-btn');
  var cancelSubBtn  = document.getElementById('cancel-sub-btn');
  if (addSubBtn)  addSubBtn.addEventListener('click', function () { if (addSubForm) addSubForm.classList.toggle('hidden'); });
  if (cancelSubBtn) cancelSubBtn.addEventListener('click', function () { if (addSubForm) addSubForm.classList.add('hidden'); });
  if (confirmSubBtn) {
    confirmSubBtn.addEventListener('click', function () {
      var emailEl = document.getElementById('new-sub-email');
      var nameEl  = document.getElementById('new-sub-name');
      var email   = emailEl ? emailEl.value.trim() : '';
      if (!email || !email.includes('@')) { toast('Geçerli bir e-posta girin', 'error'); return; }
      if (subs.find(function (s) { return s.email === email; })) { toast('Bu e-posta zaten kayıtlı', 'error'); return; }
      subs.push({ id: uid(), email: email, name: nameEl ? nameEl.value.trim() : '', status: 'active', createdAt: new Date().toISOString() });
      save(KEYS.subs, subs);
      updateCounts();
      renderSubscribers();
      if (emailEl) emailEl.value = '';
      if (nameEl)  nameEl.value  = '';
      if (addSubForm) addSubForm.classList.add('hidden');
      toast('Abone eklendi ✓', 'success');
    });
  }

  /* Filter */
  ['sub-search','sub-filter'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', renderSubscribers);
  });

  /* Select all */
  var selectAll = document.getElementById('select-all-subs');
  if (selectAll) {
    selectAll.addEventListener('change', function () {
      document.querySelectorAll('.sub-check').forEach(function (cb) { cb.checked = selectAll.checked; });
    });
  }

  /* CSV export */
  var exportSubsBtn = document.getElementById('export-subs-btn');
  if (exportSubsBtn) {
    exportSubsBtn.addEventListener('click', function () {
      var rows = ['E-posta,İsim,Durum,Kayıt Tarihi'].concat(subs.map(function (s) {
        return [s.email, s.name || '', s.status, s.createdAt ? s.createdAt.slice(0,10) : ''].join(',');
      }));
      downloadFile('retell-aboneler.csv', rows.join('\n'), 'text/csv');
      toast('CSV indirildi ✓', 'success');
    });
  }

  /* ── SETTINGS ─────────────────────────────────────────────── */
  function renderSettings() {
    var map = { 'set-sitename': 'siteName', 'set-tagline': 'tagline', 'set-email': 'email', 'set-instagram': 'instagram', 'set-twitter': 'twitter', 'set-youtube': 'youtube', 'set-linkedin': 'linkedin' };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el && settings[map[id]]) el.value = settings[map[id]];
    });
  }
  var saveSettingsBtn = document.getElementById('save-settings-btn');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', function () {
      var map = { 'set-sitename': 'siteName', 'set-tagline': 'tagline', 'set-email': 'email', 'set-instagram': 'instagram', 'set-twitter': 'twitter', 'set-youtube': 'youtube', 'set-linkedin': 'linkedin' };
      Object.keys(map).forEach(function (id) {
        var el = document.getElementById(id); if (el) settings[map[id]] = el.value;
      });
      save(KEYS.settings, settings);
      toast('Ayarlar kaydedildi ✓', 'success');
    });
  }

  /* Export / import / reset */
  var exportDataBtn = document.getElementById('export-data-btn');
  var importDataBtn = document.getElementById('import-data-btn');
  var importFile    = document.getElementById('import-file');
  var resetDataBtn  = document.getElementById('reset-data-btn');

  if (exportDataBtn) {
    exportDataBtn.addEventListener('click', function () {
      var data = { articles: articles, subs: subs, newsletters: newsletters, settings: settings };
      downloadFile('retell-data.json', JSON.stringify(data, null, 2), 'application/json');
      toast('Veri dışa aktarıldı ✓', 'success');
    });
  }
  if (importDataBtn && importFile) {
    importDataBtn.addEventListener('click', function () { importFile.click(); });
    importFile.addEventListener('change', function () {
      var file = importFile.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        try {
          var data = JSON.parse(e.target.result);
          if (data.articles) { articles = data.articles; save(KEYS.articles, articles); }
          if (data.subs)     { subs     = data.subs;     save(KEYS.subs, subs); }
          if (data.newsletters) { newsletters = data.newsletters; save(KEYS.newsletters, newsletters); }
          if (data.settings)    { settings    = data.settings;    save(KEYS.settings, settings); }
          updateCounts();
          toast('Veri içe aktarıldı ✓', 'success');
        } catch (err) { toast('Geçersiz JSON dosyası', 'error'); }
      };
      reader.readAsText(file);
    });
  }
  if (resetDataBtn) {
    resetDataBtn.addEventListener('click', function () {
      confirm('TÜM veriler silinecek (yazılar, aboneler, bültenler). Bu işlem geri alınamaz!', function () {
        articles = []; subs = []; newsletters = [];
        [KEYS.articles, KEYS.subs, KEYS.newsletters].forEach(function (k) { localStorage.removeItem(k); });
        updateCounts();
        toast('Tüm veri silindi', 'info');
      });
    });
  }

  /* ── UTIL ─────────────────────────────────────────────────── */
  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function downloadFile(name, content, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: type }));
    a.download = name; a.click(); URL.revokeObjectURL(a.href);
  }

  /* ── SEED DEMO SUBSCRIBERS ────────────────────────────────── */
  if (!subs.length) {
    subs = [
      { id: uid(), email: 'editor@retellvisual.com', name: 'Editör', status: 'active', createdAt: new Date().toISOString() },
      { id: uid(), email: 'demo@example.com', name: 'Demo Kullanıcı', status: 'active', createdAt: new Date().toISOString() }
    ];
    save(KEYS.subs, subs);
  }

  /* ── INIT ─────────────────────────────────────────────────── */
  updateCounts();
  showView('dashboard');

})();
