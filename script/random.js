/* ==========================================================================
   random.js — angka acak berbenih (seeded) + keluarga distribusi peluang
   Dipakai oleh flow-engine.js (fungsi acak di kode node, view histogram) dan script.js (variabel acak \rv).
   API global:  TWRandom
     hashSeed(str) -> uint32          nextU(holder, key='__s') -> U[0,1)   (state disimpan di holder[key])
     make(nama, [argumen])            -> objek distribusi {pdf, cdf, inv, sample(rng), mean, variance, support, discrete, label}
     parseCall('Normal(mu, 2)')       -> {name:'Normal', args:['mu','2']}
     engineFns(getHolder)             -> fungsi untuk kode flow: random, normal, binomial, ..., choice, shuffle, times + pdf/cdf/inv
     flatFns                          -> normpdf, normcdf, norminv, binompmf, ... (tanpa fungsi pengacak; aman utk ekspresi reaktif)
     hist(data, bins, lo, hi)         -> {edges, counts, density, width, n}
   Distribusi: Normal, LogNormal, Uniform, Exponential, Bernoulli, Binomial, Poisson, Geometric.
   Semua sampel dibuat dengan inversi CDF (inv(u)), sehingga u yang sama selalu memberi hasil yang monoton terhadap parameter.
   ========================================================================== */
(function (root) {
'use strict';

/* ---------- PRNG (mulberry32; state int32 disimpan di objek pemegang agar ikut ter-clone/undo) ---------- */
function hashSeed(s) {                      // FNV-1a 32 bit
  s = String(s); let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function nextU(h, key) {
  key = key || '__s';
  let a = (h[key] === undefined ? 0 : h[key]) | 0;
  a = (a + 0x6D2B79F5) | 0; h[key] = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const clampU = u => Math.min(Math.max(u, 2.3e-10), 1 - 2.3e-10);

/* ---------- fungsi khusus ---------- */
function erfcCF(x) {                        // x >= 3: pecahan lanjut
  let f = 0; for (let k = 300; k >= 1; k--) f = (k / 2) / (x + f);
  return Math.exp(-x * x) / Math.sqrt(Math.PI) / (x + f);
}
function erf(x) {
  const ax = Math.abs(x);
  if (ax < 3) {                             // deret Maclaurin
    let sum = ax, term = ax; const x2 = ax * ax;
    for (let n = 1; n < 300; n++) { term *= -x2 / n; const d = term / (2 * n + 1); sum += d; if (Math.abs(d) < 1e-17 * Math.abs(sum)) break; }
    const r = 2 / Math.sqrt(Math.PI) * sum; return x < 0 ? -r : r;
  }
  const r = 1 - erfcCF(ax); return x < 0 ? -r : r;
}
function erfc(x) { return x < 0 ? 2 - erfc(-x) : x < 1.5 ? 1 - erf(x) : erfcCF(x); }
const normcdf01 = z => 0.5 * erfc(-z / Math.SQRT2);
function norminv01(p) {                     // Acklam + satu langkah Halley
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pl = 0.02425; let x;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  else if (p <= 1 - pl) { const q = p - 0.5, r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  else { const q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const e = normcdf01(x) - p, u = e * Math.sqrt(2 * Math.PI) * Math.exp(x * x / 2);
  return x - u / (1 + x * u / 2);
}
const LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function lgamma(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
  x -= 1; let a = LG[0]; const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LG[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
const lchoose = (n, k) => lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);
const isInt = k => Math.abs(k - Math.round(k)) < 1e-9;

/* ---------- keluarga distribusi ---------- */
function bad(msg) { throw new Error(msg); }
function discreteInv(pmf, lo, hi) {         // inversi CDF diskret: k terkecil dengan F(k) >= q
  return q => {
    if (q <= 0) return lo; if (q >= 1) return hi;
    let s = 0;
    for (let k = lo; k <= hi; k++) { s += pmf(k); if (s >= q - 1e-12) return k; if (k - lo > 5e6) break; }
    return hi;
  };
}
function discreteCdf(pmf, lo, hi) {
  return x => { if (x < lo) return 0; const m = Math.min(Math.floor(x), hi); let s = 0; for (let k = lo; k <= m; k++) s += pmf(k); return Math.min(1, s); };
}

const FAM = {
  normal: { names: ['normal', 'gauss', 'n'], pre: 'norm', params: ['mu', 'sigma'], def: [0, 1], discrete: false,
    make(mu, s) {
      if (!(s > 0)) bad('Normal: sigma harus > 0');
      return { pdf: x => Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI)), cdf: x => normcdf01((x - mu) / s),
               inv: p => mu + s * norminv01(p), mean: mu, variance: s * s, support: [-Infinity, Infinity] };
    } },
  lognormal: { names: ['lognormal', 'lognorm'], pre: 'lognorm', params: ['mu', 'sigma'], def: [0, 1], discrete: false,
    make(mu, s) {
      if (!(s > 0)) bad('LogNormal: sigma harus > 0');
      return { pdf: x => x > 0 ? Math.exp(-0.5 * ((Math.log(x) - mu) / s) ** 2) / (x * s * Math.sqrt(2 * Math.PI)) : 0,
               cdf: x => x > 0 ? normcdf01((Math.log(x) - mu) / s) : 0, inv: p => Math.exp(mu + s * norminv01(p)),
               mean: Math.exp(mu + s * s / 2), variance: (Math.exp(s * s) - 1) * Math.exp(2 * mu + s * s), support: [0, Infinity] };
    } },
  uniform: { names: ['uniform', 'unif', 'u'], pre: 'unif', params: ['a', 'b'], def: [0, 1], discrete: false,
    make(a, b) {
      if (!(b > a)) bad('Uniform: b harus > a');
      return { pdf: x => x >= a && x <= b ? 1 / (b - a) : 0, cdf: x => x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a), inv: p => a + p * (b - a),
               mean: (a + b) / 2, variance: (b - a) ** 2 / 12, support: [a, b] };
    } },
  exponential: { names: ['exponential', 'exp', 'expon'], pre: 'exp', params: ['rate'], def: [1], discrete: false,
    make(r) {
      if (!(r > 0)) bad('Exponential: rate harus > 0');
      return { pdf: x => x >= 0 ? r * Math.exp(-r * x) : 0, cdf: x => x > 0 ? -Math.expm1(-r * x) : 0, inv: p => p >= 1 ? Infinity : -Math.log1p(-p) / r,
               mean: 1 / r, variance: 1 / (r * r), support: [0, Infinity] };
    } },
  bernoulli: { names: ['bernoulli', 'bern'], pre: 'bern', params: ['p'], def: [0.5], discrete: true,
    make(p) {
      if (!(p >= 0 && p <= 1)) bad('Bernoulli: p harus di [0, 1]');
      return { pdf: k => k === 0 ? 1 - p : k === 1 ? p : 0, cdf: x => x < 0 ? 0 : x < 1 ? 1 - p : 1, inv: q => q <= 1 - p ? 0 : 1,
               mean: p, variance: p * (1 - p), support: [0, 1] };
    } },
  binomial: { names: ['binomial', 'binom'], pre: 'binom', params: ['n', 'p'], def: [10, 0.5], discrete: true,
    make(n, p) {
      if (!(isInt(n) && n >= 0 && n <= 5000)) bad('Binomial: n harus bilangan bulat 0..5000');
      if (!(p >= 0 && p <= 1)) bad('Binomial: p harus di [0, 1]');
      n = Math.round(n);
      const pmf = k => !isInt(k) || k < 0 || k > n ? 0 : p === 0 ? +(k === 0) : p === 1 ? +(k === n) : Math.exp(lchoose(n, Math.round(k)) + k * Math.log(p) + (n - k) * Math.log1p(-p));
      return { pdf: pmf, cdf: discreteCdf(pmf, 0, n), inv: discreteInv(pmf, 0, n), mean: n * p, variance: n * p * (1 - p), support: [0, n] };
    } },
  poisson: { names: ['poisson', 'pois'], pre: 'poisson', params: ['lambda'], def: [1], discrete: true,
    make(l) {
      if (!(l > 0 && l <= 5000)) bad('Poisson: lambda harus di (0, 5000]');
      const pmf = k => !isInt(k) || k < 0 ? 0 : Math.exp(-l + k * Math.log(l) - lgamma(k + 1));
      return { pdf: pmf, cdf: discreteCdf(pmf, 0, Infinity), inv: discreteInv(pmf, 0, Infinity), mean: l, variance: l, support: [0, Infinity] };
    } },
  geometric: { names: ['geometric', 'geom'], pre: 'geom', params: ['p'], def: [0.5], discrete: true,
    make(p) {
      if (!(p > 0 && p <= 1)) bad('Geometric: p harus di (0, 1]');
      const pmf = k => !isInt(k) || k < 1 ? 0 : Math.pow(1 - p, k - 1) * p;
      return { pdf: pmf, cdf: x => x < 1 ? 0 : 1 - Math.pow(1 - p, Math.floor(x)), inv: q => q <= 0 ? 1 : q >= 1 ? Infinity : p === 1 ? 1 : Math.max(1, Math.ceil(Math.log1p(-q) / Math.log1p(-p) - 1e-12)),
               mean: 1 / p, variance: (1 - p) / (p * p), support: [1, Infinity] };
    } }
};
const BYNAME = {};
Object.keys(FAM).forEach(k => FAM[k].names.forEach(n => { BYNAME[n] = k; }));
const TITLE = { normal: 'Normal', lognormal: 'LogNormal', uniform: 'Uniform', exponential: 'Exponential', bernoulli: 'Bernoulli', binomial: 'Binomial', poisson: 'Poisson', geometric: 'Geometric' };

function make(name, args) {
  const key = BYNAME[String(name).trim().toLowerCase()];
  if (!key) bad('distribusi "' + name + '" tidak dikenal (tersedia: ' + Object.values(TITLE).join(', ') + ')');
  const F = FAM[key], a = F.params.map((_, i) => (args && args[i] !== undefined && args[i] !== '' ? +args[i] : F.def[i]));
  if (a.some(x => !isFinite(x))) bad(TITLE[key] + ': parameter harus angka');
  const d = F.make(...a);
  d.key = key; d.discrete = F.discrete; d.args = a; d.label = TITLE[key] + '(' + a.map(x => +x.toPrecision(6)).join(', ') + ')';
  d.sample = rng => d.inv(clampU(rng()));
  return d;
}

function splitTop(s) {                       // pisah argumen pada koma tingkat atas
  const out = []; let depth = 0, cur = '';
  for (const ch of s) {
    if ('([{'.includes(ch)) depth++; else if (')]}'.includes(ch)) depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim() !== '' || out.length) out.push(cur.trim());
  return out;
}
function parseCall(str) {
  const m = /^\s*([A-Za-z_]\w*)\s*\(([\s\S]*)\)\s*$/.exec(str);
  return m ? { name: m[1], args: splitTop(m[2]) } : null;
}

/* ---------- fungsi datar: normpdf(x, mu, sigma), binompmf(k, n, p), ... ---------- */
const flatFns = {};
Object.keys(FAM).forEach(k => {
  const F = FAM[k], P = F.pre, np = F.params.length;
  const D = a => make(k, Array.prototype.slice.call(a, 1, 1 + np));      // argumen pertama = x, sisanya parameter
  flatFns[P + (F.discrete ? 'pmf' : 'pdf')] = function (x) { return D(arguments).pdf(+x); };
  flatFns[P + 'cdf'] = function (x) { return D(arguments).cdf(+x); };
  flatFns[P + 'inv'] = function (p) { return D(arguments).inv(+p); };
});

/* ---------- fungsi untuk kode flow engine ---------- */
function engineFns(getH) {
  const U = () => { const h = getH(); return h ? nextU(h) : Math.random(); };
  const out = { random: U, rand: U };
  Object.keys(FAM).forEach(k => {
    const np = FAM[k].params.length;
    out[TITLE[k].toLowerCase()] = function () {              // normal(mu, sigma [, n])
      const a = Array.prototype.slice.call(arguments), d = make(k, a.slice(0, np)), n = a.length > np ? a[np] : undefined;
      if (n === undefined) return d.sample(U);
      if (!(n >= 0 && n <= 1e6)) bad(TITLE[k].toLowerCase() + ': jumlah sampel harus 0..1.000.000');
      return Array.from({ length: Math.floor(n) }, () => d.sample(U));
    };
  });
  out.randn = out.gauss = () => out.normal(0, 1);
  out.randint = (a, b) => { a = Math.ceil(a); b = Math.floor(b); if (b < a) bad('randint: b harus >= a'); return a + Math.floor(U() * (b - a + 1)); };
  out.choice = arr => { if (!Array.isArray(arr) || !arr.length) bad('choice: butuh larik tak kosong'); return arr[Math.floor(U() * arr.length)]; };
  out.shuffle = arr => { const r = arr.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(U() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  out.times = (n, f) => { if (!(n >= 0 && n <= 1e6)) bad('times: n harus 0..1.000.000'); return Array.from({ length: Math.floor(n) }, (_, i) => f(i)); };
  return Object.assign(out, flatFns);
}

function hist(data, bins, lo, hi) {
  const x = data.filter(isFinite);
  if (!x.length) return { edges: [], counts: [], density: [], width: 1, n: 0 };
  if (!(hi > lo)) { lo = Math.min(...x); hi = Math.max(...x); if (lo === hi) { lo -= 0.5; hi += 0.5; } }
  bins = Math.max(1, Math.floor(bins) || Math.ceil(Math.log2(x.length) + 1));
  const w = (hi - lo) / bins, counts = new Array(bins).fill(0);
  x.forEach(v => { if (v >= lo && v <= hi) counts[Math.min(bins - 1, Math.floor((v - lo) / w))]++; });
  const n = x.length;
  return { edges: Array.from({ length: bins + 1 }, (_, i) => lo + i * w), counts, density: counts.map(c => c / (n * w)), width: w, n };
}

root.TWRandom = { hashSeed, nextU, make, parseCall, splitTop, engineFns, flatFns, hist, erf, erfc, lgamma, norminv01, normcdf01, names: Object.values(TITLE) };
if (typeof module !== 'undefined' && module.exports) module.exports = root.TWRandom;
})(typeof window !== 'undefined' ? window : globalThis);
