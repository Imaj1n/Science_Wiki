/* ==========================================================================
   extras.js — fitur tambahan TheoryWiki
   1. Preprocessor markdown  (::: callout, opsi di fence kode)
   2. Callout / box          (> [!theorem] Judul   atau   ::: theorem Judul)
   3. Blok kode              (Python: jalankan + sembunyikan; LaTeX/Julia/C++/JS: statis)
   4. Tag & link inline      (#tag, [[artikel]]) -> buka dokumen
   5. Pengaturan tampilan    (lebar konten, margin, ukuran teks, sembunyikan kode)
   Dimuat SEBELUM script.js; semua fungsi dipanggil saat render, jadi urutan aman.
   ========================================================================== */

/* ---------- konfigurasi ---------- */
const CALLOUT_NUMBERING = true;   // beri nomor otomatis: Teorema 1, Lema 2, Definisi 3, ...

const CALLOUT_TYPES = {
  // --- gaya matematika (bernomor) ---
  theorem:     { label: 'Teorema',   icon: 'fa-star',                  math: true, numbered: true },
  lemma:       { label: 'Lema',      icon: 'fa-puzzle-piece',          math: true, numbered: true },
  proposition: { label: 'Proposisi', icon: 'fa-bookmark',              math: true, numbered: true },
  corollary:   { label: 'Korolari',  icon: 'fa-arrow-right',           math: true, numbered: true },
  definition:  { label: 'Definisi',  icon: 'fa-book',                  math: true, numbered: true },
  proof:       { label: 'Bukti',     icon: 'fa-check-double',          math: true },
  example:     { label: 'Contoh',    icon: 'fa-lightbulb',             math: true },
  remark:      { label: 'Komentar',  icon: 'fa-comment-dots',          math: true },
  // --- admonition umum ---
  note:        { label: 'Catatan',   icon: 'fa-pen' },
  info:        { label: 'Info',      icon: 'fa-circle-info' },
  tip:         { label: 'Tips',      icon: 'fa-lightbulb' },
  important:   { label: 'Penting',   icon: 'fa-circle-exclamation' },
  warning:     { label: 'Peringatan',icon: 'fa-triangle-exclamation' },
  danger:      { label: 'Bahaya',    icon: 'fa-skull-crossbones' },
  success:     { label: 'Berhasil',  icon: 'fa-circle-check' },
  question:    { label: 'Pertanyaan',icon: 'fa-circle-question' },
};
// alias (Indonesia / Inggris / gaya Obsidian & Quarto)
const CALLOUT_ALIAS = {
  teorema: 'theorem', thm: 'theorem', lema: 'lemma', lem: 'lemma',
  proposisi: 'proposition', prop: 'proposition', korolari: 'corollary', cor: 'corollary',
  definisi: 'definition', def: 'definition', bukti: 'proof', contoh: 'example', ex: 'example',
  komentar: 'remark', rem: 'remark', catatan: 'note', informasi: 'info', tips: 'tip', hint: 'tip',
  penting: 'important', peringatan: 'warning', caution: 'warning', perhatian: 'warning', attention: 'warning',
  bahaya: 'danger', error: 'danger', berhasil: 'success', check: 'success', done: 'success',
  pertanyaan: 'question', faq: 'question', help: 'question',
  'callout-note': 'note', 'callout-tip': 'tip', 'callout-warning': 'warning',
  'callout-important': 'important', 'callout-caution': 'warning',
};
const resolveCalloutType = t => {
  t = String(t || '').toLowerCase();
  t = CALLOUT_ALIAS[t] || t;
  return CALLOUT_TYPES[t] ? t : null;
};

/* bahasa kode: nama tampilan, ikon, nama untuk highlight.js */
const CODE_LANGS = {
  python: { label: 'Python',     icon: 'fa-brands fa-python', hl: 'python', run: true },
  py:     { label: 'Python',     icon: 'fa-brands fa-python', hl: 'python', run: true },
  julia:  { label: 'Julia',      icon: 'fa-solid fa-code',    hl: 'julia' },
  jl:     { label: 'Julia',      icon: 'fa-solid fa-code',    hl: 'julia' },
  cpp:    { label: 'C++',        icon: 'fa-solid fa-code',    hl: 'cpp' },
  'c++':  { label: 'C++',        icon: 'fa-solid fa-code',    hl: 'cpp' },
  cc:     { label: 'C++',        icon: 'fa-solid fa-code',    hl: 'cpp' },
  c:      { label: 'C',          icon: 'fa-solid fa-code',    hl: 'c' },
  js:     { label: 'JavaScript', icon: 'fa-brands fa-js',     hl: 'javascript' },
  javascript: { label: 'JavaScript', icon: 'fa-brands fa-js', hl: 'javascript' },
  latex:  { label: 'LaTeX',      icon: 'fa-solid fa-code',    hl: 'latex' },
  tex:    { label: 'LaTeX',      icon: 'fa-solid fa-code',    hl: 'latex' },
  bash:   { label: 'Bash',       icon: 'fa-solid fa-terminal',hl: 'bash' },
  sh:     { label: 'Shell',      icon: 'fa-solid fa-terminal',hl: 'bash' },
  json:   { label: 'JSON',       icon: 'fa-solid fa-code',    hl: 'json' },
  html:   { label: 'HTML',       icon: 'fa-solid fa-code',    hl: 'xml' },
  css:    { label: 'CSS',        icon: 'fa-solid fa-code',    hl: 'css' },
  text:   { label: 'Teks',       icon: 'fa-regular fa-file-lines', hl: null },
  txt:    { label: 'Teks',       icon: 'fa-regular fa-file-lines', hl: null },
};
const NON_CODE_FENCES = new Set(['graph', 'steps']);   // sudah ditangani modul lain

/* ==========================================================================
   1. PREPROCESSOR MARKDOWN
   - ```python hide title="a.py" norun   -> opsi dibawa lewat nama kelas: language-python{...}
   - ::: theorem Judul ... :::           -> diubah ke  > [!theorem] Judul  (blockquote)
   Pemindai memperhatikan fence kode, jadi ":::" di dalam kode tidak disentuh.
   ========================================================================== */
function preprocessMarkdown(src) {
  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let fence = null;          // { ch, len }
  let depth = 0;             // kedalaman ::: yang sedang terbuka

  const pfx = () => '> '.repeat(depth);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    /* --- di dalam fence kode: salin apa adanya (plus prefix blockquote) --- */
    if (fence) {
      const close = line.match(/^\s{0,3}(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === fence.ch && close[1].length >= fence.len) fence = null;
      out.push(pfx() + line);
      continue;
    }

    /* --- pembuka fence --- */
    const open = line.match(/^(\s{0,3})(`{3,}|~{3,})\s*([^\s`{]*)[ \t]*([^`\n]*)$/);
    if (open) {
      fence = { ch: open[2][0], len: open[2].length };
      const lang = open[3], extra = open[4].trim();
      if (lang && extra) {
        out.push(pfx() + open[1] + open[2] + lang + '{' + encodeURIComponent(extra) + '}');
      } else {
        out.push(pfx() + line);
      }
      continue;
    }

    /* --- ::: pembuka / penutup callout --- */
    const cOpen = line.match(/^\s{0,3}:{3,}\s*\{?\.?([\w-]+[+-]?)\}?[ \t]*(.*?)\s*:*\s*$/);
    const cClose = /^\s{0,3}:{3,}\s*$/.test(line);

    if (cClose && depth > 0) {
      depth--;
      out.push(pfx().trimEnd());     // baris kosong (tetap di dalam callout luar bila bersarang)
      if (depth === 0) out.push(''); // putus blockquote agar paragraf berikutnya tidak "menempel"
      continue;
    }
    if (cOpen && !cClose) {
      const base = cOpen[1].replace(/[+-]$/, '');
      if (resolveCalloutType(base)) {
        if (out.length && out[out.length - 1].trim() !== '' && depth === 0) out.push('');
        out.push(pfx() + '> [!' + cOpen[1] + '] ' + cOpen[2]);
        depth++;
        continue;
      }
    }

    out.push(depth ? (line.trim() === '' ? pfx().trimEnd() : pfx() + line) : line);
  }
  // callout yang lupa ditutup: biarkan (blockquote berakhir sendiri di akhir dokumen)
  return out.join('\n');
}

/* ==========================================================================
   2. CALLOUT
   Sintaks (dua-duanya jalan):
     > [!theorem] Pythagoras          atau    ::: theorem Pythagoras
     > Isi ... bisa $rumus$, kode,             Isi ...
     > daftar, dsb.                            :::
   Tambahkan + / - setelah tipe untuk kotak yang bisa dilipat:
     > [!info]- Klik untuk membuka     (terlipat)     > [!info]+ Judul   (terbuka)
   ========================================================================== */
function setupCallouts(root) {
  const counter = { n: 0 };
  // proses dari luar ke dalam; querySelectorAll mengembalikan urutan dokumen
  const bqs = Array.from(root.querySelectorAll('blockquote'));
  bqs.forEach(bq => buildCallout(bq, counter));
}

function buildCallout(bq, counter) {
  if (!bq.isConnected) return;
  const p = bq.firstElementChild;
  if (!p || p.tagName !== 'P') return;

  const m = p.innerHTML.match(/^\s*\[!([\w-]+)\]([+-]?)[ \t]*([^\n]*?)(?:\n|<br\s*\/?>|$)([\s\S]*)$/);
  if (!m) return;
  const type = resolveCalloutType(m[1]);
  if (!type) return;

  const def = CALLOUT_TYPES[type];
  const foldMark = m[2];                         // '' | '+' | '-'
  let titleHTML = m[3].trim();
  const restHTML = m[4].trim();

  // sisa paragraf pertama -> tetap jadi paragraf
  if (restHTML) p.innerHTML = restHTML; else p.remove();

  let numLabel = '';
  if (CALLOUT_NUMBERING && def.numbered) numLabel = ' ' + (++counter.n);

  const foldable = foldMark !== '';
  const el = document.createElement(foldable ? 'details' : 'div');
  el.className = 'callout callout-' + type + (def.math ? ' callout-math' : '');
  el.dataset.callout = type;
  if (foldable && foldMark === '+') el.open = true;

  const head = document.createElement(foldable ? 'summary' : 'div');
  head.className = 'callout-title';
  head.innerHTML =
    '<i class="fa-solid ' + def.icon + ' callout-icon"></i>' +
    '<span class="callout-label">' + def.label + numLabel + '</span>' +
    (titleHTML ? '<span class="callout-name">' + (def.math ? '(' + titleHTML + ')' : titleHTML) + '</span>' : '') +
    (foldable ? '<i class="fa-solid fa-chevron-down callout-chev"></i>' : '');

  const body = document.createElement('div');
  body.className = 'callout-body';
  while (bq.firstChild) body.appendChild(bq.firstChild);

  el.append(head, body);
  bq.replaceWith(el);

  // callout bersarang di dalam body
  Array.from(body.querySelectorAll('blockquote')).forEach(inner => buildCallout(inner, counter));
}

/* ==========================================================================
   3. BLOK KODE
   Opsi di baris pembuka fence (urutan bebas):
     hide            kode terlipat dari awal (hasil/output tetap tampil untuk Python)
     norun           Python tanpa tombol "Jalankan" (listing statis)
     title="a.py"    nama file di header
     lines           tampilkan nomor baris
   ========================================================================== */
function parseFenceOpts(cls) {
  const m = cls.match(/^language-([^\s{]+)(?:\{([^}]*)\})?$/);
  if (!m) return null;
  let raw = '';
  try { raw = decodeURIComponent(m[2] || ''); } catch (_) { raw = m[2] || ''; }
  const opts = { lang: m[1].toLowerCase(), hide: false, norun: false, lines: false, title: '' };
  const t = raw.match(/title\s*=\s*"([^"]*)"|title\s*=\s*'([^']*)'|title\s*=\s*(\S+)/i);
  if (t) opts.title = t[1] ?? t[2] ?? t[3] ?? '';
  raw.replace(/title\s*=\s*("[^"]*"|'[^']*'|\S+)/ig, '').split(/\s+/).forEach(w => {
    w = w.toLowerCase();
    if (w === 'hide' || w === 'fold' || w === 'collapsed') opts.hide = true;
    if (w === 'norun' || w === 'static') opts.norun = true;
    if (w === 'lines' || w === 'ln') opts.lines = true;
  });
  return opts;
}

function highlightInto(code, hlName) {
  if (!window.hljs) return;
  try {
    const name = hlName && hljs.getLanguage(hlName) ? hlName : null;
    if (!name) return;                           // bahasa belum dimuat -> tampil polos
    const res = hljs.highlight(code.textContent, { language: name, ignoreIllegals: true });
    code.innerHTML = res.value;
    code.classList.add('hljs');
  } catch (e) { /* biarkan polos */ }
}

function setupCodeBlocks(root, opts = {}) {
  const allFolded = document.body.classList.contains('code-all-hidden');

  root.querySelectorAll('pre > code').forEach(code => {
    const pre = code.parentElement;
    if (pre.closest('.cb')) return;
    const cls = Array.from(code.classList).find(c => c.startsWith('language-'));
    if (!cls) return;
    const o = parseFenceOpts(code.getAttribute('class').split(/\s+/).find(c => c.startsWith('language-')) || cls);
    if (!o || NON_CODE_FENCES.has(o.lang)) return;

    const def = CODE_LANGS[o.lang] || { label: o.lang, icon: 'fa-solid fa-code', hl: o.lang };
    const isPy = !!def.run && !o.norun;
    const source = code.textContent.replace(/\n$/, '');      // ambil teks SEBELUM di-highlight
    const nLines = source.split('\n').length;

    code.className = 'language-' + def.hl;
    code.textContent = source;
    highlightInto(code, def.hl);

    if (o.lines) {
      code.classList.add('with-lines');
      code.innerHTML = code.innerHTML.split('\n').map(l => '<span class="ln">' + l + '</span>').join('\n');
    }

    const wrap = document.createElement('div');
    wrap.className = 'cb' + (isPy ? ' cb-run' : '');
    wrap.dataset.lang = def.hl || o.lang;

    const head = document.createElement('div');
    head.className = 'cb-head';
    head.innerHTML =
      '<span class="cb-lang"><i class="' + def.icon + '"></i>' + escapeHtmlX(def.label) + '</span>' +
      (o.title ? '<span class="cb-title">' + escapeHtmlX(o.title) + '</span>' : '') +
      '<span class="cb-meta">' + nLines + ' baris</span>' +
      '<span class="cb-actions">' +
        (isPy ? '<button type="button" class="cb-btn cb-btn-run" data-act="run"><i class="fa-solid fa-play"></i><span>Jalankan</span></button>' : '') +
        '<button type="button" class="cb-btn" data-act="copy" title="Salin kode"><i class="fa-regular fa-copy"></i><span>Salin</span></button>' +
        '<button type="button" class="cb-btn" data-act="fold" title="Sembunyikan / tampilkan kode"><i class="fa-solid fa-eye-slash"></i><span>Sembunyikan kode</span></button>' +
      '</span>';

    pre.replaceWith(wrap);
    wrap.append(head, pre);

    let out = null;
    if (isPy) {
      const outId = 'py-out-' + Math.random().toString(36).slice(2, 9);
      out = document.createElement('div');
      out.id = outId;
      out.className = 'cb-out p-2.5 text-xs font-mono min-h-[30px] text-slate-300 overflow-x-auto';
      out.innerHTML = '<span class="text-slate-600 italic">[Klik "Jalankan" untuk mengeksekusi kode]</span>';
      wrap.appendChild(out);
      head.querySelector('[data-act="run"]').addEventListener('click', () => executePythonCode(source, outId));
    }

    const foldBtn = head.querySelector('[data-act="fold"]');
    const setFold = f => {
      wrap.classList.toggle('is-folded', f);
      foldBtn.querySelector('i').className = 'fa-solid ' + (f ? 'fa-eye' : 'fa-eye-slash');
      foldBtn.querySelector('span').textContent = f ? 'Tampilkan kode' : 'Sembunyikan kode';
    };
    foldBtn.addEventListener('click', () => setFold(!wrap.classList.contains('is-folded')));
    wrap._setFold = setFold;
    setFold(o.hide || allFolded);

    head.querySelector('[data-act="copy"]').addEventListener('click', async e => {
      const btn = e.currentTarget, label = btn.querySelector('span');
      try { await navigator.clipboard.writeText(source); label.textContent = 'Tersalin'; }
      catch (_) { label.textContent = 'Gagal'; }
      setTimeout(() => { label.textContent = 'Salin'; }, 1400);
    });
  });
}

/* sembunyikan / tampilkan SEMUA kode di halaman (dari panel Tampilan) */
function setAllCodeHidden(hidden) {
  document.body.classList.toggle('code-all-hidden', hidden);
  document.querySelectorAll('.cb').forEach(w => w._setFold && w._setFold(hidden));
}

function escapeHtmlX(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ==========================================================================
   4. TAG & LINK INLINE
   #tag            -> kalau ada artikel ber-ID/judul sama: langsung dibuka;
                      kalau ada satu artikel bertag itu: dibuka; kalau lebih: muncul daftar.
   [[id]]          -> buka artikel (cocok ID, judul, atau slug judul)
   [[id|teks]]     -> sama, dengan teks tampilan sendiri
   [[id#Judul bagian]] -> buka lalu gulir ke bagian itu
   Hanya #tag yang benar-benar ada (di tag artikel manapun) yang dijadikan tautan.
   ========================================================================== */
const slugify = s => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function findArticleByRef(ref) {
  const r = String(ref).trim().toLowerCase();
  const rs = slugify(ref);
  return articles.find(a => a.id.toLowerCase() === r)
      || articles.find(a => (a.title || '').toLowerCase() === r)
      || articles.find(a => slugify(a.title || '') === rs)
      || null;
}
function articlesWithTag(tag) {
  const t = String(tag).toLowerCase();
  return articles.filter(a => (a.tags || []).some(x => String(x).toLowerCase() === t));
}
function knownTagSet() {
  const s = new Set();
  articles.forEach(a => (a.tags || []).forEach(t => s.add(String(t).toLowerCase())));
  return s;
}

function linkifyInline(root, interactive = true) {
  const tags = knownTagSet();
  const SKIP = 'pre, code, a, .katex, .katex-display, script, style, textarea, .mp-fig, .st-fig, .cb-head, h1, h2, h3, .tag-ref, .wikilink';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue || (n.nodeValue.indexOf('#') < 0 && n.nodeValue.indexOf('[[') < 0)) return NodeFilter.FILTER_REJECT;
      return n.parentElement && n.parentElement.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  const RE = /\[\[([^\]\n]+?)\]\]|(^|[\s(\[{"'“‘])#([\p{L}\p{N}_][\p{L}\p{N}_\/-]*)/gu;

  nodes.forEach(node => {
    const text = node.nodeValue;
    RE.lastIndex = 0;
    let m, last = 0, changed = false;
    const frag = document.createDocumentFragment();

    while ((m = RE.exec(text))) {
      if (m[1] !== undefined) {                                  // [[wikilink]]
        const [target, label] = m[1].split('|');
        const [ref, anchor] = target.split('#');
        const art = findArticleByRef(ref);
        frag.append(text.slice(last, m.index));
        const a = document.createElement('a');
        a.className = 'wikilink' + (art ? '' : ' broken');
        a.textContent = (label || (anchor ? ref + ' › ' + anchor : (art ? art.title : ref))).trim();
        if (art) {
          a.href = '#/a/' + encodeURIComponent(art.id);
          a.title = 'Buka: ' + art.title;
          a.dataset.article = art.id;
          if (anchor) a.dataset.anchor = anchor.trim();
        } else {
          a.title = 'Artikel tidak ditemukan: ' + ref;
        }
        frag.append(a);
        last = m.index + m[0].length;
        changed = true;
      } else {                                                   // #tag
        const tag = m[3];
        if (!tags.has(tag.toLowerCase()) && !findArticleByRef(tag)) continue;
        frag.append(text.slice(last, m.index) + m[2]);
        const b = document.createElement('a');
        b.className = 'tag-ref';
        b.href = '#tag-' + encodeURIComponent(tag);
        b.dataset.tag = tag;
        b.textContent = '#' + tag;
        frag.append(b);
        last = m.index + m[0].length;
        changed = true;
      }
    }
    if (!changed) return;
    frag.append(text.slice(last));
    node.replaceWith(frag);
  });

  if (!interactive) { root.classList.add('no-nav'); return; }
  root.classList.remove('no-nav');
  if (root._navBound) return;
  root._navBound = true;
  root.addEventListener('click', onInlineRefClick);
}

function onInlineRefClick(e) {
  const wl = e.target.closest('a.wikilink');
  const tr = e.target.closest('a.tag-ref');
  if (!wl && !tr) return;
  e.preventDefault();
  if (wl) {
    if (wl.dataset.article) openArticle(wl.dataset.article, wl.dataset.anchor);
    return;
  }
  openTagTarget(tr.dataset.tag, tr);
}

/* dipakai juga oleh chip tag di kepala artikel */
function openTagTarget(tag, anchorEl) {
  closeTagPop();
  const direct = findArticleByRef(tag);
  const list = articlesWithTag(tag).filter(a => a.id !== currentArticleId);
  if (direct && direct.id !== currentArticleId) { openArticle(direct.id); return; }
  if (list.length === 1 && !(articlesWithTag(tag).length > 1 && false)) { openArticle(list[0].id); return; }

  const pop = document.createElement('div');
  pop.id = 'tag-pop';
  pop.innerHTML =
    '<div class="tp-head"><span>#' + escapeHtmlX(tag) + '</span><button type="button" class="tp-x" aria-label="Tutup">×</button></div>' +
    (list.length
      ? list.map(a => '<button type="button" class="tp-item" data-id="' + escapeHtmlX(a.id) + '"><b>' + escapeHtmlX(a.title) +
          '</b><small>docs/' + escapeHtmlX(a.folderPath || 'root') + '/' + escapeHtmlX(a.id) + '.md</small></button>').join('')
      : '<div class="tp-empty">Tidak ada artikel lain dengan tag ini.</div>') +
    '<button type="button" class="tp-filter">Filter sidebar dengan tag ini</button>';
  document.body.appendChild(pop);

  const r = anchorEl ? anchorEl.getBoundingClientRect() : { left: 80, bottom: 120 };
  const w = pop.offsetWidth;
  pop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + 'px';
  pop.style.top = Math.min(window.innerHeight - pop.offsetHeight - 8, r.bottom + 6) + 'px';

  pop.addEventListener('click', ev => {
    const item = ev.target.closest('.tp-item');
    if (item) { closeTagPop(); openArticle(item.dataset.id); }
    if (ev.target.closest('.tp-x')) closeTagPop();
    if (ev.target.closest('.tp-filter')) {
      closeTagPop();
      activeTagFilter = tag; renderSidebarTagChips(); renderFolderTreeNav();
      const side = document.getElementById('wiki-sidebar');
      if (desktopMQ.matches) side.classList.remove('collapsed'); else toggleSidebar();
    }
  });
  setTimeout(() => document.addEventListener('pointerdown', tagPopOutside, true), 0);
}
function tagPopOutside(e) { if (!e.target.closest('#tag-pop') && !e.target.closest('a.tag-ref') && !e.target.closest('.reader-tag')) closeTagPop(); }
function closeTagPop() {
  const p = document.getElementById('tag-pop'); if (p) p.remove();
  document.removeEventListener('pointerdown', tagPopOutside, true);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTagPop(); });

/* ---------- navigasi artikel + riwayat browser (tombol Back berfungsi) ---------- */
let _pendingAnchor = null;
let _navFromHistory = false;

function openArticle(id, anchor) {
  if (!articles.some(a => a.id === id)) return;
  _pendingAnchor = anchor || null;
  displayArticle(id);
  switchTab('reader');
  applyPendingAnchor();
}
function applyPendingAnchor() {
  if (!_pendingAnchor) return;
  const want = slugify(_pendingAnchor);
  const h = Array.from(document.querySelectorAll('#reader-markdown h1, #reader-markdown h2, #reader-markdown h3, #reader-markdown h4'))
    .find(x => slugify(x.textContent) === want || x.textContent.trim().toLowerCase() === _pendingAnchor.toLowerCase());
  _pendingAnchor = null;
  if (h) setTimeout(() => h.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
}
function syncArticleHash(id) {
  if (_navFromHistory) return;
  const h = '#/a/' + encodeURIComponent(id);
  if (location.hash !== h) history.pushState(null, '', h);
}
function routeFromHash() {
  const m = location.hash.match(/^#\/a\/([^/?#]+)/);
  if (!m) return false;
  const id = decodeURIComponent(m[1]);
  if (!articles.some(a => a.id === id)) return false;
  _navFromHistory = true;
  try { displayArticle(id); switchTab('reader'); } finally { _navFromHistory = false; }
  return true;
}
window.addEventListener('popstate', () => {
  if (!articles.length) return;
  if (!routeFromHash()) { _navFromHistory = true; try { showVaultsGrid(); } finally { _navFromHistory = false; } }
});

/* ==========================================================================
   5. PENGATURAN TAMPILAN  (lebar konten, margin samping, ukuran teks, kode)
   ========================================================================== */
const VIEW_DEFAULTS = { readMax: 1360, sidePad: 20, fontScale: 1, hideCode: false };
const VIEW_FULL = 2200;            // geser slider sampai ujung = lebar penuh
let viewSettings = { ...VIEW_DEFAULTS };

function loadViewSettings() {
  try { viewSettings = { ...VIEW_DEFAULTS, ...(JSON.parse(localStorage.getItem('tw-view') || '{}')) }; }
  catch (_) { viewSettings = { ...VIEW_DEFAULTS }; }
}
function saveViewSettings() { try { localStorage.setItem('tw-view', JSON.stringify(viewSettings)); } catch (_) {} }

function applyViewSettings() {
  const s = viewSettings, root = document.documentElement.style;
  const full = s.readMax >= VIEW_FULL;
  root.setProperty('--read-max', full ? '100000px' : s.readMax + 'px');
  root.setProperty('--side-pad', s.sidePad + 'px');
  root.setProperty('--fs-scale', String(s.fontScale));
  document.body.classList.toggle('code-all-hidden', !!s.hideCode);

  const set = (id, v) => { const el = document.getElementById(id); if (el) { if (el.type === 'checkbox') el.checked = !!v; else el.value = v; } };
  const txt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('vs-width', s.readMax); set('vs-pad', s.sidePad); set('vs-font', Math.round(s.fontScale * 100)); set('vs-hidecode', s.hideCode);
  txt('vs-width-val', full ? 'Penuh' : s.readMax + ' px');
  txt('vs-pad-val', s.sidePad + ' px');
  txt('vs-font-val', Math.round(s.fontScale * 100) + '%');
}

function initViewSettings() {
  loadViewSettings();
  applyViewSettings();
  const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('input', () => { fn(el); applyViewSettings(); saveViewSettings(); }); };
  bind('vs-width',  el => viewSettings.readMax = +el.value);
  bind('vs-pad',    el => viewSettings.sidePad = +el.value);
  bind('vs-font',   el => viewSettings.fontScale = +el.value / 100);
  bind('vs-hidecode', el => { viewSettings.hideCode = el.checked; setAllCodeHidden(el.checked); });
  const reset = document.getElementById('vs-reset');
  if (reset) reset.addEventListener('click', () => { viewSettings = { ...VIEW_DEFAULTS }; applyViewSettings(); setAllCodeHidden(false); saveViewSettings(); });
  document.addEventListener('pointerdown', e => {
    const panel = document.getElementById('view-settings-panel');
    if (panel && !panel.classList.contains('hidden') && !e.target.closest('#view-settings-panel') && !e.target.closest('#view-settings-btn')) panel.classList.add('hidden');
  });
}
function toggleViewSettings() {
  const p = document.getElementById('view-settings-panel');
  if (p) p.classList.toggle('hidden');
}
window.addEventListener('DOMContentLoaded', initViewSettings);

/* ==========================================================================
   SNIPPET BARU untuk toolbar editor (dipanggil dari insertSnippet di script.js)
   ========================================================================== */
const EXTRA_SNIPPETS = {
  'c-theorem':  '\n> [!theorem] Nama teorema\n> Pernyataan teorema, misalnya $a^2+b^2=c^2$.\n\n',
  'c-lemma':    '\n> [!lemma] Nama lema\n> Pernyataan lema.\n\n',
  'c-definition': '\n> [!definition] Istilah\n> **Istilah** didefinisikan sebagai ...\n\n',
  'c-proof':    '\n> [!proof]\n> Langkah-langkah pembuktian ...\n\n',
  'c-example':  '\n> [!example] Judul contoh\n> Isi contoh.\n\n',
  'c-note':     '\n> [!note] Judul\n> Isi catatan.\n\n',
  'c-info':     '\n> [!info] Judul\n> Informasi tambahan.\n\n',
  'c-tip':      '\n> [!tip] Judul\n> Saran praktis.\n\n',
  'c-warning':  '\n> [!warning] Judul\n> Hati-hati dengan ...\n\n',
  'c-danger':   '\n> [!danger] Judul\n> Jangan lakukan ...\n\n',
  'c-fold':     '\n> [!info]- Klik untuk membuka\n> Isi yang terlipat.\n\n',
  'k-python-hide': '\n```python hide\nprint("kode tersembunyi, hasil tetap tampil")\n```\n',
  'k-latex':    '\n```latex title="contoh.tex"\n\\documentclass{article}\n\\begin{document}\nHalo, $E = mc^2$\n\\end{document}\n```\n',
  'k-julia':    '\n```julia title="contoh.jl"\nf(x) = x^2 + 1\nprintln(f(3))\n```\n',
  'k-cpp':      '\n```cpp title="main.cpp"\n#include <iostream>\nint main() {\n    std::cout << "Halo\\n";\n    return 0;\n}\n```\n',
  'k-js':       '\n```js title="contoh.js"\nconst f = x => x ** 2 + 1;\nconsole.log(f(3));\n```\n',
  'ref-wiki':   '[[id-artikel|teks tampilan]]',
  'ref-tag':    '#nama-tag',
};