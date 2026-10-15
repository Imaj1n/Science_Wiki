/* ==========================================================================
   highlight.js — syntax highlighting untuk editor markdown TheoryWiki
   Teknik: <pre> berwarna di BELAKANG <textarea> yang teksnya transparan. Teks yang diketik tetap milik textarea
   (caret, seleksi, undo, IME, paste tidak berubah); <pre> hanya menggambar warna dengan teks identik.
   Karena itu token TIDAK boleh mengubah lebar glyph: hanya warna/garis bawah, tanpa tebal/miring.
   API:  TWHighlight.markdown(src) -> HTML      TWHighlight.attach(textarea, checkbox?) -> {refresh, set}
   Yang diwarnai: heading, **tebal**, *miring*, `kode`, $rumus$ & $$rumus$$ (perintah LaTeX, \var \sym \fn \calc \val \valn \rv,
   nama distribusi), [[tautan]], {{istilah}}, [teks](url), #tag, ::: callout, > kutipan, daftar, tabel, komentar HTML,
   blok kode (python, js, cpp, julia, ...), dan blok ```flow (param:, view:, seed:, node id [tipe] label | kode -> tujuan).
   ========================================================================== */
(function (root) {
'use strict';

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const sp = (c, s) => (s === '' ? '' : '<span class="hl-' + c + '">' + esc(s) + '</span>');
const words = s => new Set(s.split(' '));

/* ---------- bahasa kode ---------- */
const KW = {
  py: words('and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield True False None'),
  js: words('async await break case catch class const continue default delete do else export extends finally for function if import in instanceof let new of return super switch this throw try typeof var void while with yield true false null undefined'),
  cpp: words('auto bool break case catch char class const continue default delete do double else enum explicit extern false float for friend goto if inline int long namespace new nullptr operator private protected public return short signed sizeof static struct switch template this throw true try typedef typename union unsigned using virtual void volatile while include define'),
  jl: words('abstract baremodule begin break catch const continue do else elseif end export false finally for function global if import let local macro module mutable quote return struct true try using while in'),
  sh: words('if then else elif fi for do done while until case esac function in select return exit export local')
};
const LANGS = {
  python: ['py', '#'], py: ['py', '#'], r: ['py', '#'],
  js: ['js', '//'], javascript: ['js', '//'], ts: ['js', '//'], typescript: ['js', '//'], jsx: ['js', '//'], node: ['js', '//'], flow: ['js', '//'],
  cpp: ['cpp', '//'], 'c++': ['cpp', '//'], c: ['cpp', '//'], cc: ['cpp', '//'], h: ['cpp', '//'], java: ['cpp', '//'], cs: ['cpp', '//'], 'c#': ['cpp', '//'],
  julia: ['jl', '#'], jl: ['jl', '#'], matlab: ['jl', '%'], octave: ['jl', '%'],
  bash: ['sh', '#'], sh: ['sh', '#'], shell: ['sh', '#'], zsh: ['sh', '#'],
  graph: [null, '#'], steps: [null, '#']
};
const DISTS = words('Normal LogNormal Uniform Exponential Bernoulli Binomial Poisson Geometric');

const CODE_RE = {};
function codeRe(cm) {
  if (!CODE_RE[cm]) {
    const c = cm === '//' ? '\\/\\/.*$' : cm === '#' ? '#.*$' : '%.*$';
    CODE_RE[cm] = new RegExp('(' + c + ')|("(?:\\\\.|[^"\\\\])*"?|\'(?:\\\\.|[^\'\\\\])*\'?)|(\\b\\d+(?:\\.\\d+)?(?:[eE][-+]?\\d+)?\\b)|([A-Za-z_]\\w*)(\\s*\\()?', 'g');
  }
  return CODE_RE[cm];
}
function hlCode(line, lang) {
  const L = LANGS[lang];
  if (!L) return esc(line);
  const re = codeRe(L[1]), kw = L[0] ? KW[L[0]] : null;
  let out = '', last = 0, m; re.lastIndex = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) out += esc(line.slice(last, m.index));
    if (m[1]) out += sp('cm', m[1]);
    else if (m[2]) out += sp('str', m[2]);
    else if (m[3]) out += sp('num', m[3]);
    else {
      const w = m[4];
      if (DISTS.has(w)) out += sp('type', w);
      else if (kw && kw.has(w)) out += sp('kw', w);
      else if (m[5]) out += sp('fn', w);
      else out += esc(w);
      if (m[5]) out += esc(m[5]);
    }
    last = re.lastIndex;
  }
  return out + esc(line.slice(last));
}

/* ---------- rumus ---------- */
const TEX_RE = /(\\(?:var|sym|fn|calc|valn|val|rv)(?![A-Za-z]))|(\b(?:Normal|LogNormal|Uniform|Exponential|Bernoulli|Binomial|Poisson|Geometric)\b)|(\\[A-Za-z]+|\\.)|(\d+(?:\.\d+)?)|([{}^_&])/g;
function hlTex(s) {
  let out = '', last = 0, m; TEX_RE.lastIndex = 0;
  while ((m = TEX_RE.exec(s))) {
    if (m.index > last) out += esc(s.slice(last, m.index));
    out += sp(m[1] ? 'rx' : m[2] ? 'type' : m[3] ? 'tx' : m[4] ? 'num' : 'mu', m[0]);
    last = TEX_RE.lastIndex;
  }
  return out + esc(s.slice(last));
}
function hlMathRaw(line) { return line.split('$$').map(hlTex).join(sp('md', '$$')); }
function hlMathInline(t) {
  const d = t.startsWith('$$') ? '$$' : '$';
  return sp('md', d) + hlTex(t.slice(d.length, t.length - d.length)) + sp('md', d);
}

/* ---------- inline markdown ---------- */
const INL = /(`[^`\n]+`)|(\$\$[^$\n]+?\$\$)|(\$[^$\n]+?\$)|(!?\[\[[^\]\n]+\]\])|(\{\{[^}\n]+\}\})|(!?\[[^\]\n]*\]\([^)\n]*\))|(\*\*[^*\n]+?\*\*|__[^_\n]+?__)|(\*[^*\s][^*\n]*?\*)|(<!--.*?-->)|(<\/?[A-Za-z][^>\n]*>)|(\s#[A-Za-z][\w-]*)/g;
function hlLink(t) {
  const m = /^(!?\[)([^\]\n]*)(\]\()([^)\n]*)(\))$/.exec(t);
  return m ? sp('mu', m[1]) + sp('lt', m[2]) + sp('mu', m[3]) + sp('url', m[4]) + sp('mu', m[5]) : esc(t);
}
function hlInline(s) {
  let out = '', last = 0, m; INL.lastIndex = 0;
  while ((m = INL.exec(s))) {
    if (m.index > last) out += esc(s.slice(last, m.index));
    const t = m[0];
    if (m[1]) out += sp('ic', t);
    else if (m[2] || m[3]) out += hlMathInline(t);
    else if (m[4]) out += sp('wl', t);
    else if (m[5]) out += sp('gl', t);
    else if (m[6]) out += hlLink(t);
    else if (m[7]) out += sp('b', t);
    else if (m[8]) out += sp('it', t);
    else if (m[9]) out += sp('cm', t);
    else if (m[10]) out += sp('ht', t);
    else out += esc(t[0]) + sp('tg', t.slice(1));
    last = INL.lastIndex;
  }
  return out + esc(s.slice(last));
}

/* ---------- blok ```flow ---------- */
function hlDirective(rest) { return rest.split(' | ').map(p => hlCode(p, 'flow')).join(sp('mu', ' | ')); }
function hlFlowLine(line) {
  if (/^\s*$/.test(line)) return esc(line);
  if (/^\s*#/.test(line)) return sp('cm', line);
  let m = /^(\s*)(param|view|plot|conv|out|derive|curve|seed)(:)(.*)$/i.exec(line);
  if (m) return esc(m[1]) + sp('key', m[2] + m[3]) + hlDirective(m[4]);
  let body = line, tail = '';
  const am = /^(.*?)(\s*->\s*)(\w+)(\s*)$/.exec(line);
  if (am) { body = am[1]; tail = sp('mu', am[2]) + sp('id', am[3]) + esc(am[4]); }
  m = /^(\s*)(\w+)(\s*)(\[)(\w+)(\])(\s*)(.*)$/.exec(body);
  if (m) {
    const t = m[8], i = t.lastIndexOf(' | ');
    const rest = i >= 0 ? hlInline(t.slice(0, i)) + sp('mu', ' | ') + hlCode(t.slice(i + 3), 'flow') : hlInline(t);
    return esc(m[1]) + sp('id', m[2]) + esc(m[3]) + sp('mu', '[') + sp('type', m[5]) + sp('mu', ']') + esc(m[7]) + rest + tail;
  }
  return hlCode(line, 'flow');
}

/* ---------- dokumen ---------- */
function markdown(src) {
  const lines = String(src).split('\n'), out = [];
  let fence = null, inMath = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]; let m;
    if (fence) {
      m = /^(\s*)(`{3,}|~{3,})(\s*)$/.exec(line);
      if (m && m[2][0] === fence.ch && m[2].length >= fence.len) { out.push(esc(m[1]) + sp('fence', m[2]) + esc(m[3])); fence = null; }
      else out.push(fence.lang === 'flow' ? hlFlowLine(line) : hlCode(line, fence.lang));
      continue;
    }
    if (inMath) { out.push(hlMathRaw(line)); if (line.indexOf('$$') >= 0) inMath = false; continue; }
    if ((m = /^(\s*)(`{3,}|~{3,})(\s*)([^\s{]*)(.*)$/.exec(line)) && !(m[2][0] === '`' && /`/.test(m[4] + m[5]))) {
      fence = { ch: m[2][0], len: m[2].length, lang: m[4].toLowerCase().replace(/^k-/, '') };
      out.push(esc(m[1]) + sp('fence', m[2]) + esc(m[3]) + sp('lang', m[4]) + sp('mu', m[5]));
      continue;
    }
    if (/^\s*\$\$/.test(line) && (line.match(/\$\$/g) || []).length === 1) { inMath = true; out.push(hlMathRaw(line)); continue; }
    if ((m = /^(\s{0,3})(#{1,6})(\s+)(.*)$/.exec(line))) { out.push(esc(m[1]) + sp('hm', m[2]) + esc(m[3]) + '<span class="hl-h">' + hlInline(m[4]) + '</span>'); continue; }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { out.push(sp('mu', line)); continue; }
    if ((m = /^(\s*)(:{3,})(\s*)([\w-]*)(.*)$/.exec(line))) { out.push(esc(m[1]) + sp('co', m[2]) + esc(m[3]) + sp('cot', m[4]) + hlInline(m[5])); continue; }
    if ((m = /^(\s*)((?:>\s?)+)(.*)$/.exec(line))) {
      const c = /^(\[![\w-]+\][+-]?)(.*)$/.exec(m[3]);
      out.push(esc(m[1]) + sp('bq', m[2]) + (c ? sp('cot', c[1]) + hlInline(c[2]) : hlInline(m[3])));
      continue;
    }
    if ((m = /^(\s*)([-*+]|\d{1,9}[.)])(\s+)(\[[ xX]\]\s+)?(.*)$/.exec(line))) {
      out.push(esc(m[1]) + sp('li', m[2]) + esc(m[3]) + (m[4] ? sp('li', m[4]) : '') + hlInline(m[5]));
      continue;
    }
    if (/^\s*\|/.test(line)) {
      out.push(line.split('|').map(c => (/^\s*:?-{2,}:?\s*$/.test(c) ? sp('mu', c) : hlInline(c))).join(sp('mu', '|')));
      continue;
    }
    out.push(hlInline(line));
  }
  return out.join('\n');
}

/* ---------- lapisan di belakang textarea ---------- */
const MAX_CHARS = 300000, SYNC_CHARS = 60000;
function attach(ta, cb) {
  if (!ta || ta._hl) return ta && ta._hl;
  const wrap = ta.parentElement, pre = document.createElement('pre'), code = document.createElement('code');
  pre.className = 'hl-layer'; pre.setAttribute('aria-hidden', 'true'); pre.appendChild(code); wrap.insertBefore(pre, ta);
  const cs0 = getComputedStyle(ta);
  let on = true; try { on = localStorage.getItem('tw-highlight') !== '0'; } catch (_) {}
  let raf = 0, bg = cs0.backgroundColor, fg = cs0.color;

  const styleSync = () => {
    const cs = getComputedStyle(ta);
    ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight', 'tabSize', 'paddingTop', 'paddingLeft', 'paddingBottom',
     'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderRadius'].forEach(k => { pre.style[k] = cs[k]; });
    const sb = ta.offsetWidth - ta.clientWidth - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);   // lebar scrollbar textarea
    pre.style.paddingRight = (parseFloat(cs.paddingRight) + Math.max(0, sb)) + 'px';
    pre.style.background = bg;
  };
  const scrollSync = () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; };
  const setStale = s => { ta.classList.toggle('hl-stale', s); pre.classList.toggle('hl-hidden', s); };
  const render = () => {
    raf = 0; if (!on) return;
    const v = ta.value;
    if (v.length > MAX_CHARS) { code.textContent = ''; setStale(true); return; }     // dokumen sangat besar: tampil polos
    const t0 = performance.now();
    code.innerHTML = markdown(v) + '\u200b';                                          // \u200b agar baris kosong terakhir ikut terhitung
    api.lastMs = performance.now() - t0;
    styleSync(); scrollSync(); setStale(false);
  };
  const refresh = (now) => {
    if (!on) return;
    if (now || ta.value.length < SYNC_CHARS) { if (raf) cancelAnimationFrame(raf); render(); }
    else { setStale(true); if (!raf) raf = requestAnimationFrame(render); }         // dokumen besar: tunda satu frame, teks asli tampil dulu
  };
  const set = v => {
    on = !!v; try { localStorage.setItem('tw-highlight', on ? '1' : '0'); } catch (_) {}
    ta.classList.toggle('hl-on', on); pre.classList.toggle('hl-off', !on); if (cb) cb.checked = on;
    if (on) { bg = bg; render(); } else setStale(false);
  };

  ta.style.setProperty('--hl-fg', fg); ta.style.caretColor = fg;
  ta.spellcheck = false;
  ta.addEventListener('input', () => refresh(false));
  ta.addEventListener('scroll', scrollSync, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(() => { if (on) { styleSync(); scrollSync(); } }).observe(ta);
  const d = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');      // ta.value = '...' dari kode lain -> ikut diwarnai
  Object.defineProperty(ta, 'value', { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, v); refresh(true); } });
  const srt = ta.setRangeText; ta.setRangeText = function () { const r = srt.apply(this, arguments); refresh(false); return r; };
  if (cb) cb.addEventListener('change', () => set(cb.checked));
  const api = { refresh: () => refresh(true), set, pre, lastMs: 0 };
  ta._hl = api; set(on);
  return api;
}

root.TWHighlight = { markdown, attach };
if (typeof module !== 'undefined' && module.exports) module.exports = root.TWHighlight;
})(typeof window !== 'undefined' ? window : globalThis);
