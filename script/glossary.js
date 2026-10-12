/* ==========================================================================
   glossary.js — istilah asing + widget melayang (hover) di TheoryWiki
   --------------------------------------------------------------------------
   Mendefinisikan istilah (di artikel manapun) dengan blok:

     ```glossary
     # eigenvalue | nilai eigen | eigenvalues
     Skalar $\lambda$ yang memenuhi $Av=\lambda v$.
     Baca: [Wikipedia](https://en.wikipedia.org/wiki/Eigenvalue)

     # PDE {cs}
     Persamaan diferensial parsial.
     ```

   - "# istilah | alias | alias"  = judul entri; baris sesudahnya = definisi (markdown + $KaTeX$ + link).
   - flag di ujung judul:  {cs} = peka huruf besar/kecil,  {manual} = hanya aktif lewat {{istilah}}
   - ```glossary hide        = entri didaftarkan tetapi daftarnya tidak ditampilkan di halaman
   - Artikel bertag  #glosarium (atau #glossary)  = glosarium GLOBAL: berlaku di semua artikel.
     Blok glossary di artikel biasa = glosarium LOKAL (hanya artikel itu; menimpa yang global).
   - Semua kemunculan istilah di teks otomatis diberi garis titik-titik; arahkan kursor (atau Tab/ketuk)
     untuk melihat widget. Penanda manual:  {{istilah}}  atau  {{istilah|teks yang ditampilkan}}
   Dimuat setelah extras.js (memakai escapeHtmlX & parseFenceOpts dari sana).
   ========================================================================== */

const GLOSSARY_TAGS = ['glosarium', 'glossary'];   // tag artikel yang dianggap glosarium global
const GLOSSARY_FIRST_ONLY = false;                 // true = hanya kemunculan pertama tiap istilah per artikel
const GLOSSARY_SHOW_DELAY = 140;                   // ms sebelum widget muncul saat kursor menyorot
const GLOSSARY_HIDE_DELAY = 280;                   // ms sebelum widget tertutup saat kursor pergi
const GL_MATH_DELIMS = [
  { left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false },
  { left: '\\(', right: '\\)', display: false }, { left: '\\[', right: '\\]', display: true }
];

/* ---------- parsing entri ---------- */
function glParseHeader(h, source) {
  const flags = new Set();
  h = h.replace(/\{([\w,\s]+)\}\s*$/, (m, f) => { f.split(/[,\s]+/).filter(Boolean).forEach(x => flags.add(x.toLowerCase())); return ''; }).trim();
  const keys = h.split('|').map(s => s.trim()).filter(Boolean);
  return { term: keys[0] || '', keys, cs: flags.has('cs'), manual: flags.has('manual'), def: '', source, html: null };
}
function glParseBlock(text, source) {
  const out = []; let cur = null;
  String(text).replace(/\r\n?/g, '\n').split('\n').forEach(line => {
    const h = line.match(/^#\s+(.+?)\s*$/);
    if (h) { cur = glParseHeader(h[1], source); out.push(cur); return; }
    if (cur) cur.def += line + '\n';
  });
  return out.filter(e => e.keys.length);
}
function glExtractFences(md, source) {
  const out = [], re = /^(`{3,}|~{3,})glossary[^\n]*\n([\s\S]*?)^\1[ \t]*$/gm;
  let m; while ((m = re.exec(md))) out.push(...glParseBlock(m[2], source));
  return out;
}

/* glosarium global = semua blok glossary di artikel bertag glosarium (di-cache per versi konten) */
const _glCache = new Map();
function glGlobalEntries() {
  const out = [];
  (typeof articles !== 'undefined' ? articles : []).forEach(a => {
    if (!(a.tags || []).some(t => GLOSSARY_TAGS.includes(String(t).toLowerCase()))) return;
    const sig = (a.content || '').length + ':' + (a.updatedAt || '');
    let c = _glCache.get(a.id);
    if (!c || c.sig !== sig) { c = { sig, entries: glExtractFences(a.content || '', { id: a.id, title: a.title }) }; _glCache.set(a.id, c); }
    out.push(...c.entries);
  });
  return out;
}

/* ---------- markdown definisi (rumus dilindungi dari marked) ---------- */
function glMarkdown(md) {
  const M = [];
  const s = String(md).trim().replace(/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g, m => { M.push(m); return '@@GM' + (M.length - 1) + '@@'; });
  let h = (window.marked ? marked.parse(s) : '<p>' + escapeHtmlX(s) + '</p>')
    .replace(/@@GM(\d+)@@/g, (m, i) => escapeHtmlX(M[i]));
  const box = document.createElement('div'); box.innerHTML = h;
  box.querySelectorAll('a[href]').forEach(a => {
    if (/^https?:/i.test(a.getAttribute('href'))) { a.target = '_blank'; a.rel = 'noopener noreferrer'; a.classList.add('gl-ext'); }
  });
  return box.innerHTML;
}
function glEntryHTML(e) { return e.html || (e.html = e.def.trim() ? glMarkdown(e.def) : '<p class="gl-empty">(belum ada definisi)</p>'); }
function glMath(el) {
  if (window.renderMathInElement) renderMathInElement(el, { delimiters: GL_MATH_DELIMS, throwOnError: false, trust: true });
}

/* ==========================================================================
   setupGlossary(root)  — dipanggil dari renderMarkdownAndMath (script.js)
   ========================================================================== */
function setupGlossary(root) {
  /* 1. blok ```glossary di artikel ini -> entri lokal (+ daftar tampil kecuali "hide") */
  const local = [];
  root.querySelectorAll('pre > code[class*="language-glossary"]').forEach(code => {
    const pre = code.parentElement;
    const o = (typeof parseFenceOpts === 'function' && parseFenceOpts(Array.from(code.classList).find(c => c.startsWith('language-')))) || {};
    const entries = glParseBlock(code.textContent, null);
    local.push(...entries);
    if (o.hide || !entries.length) { pre.remove(); return; }
    const sec = document.createElement('section');
    sec.className = 'gl-list';
    sec.innerHTML = '<h4 class="gl-title"><i class="fa-solid fa-book-open"></i> Glosarium</h4>' +
      entries.map(e => '<div class="gl-item"><div class="gl-term"><b>' + escapeHtmlX(e.term) + '</b>' +
        (e.keys.length > 1 ? '<span class="gl-alias">' + e.keys.slice(1).map(escapeHtmlX).join(', ') + '</span>' : '') +
        '</div><div class="gl-def">' + glEntryHTML(e) + '</div></div>').join('');
    pre.replaceWith(sec);
    glMath(sec);
  });

  /* 2. peta istilah: global dulu, lokal menimpa */
  const all = [...glGlobalEntries(), ...local];
  const map = new Map();
  all.forEach(e => e.keys.forEach(k => map.set(k.toLowerCase(), e)));
  root._glMap = map;
  glBindHover(root);

  /* 3. regex pencocok otomatis (tanpa entri {manual}); kunci terpanjang dulu */
  const keys = [];
  all.forEach(e => { if (!e.manual) e.keys.forEach(k => keys.push(k)); });
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');   // (tanpa \- dan \/ : tidak valid pada regex berflag u)
  const AUTO = keys.length
    ? new RegExp('(?<![\\p{L}\\p{N}_])(' + [...new Set(keys)].sort((a, b) => b.length - a.length).map(esc).join('|') + ')(?![\\p{L}\\p{N}_])', 'giu')
    : null;

  /* 4. telusuri node teks */
  const SKIP = 'pre, code, a, h1, h2, h3, h4, .katex, .katex-display, script, style, textarea, ' +
               '.flow, .cb, .gl-list, .term-ref, .tag-ref, .wikilink, .mp-fig, .st-fig, .callout-label';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const v = n.nodeValue;
      if (!v || !v.trim()) return NodeFilter.FILTER_REJECT;
      if (!AUTO && v.indexOf('{{') < 0) return NodeFilter.FILTER_REJECT;
      return n.parentElement && n.parentElement.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);

  const seen = new Set();
  const MAN = /\{\{([^{}\n|]+?)(?:\|([^{}\n]+?))?\}\}/g;

  nodes.forEach(node => {
    const text = node.nodeValue, segs = [];
    let last = 0, m; MAN.lastIndex = 0;
    while ((m = MAN.exec(text))) {
      if (m.index > last) segs.push({ t: 'text', v: text.slice(last, m.index) });
      segs.push({ t: 'man', key: m[1].trim(), label: (m[2] || m[1]).trim() });
      last = m.index + m[0].length;
    }
    if (last < text.length) segs.push({ t: 'text', v: text.slice(last) });

    const frag = document.createDocumentFragment(); let changed = false;
    segs.forEach(s => {
      if (s.t === 'man') { frag.append(glTermSpan(s.label, s.key, map.has(s.key.toLowerCase()))); changed = true; return; }
      if (!AUTO) { frag.append(s.v); return; }
      let l = 0, mm, had = false; AUTO.lastIndex = 0;
      const piece = document.createDocumentFragment();
      while ((mm = AUTO.exec(s.v))) {
        const key = mm[1], e = map.get(key.toLowerCase());
        if (!e || e.manual) continue;
        if (e.cs && !e.keys.includes(key)) continue;
        if (GLOSSARY_FIRST_ONLY && seen.has(e)) continue;
        seen.add(e);
        piece.append(s.v.slice(l, mm.index), glTermSpan(key, key, true));
        l = mm.index + mm[0].length; had = true;
      }
      if (had) { piece.append(s.v.slice(l)); frag.append(piece); changed = true; } else frag.append(s.v);
    });
    if (changed) node.replaceWith(frag);
  });
}

function glTermSpan(label, key, known) {
  const s = document.createElement('span');
  s.className = 'term-ref' + (known ? '' : ' missing');
  s.textContent = label;
  s.dataset.key = key;
  s.tabIndex = 0;
  s.setAttribute('role', 'button');
  s.setAttribute('aria-haspopup', 'dialog');
  if (!known) s.title = 'Istilah "' + key + '" belum didefinisikan di glosarium';
  return s;
}

/* ==========================================================================
   Widget melayang: hover / fokus / ketuk membuka; kursor boleh masuk ke widget
   (untuk scroll & klik link); 📌 menyematkan jadi widget yang bisa diseret.
   ========================================================================== */
let _glShow = null, _glHide = null, _glCard = null, _glTerm = null, _glZ = 80;

function glBindHover(root) {
  if (root._glBound) return;
  root._glBound = true;
  const off = () => document.body.classList.contains('gloss-off');
  const term = e => { const t = e.target.closest && e.target.closest('.term-ref'); return t && root.contains(t) ? t : null; };

  root.addEventListener('mouseover', e => {
    const t = term(e); if (!t || off() || t.classList.contains('missing')) return;
    clearTimeout(_glHide);
    if (_glTerm === t) return;
    clearTimeout(_glShow); _glShow = setTimeout(() => glOpen(t, root), GLOSSARY_SHOW_DELAY);
  });
  root.addEventListener('mouseout', e => { if (term(e)) { clearTimeout(_glShow); glScheduleClose(); } });
  root.addEventListener('focusin', e => { const t = term(e); if (t && !off() && !t.classList.contains('missing')) glOpen(t, root); });
  root.addEventListener('focusout', e => { if (term(e)) glScheduleClose(); });
  root.addEventListener('click', e => {                       // ketuk (layar sentuh) = buka / tutup
    const t = term(e); if (!t || off() || t.classList.contains('missing')) return;
    e.preventDefault();
    if (_glTerm === t) glClose(); else glOpen(t, root);
  });
  root.addEventListener('keydown', e => {
    const t = term(e); if (!t) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); glOpen(t, root); }
  });
}
function glScheduleClose() { clearTimeout(_glHide); _glHide = setTimeout(glClose, GLOSSARY_HIDE_DELAY); }
function glClose() {
  clearTimeout(_glShow); clearTimeout(_glHide);
  if (_glCard) _glCard.remove();
  _glCard = null; _glTerm = null;
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') glClose(); });
document.addEventListener('pointerdown', e => { if (_glCard && !e.target.closest('.gl-card') && !e.target.closest('.term-ref')) glClose(); }, true);
window.addEventListener('scroll', e => { if (_glCard && !(e.target.nodeType === 1 && e.target.closest('.gl-card'))) glClose(); }, true);   // widget yang belum disematkan ikut tertutup saat halaman digulir
window.addEventListener('resize', () => glClose());

function glOpen(termEl, root) {
  const entry = root._glMap && root._glMap.get(String(termEl.dataset.key).toLowerCase());
  if (!entry) return;
  glClose();
  const card = glBuildCard(entry);
  document.body.appendChild(card);
  glPlace(card, termEl.getBoundingClientRect());
  _glCard = card; _glTerm = termEl;
  card.addEventListener('mouseenter', () => clearTimeout(_glHide));
  card.addEventListener('mouseleave', () => { if (_glCard === card) glScheduleClose(); });
  termEl.setAttribute('aria-describedby', 'gl-card-active'); card.id = 'gl-card-active';
}

function glBuildCard(entry) {
  const c = document.createElement('div');
  c.className = 'gl-card';
  c.setAttribute('role', 'dialog');
  c.style.zIndex = ++_glZ;
  c.innerHTML =
    '<div class="gl-card-head"><i class="fa-solid fa-book-open"></i>' +
      '<span class="gl-card-term"><b>' + escapeHtmlX(entry.term) + '</b>' +
      (entry.keys.length > 1 ? '<small>' + entry.keys.slice(1).map(escapeHtmlX).join(' · ') + '</small>' : '') + '</span>' +
      '<span class="gl-card-btns"><button type="button" data-a="pin" title="Sematkan (bisa diseret)"><i class="fa-solid fa-thumbtack"></i></button>' +
      '<button type="button" data-a="x" title="Tutup (Esc)"><i class="fa-solid fa-xmark"></i></button></span></div>' +
    '<div class="gl-card-body">' + glEntryHTML(entry) + '</div>' +
    (entry.source && entry.source.title
      ? '<div class="gl-card-foot"><button type="button" data-a="open"><i class="fa-regular fa-file-lines"></i> Dari: ' + escapeHtmlX(entry.source.title) + '</button></div>' : '');
  glMath(c.querySelector('.gl-card-body'));

  c.addEventListener('pointerdown', () => { c.style.zIndex = ++_glZ; });
  c.addEventListener('click', e => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'x') { if (_glCard === c) glClose(); else c.remove(); }
    if (a === 'pin') glPin(c);
    if (a === 'open' && entry.source && typeof openArticle === 'function') { if (_glCard === c) glClose(); else c.remove(); openArticle(entry.source.id); }
  });
  return c;
}

function glPlace(card, r) {
  const vw = window.innerWidth, vh = window.innerHeight, m = 8;
  const w = Math.min(card.offsetWidth, vw - 2 * m), h = card.offsetHeight;
  let left = Math.max(m, Math.min(vw - w - m, r.left + r.width / 2 - w / 2));
  let top = r.bottom + 8;
  if (top + h > vh - m && r.top - h - 8 > m) top = r.top - h - 8;          // balik ke atas bila tidak muat
  top = Math.max(m, Math.min(top, vh - h - m));
  card.style.left = left + 'px'; card.style.top = top + 'px';
}

/* sematkan: lepas dari pengelola hover, aktifkan seret lewat header */
function glPin(card) {
  card.classList.add('pinned');
  const pinBtn = card.querySelector('[data-a="pin"]'); if (pinBtn) pinBtn.remove();
  if (_glCard === card) { _glCard = null; _glTerm = null; }
  clearTimeout(_glHide);
  const head = card.querySelector('.gl-card-head');
  let d = null;
  head.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    const r = card.getBoundingClientRect(); d = { x: e.clientX - r.left, y: e.clientY - r.top };
    head.setPointerCapture(e.pointerId); card.style.zIndex = ++_glZ;
  });
  head.addEventListener('pointermove', e => {
    if (!d) return;
    card.style.left = Math.max(0, Math.min(window.innerWidth - 80, e.clientX - d.x)) + 'px';
    card.style.top = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - d.y)) + 'px';
  });
  head.addEventListener('pointerup', () => { d = null; });
  head.addEventListener('pointercancel', () => { d = null; });
}
