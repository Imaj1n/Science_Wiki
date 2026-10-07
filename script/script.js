const SUPABASE_URL      = 'https://uolwxdiuzhwuxmzvtxbp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_TItLCbgxuzW6-u0-8FWFNg_pxINMNI2';
const STORAGE_BUCKET    = 'wiki-images';

const IMAGE_CONFIG = {
  // Tujuan upload gambar: 'supabase' | 'imgur' | 'cloudinary'
  // (bisa diganti lewat dropdown di toolbar editor; pilihan terakhir diingat browser)
  provider: 'supabase',

  // Kompresi di browser sebelum upload
  maxBytes: 200 * 1024,          // batas keras hasil kompresi (200 KB)
  maxSizeMB: 0.18,               // target awal ≈ 184 KB
  maxWidthOrHeight: 1600,        // sisi terpanjang (px); otomatis diperkecil lagi bila masih > maxBytes
  fileType: 'image/webp',        // 'image/webp' atau 'image/jpeg'
  initialQuality: 0.8,
  maxPassthroughBytes: 2 * 1024 * 1024, // GIF animasi tidak dikompres; tolak bila > 2 MB

  // Fallback opsional
  imgurClientId: '',             // Imgur: https://api.imgur.com/oauth2/addclient (Anonymous usage)
  cloudinaryCloudName: '',       // Cloudinary: Cloud name
  cloudinaryUploadPreset: ''     // Cloudinary: Unsigned upload preset
};

// Catatan: variabel klien dinamai `sb` (bukan `supabase`) agar tidak bentrok dengan global window.supabase dari CDN.
const SB_READY = !!window.supabase && !/YOUR-PROJECT-REF|YOUR-ANON-PUBLIC-KEY/.test(SUPABASE_URL + SUPABASE_ANON_KEY);
const sb = SB_READY ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/* ==========================================================================
    2. STATE, MAPPER (snake_case DB <-> camelCase UI) & DATA CONTOH
    ========================================================================== */
const mapVault   = r => ({ id: r.id, title: r.title, tag: r.tag || 'Umum', posterUrl: r.poster_url || '', description: r.description || '', createdAt: r.created_at });
const mapArticle = r => ({ id: r.id, vaultId: r.vault_id, folderPath: r.folder_path || 'root', title: r.title, content: r.content || '', tags: r.tags || [], updatedAt: r.updated_at });
const vaultToRow   = v => ({ id: v.id, title: v.title, tag: v.tag, poster_url: v.posterUrl, description: v.description });
const articleToRow = a => ({ id: a.id, vault_id: a.vaultId, folder_path: a.folderPath, title: a.title, content: a.content, tags: a.tags });

const SEED_VAULTS = [
  {
    id: "kuantum",
    title: "Kuantum & Komputasi Kuantum",
    tag: "Fisika Modern",
    posterUrl: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=600&q=80",
    description: "Persamaan Schrödinger, qubit, entanglement kuantum, dan gerbang logika kuantum.",
    gradient: "from-blue-600 via-indigo-900 to-slate-950"
  },
  {
    id: "mekanika",
    title: "Mekanika Klasik & Analitis",
    tag: "Fisika Teoretis",
    posterUrl: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=600&q=80",
    description: "Formulasi Lagrangian, Hamiltonian, dinamika benda tegar, dan osilasi teratur.",
    gradient: "from-amber-700 via-red-950 to-slate-950"
  }
];

const SEED_ARTICLES = [
  {
    id: "persamaan-schrodinger",
    vaultId: "kuantum",
    folderPath: "kuantum/mekanika-gelombang",
    tags: ["kuantum", "pde", "simulasi", "matematika"],
    title: "Persamaan Schrödinger & Sumur Potensial",
    content: `# Persamaan Schrödinger & Sumur Potensial\n\n**Persamaan Schrödinger** adalah persamaan diferensial parsial yang mendeskripsikan keadaan kuantum.\n\n## Formulasi Matematika\n\n$$i\\hbar \\frac{\\partial}{\\partial t} \\Psi(\\mathbf{r}, t) = \\hat{H} \\Psi(\\mathbf{r}, t)$$\n\n---\n\n## Simulasi Numerik Kuantum (Python & Matplotlib)\n\n\`\`\`python\nimport numpy as np\nimport matplotlib.pyplot as plt\n\nL = 1.0\nx = np.linspace(0, L, 200)\npsi_1 = np.sqrt(2/L) * np.sin(1 * np.pi * x / L)\n\nplt.figure(figsize=(6, 3))\nplt.plot(x, psi_1**2, label='$|\\\\Psi_1|^2$', color='gold')\nplt.title('Kerapatan Probabilitas Kuantum')\nplt.grid(True, alpha=0.3)\nplt.show()\n\`\`\``
  }
];

{
  const demo = {
    id: "parabola-interaktif", vaultId: "mekanika", folderPath: "mekanika/eksplorasi",
    tags: ["interaktif", "kalkulus", "grafik"], title: "Parabola & Garis: Eksplorasi Interaktif",
    content: `# Parabola & Garis: Eksplorasi Interaktif

Huruf bergaris titik-titik biru pada rumus bisa **ditarik ke kiri/kanan**, dan grafik berubah seketika. Arahkan kursor ke hurufnya untuk melihat nilainya saat ini.

$$f(x) = \\htmlData{param=a}{a}\\, x^2 + \\htmlData{param=c}{c}$$

$$g(x) = \\htmlData{param=m}{m}\\, x - 2$$

\`\`\`graph
a = 1 [-3, 3]
c = 0 [-5, 5]
m = 0.5 [-3, 3]
f(x) = a*x^2 + c
g(x) = m*x - 2
\`\`\`

## Apa yang terjadi?

Parameter $\\htmlData{param=a}{a}$ mengatur kelengkungan, $\\htmlData{param=c}{c}$ menggeser puncak ke atas-bawah, dan $\\htmlData{param=m}{m}$ memutar garis. Cari nilai di mana kedua kurva berpotongan.

> Tahan Ctrl dan scroll pada grafik untuk zoom, seret untuk menggeser.

## Slide Rumus: Penurunan Rumus abc

Klik **bagian kiri** rumus untuk mundur, **bagian kanan** untuk maju (atau pakai tombol ← → setelah diklik).

\`\`\`steps
title: Rumus abc
ax^2+bx+c=0 | Persamaan kuadrat
x^2+\\frac{b}{a}x+\\frac{c}{a}=0 | Jadikan koefisien utama 1.
x^2+\\frac{b}{a}x=-\\frac{c}{a} | Pindahkan konstanta ke ruas kanan.
x^2+\\frac{b}{a}x+\\frac{b^2}{4a^2}=\\frac{b^2}{4a^2}-\\frac{c}{a} | Lengkapi kuadrat: tambahkan (b/2a)² di kedua ruas.
\\left(x+\\frac{b}{2a}\\right)^2=\\frac{b^2-4ac}{4a^2} | Ruas kiri menjadi kuadrat sempurna.
x+\\frac{b}{2a}=\\pm\\frac{\\sqrt{b^2-4ac}}{2a} | Tarik akar kuadrat kedua ruas.
x=-\\frac{b}{2a}\\pm\\frac{\\sqrt{b^2-4ac}}{2a} | Pindahkan b/2a ke ruas kanan.
x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}
\`\`\``
  };
  SEED_ARTICLES.push(demo);
}

let vaults = [];
let articles = [];
let activeVaultId = null;
let currentArticleId = null;
let isAdminLoggedIn = false;   // hasil cek is_admin() di server (hanya untuk tampilan; keamanan tetap di RLS)
let currentUser = null;        // sesi Supabase Auth (admin ATAU kontributor)
let proposals = [];
let activeTagFilter = 'All';

let pyodideInstance = null;
let isPyodideLoading = false;

/* ==========================================================================
    3. LIFECYCLE & PEMUATAN DATA DARI SUPABASE
    ========================================================================== */
window.addEventListener('DOMContentLoaded', async () => {
  hljs.highlightAll();
  setupImagePasteAndDrop();
  initImageProviderUI();
  updateAdminUIState();

  if (!SB_READY) {
    showGridMessage(`
      <p class="text-base font-semibold text-slate-100 mb-2">Supabase belum dikonfigurasi</p>
      <p class="text-sm text-slate-400 leading-relaxed">Isi <code class="font-mono">SUPABASE_URL</code> dan <code class="font-mono">SUPABASE_ANON_KEY</code>
      di bagian atas &lt;script&gt; pada file ini, lalu muat ulang halaman.</p>`);
    return;
  }

  // Jangan memanggil API Supabase lain langsung di dalam callback ini (bisa deadlock) -> setTimeout.
  sb.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    setTimeout(refreshRole, 0);
  });
  const { data: { session } } = await sb.auth.getSession();
  currentUser = session?.user || null;
  await refreshRole();

  await loadData();
});

function showGridMessage(html) {
  document.getElementById('vault-filter-tags').innerHTML = '';
  document.getElementById('vaults-card-grid').innerHTML = `<div class="col-span-full max-w-xl">${html}</div>`;
}

async function loadData() {
  showGridMessage('<p class="text-sm text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-1.5"></i>Memuat data dari Supabase...</p>');
  const dot = document.getElementById('db-status-dot');

  const [vRes, aRes] = await Promise.all([
    sb.from('vaults').select('*').order('created_at', { ascending: true }),
    sb.from('articles').select('*').order('updated_at', { ascending: false })
  ]);

  if (vRes.error || aRes.error) {
    const msg = (vRes.error || aRes.error).message;
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-red-500 inline-block';
    showGridMessage(`
      <p class="text-base font-semibold text-slate-100 mb-2">Gagal memuat data</p>
      <p class="text-sm text-slate-400 font-mono break-words">${escapeHtml(msg)}</p>
      <p class="text-xs text-slate-500 mt-2">Periksa URL/key, apakah skrip SQL sudah dijalankan, dan kebijakan RLS (SELECT publik).</p>`);
    return;
  }
  if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-500 inline-block';

  vaults = vRes.data.map(mapVault);
  articles = aRes.data.map(mapArticle);

  if (!vaults.some(v => v.id === activeVaultId)) activeVaultId = vaults[0]?.id || null;
  currentArticleId = (articles.find(a => a.vaultId === activeVaultId) || articles[0])?.id || null;

  renderVaultsGrid();
  renderVaultSelectOptions();
  renderSidebarTagChips();
  renderFolderTreeNav();
  if (currentArticleId) displayArticle(currentArticleId);
  routeFromHash();   // buka artikel dari URL #/a/<id> kalau ada
}

async function seedSampleData() {
  if (!isAdminLoggedIn) { promptAdminLogin(); return; }
  if (!confirm('Isi database dengan vault & artikel contoh? (data dengan ID yang sama akan ditimpa)')) return;
  const v = await sb.from('vaults').upsert(SEED_VAULTS.map(vaultToRow), { onConflict: 'id' });
  if (v.error) { alert('Gagal menyimpan vault: ' + v.error.message); return; }
  const a = await sb.from('articles').upsert(SEED_ARTICLES.map(articleToRow), { onConflict: 'id' });
  if (a.error) { alert('Gagal menyimpan artikel: ' + a.error.message); return; }
  await loadData();
}

/* ==========================================================================
    4. GAMBAR: KOMPRESI -> UPLOAD (Supabase / Imgur / Cloudinary) -> SISIPKAN ![alt](URL)
    ========================================================================== */
function setImgStatus(msg, tone) {
  const el = document.getElementById('img-upload-status');
  if (!el) return;
  el.textContent = msg || '';
  el.className = 'text-[11px] font-mono ' + (tone === 'err' ? 'text-red-400' : tone === 'ok' ? 'text-emerald-400' : 'text-slate-500');
}

function initImageProviderUI() {
  let saved = null;
  try { saved = localStorage.getItem('wiki_img_provider'); } catch (e) {}
  if (saved && ['supabase', 'imgur', 'cloudinary'].includes(saved)) IMAGE_CONFIG.provider = saved;
  const sel = document.getElementById('img-provider-select');
  if (sel) sel.value = IMAGE_CONFIG.provider;
}

function setImageProvider(value) {
  if (value === 'imgur' && !IMAGE_CONFIG.imgurClientId) {
    alert('Isi IMGUR Client ID di IMAGE_CONFIG.imgurClientId terlebih dahulu.');
    document.getElementById('img-provider-select').value = IMAGE_CONFIG.provider;
    return;
  }
  if (value === 'cloudinary' && !(IMAGE_CONFIG.cloudinaryCloudName && IMAGE_CONFIG.cloudinaryUploadPreset)) {
    alert('Isi cloudinaryCloudName dan cloudinaryUploadPreset di IMAGE_CONFIG terlebih dahulu.');
    document.getElementById('img-provider-select').value = IMAGE_CONFIG.provider;
    return;
  }
  IMAGE_CONFIG.provider = value;
  try { localStorage.setItem('wiki_img_provider', value); } catch (e) {}
}

const fmtKB = n => Math.round(n / 1024) + ' KB';

/* a) Kompres di memori browser. Hasil <= maxBytes (WebP, fallback JPEG). */
async function compressImage(file) {
  if (file.type === 'image/svg+xml') throw new Error('SVG tidak didukung; gunakan PNG/JPEG/WebP.');
  if (file.type === 'image/gif') {                      // animasi hilang jika dikompres -> unggah apa adanya
    if (file.size > IMAGE_CONFIG.maxPassthroughBytes) throw new Error('GIF terlalu besar (maks ' + fmtKB(IMAGE_CONFIG.maxPassthroughBytes) + ').');
    return file;
  }
  if (typeof imageCompression !== 'function') throw new Error('Pustaka browser-image-compression gagal dimuat.');

  let type = IMAGE_CONFIG.fileType;
  let out = file;
  for (const dim of [IMAGE_CONFIG.maxWidthOrHeight, 1280, 1024, 800]) {
    out = await imageCompression(file, {
      maxSizeMB: IMAGE_CONFIG.maxSizeMB,
      maxWidthOrHeight: dim,
      useWebWorker: true,
      fileType: type,
      initialQuality: IMAGE_CONFIG.initialQuality
    });
    if (out.size <= IMAGE_CONFIG.maxBytes) break;
    if (out.type === 'image/png') type = 'image/jpeg';  // browser tanpa encoder WebP jatuh ke PNG -> paksa JPEG
  }
  return out;
}

async function hashBlob(blob) {
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

const extFromType = t => ({ 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' }[t] || 'bin');

/* b) Upload. Nama file = hash isi -> gambar identik tidak disimpan dua kali. */
async function uploadToSupabase(blob) {
  // admin -> img/ ; kontributor -> u/<user-id>/ (dibatasi policy storage)
  const folder = isAdminLoggedIn ? 'img' : `u/${currentUser.id}`;
  const path = `${folder}/${await hashBlob(blob)}.${extFromType(blob.type)}`;
  const { error } = await sb.storage.from(STORAGE_BUCKET).upload(path, blob, {
    contentType: blob.type,
    cacheControl: '31536000',   // cache 1 tahun -> hemat egress
    upsert: false
  });
  const duplicate = error && (String(error.statusCode) === '409' || /already exists|duplicate/i.test(error.message || ''));
  if (error && !duplicate) throw new Error(error.message);
  return sb.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

/* c) Fallback: Imgur / Cloudinary */
async function uploadToImgur(blob) {
  const fd = new FormData();
  fd.append('image', blob);
  fd.append('type', 'file');
  const res = await fetch('https://api.imgur.com/3/image', { method: 'POST', headers: { Authorization: 'Client-ID ' + IMAGE_CONFIG.imgurClientId }, body: fd });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json?.data?.error?.message || json?.data?.error || 'Upload Imgur gagal');
  return json.data.link;
}

async function uploadToCloudinary(blob) {
  const fd = new FormData();
  fd.append('file', blob);
  fd.append('upload_preset', IMAGE_CONFIG.cloudinaryUploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(IMAGE_CONFIG.cloudinaryCloudName)}/image/upload`, { method: 'POST', body: fd });
  const json = await res.json();
  if (!res.ok || !json.secure_url) throw new Error(json?.error?.message || 'Upload Cloudinary gagal');
  return json.secure_url;
}

function uploadImage(blob) {
  switch (IMAGE_CONFIG.provider) {
    case 'imgur': return uploadToImgur(blob);
    case 'cloudinary': return uploadToCloudinary(blob);
    default: return uploadToSupabase(blob);
  }
}

function altFromFile(file) {
  const base = (file.name || '').replace(/\.[^.]+$/, '').replace(/[\[\]()]/g, ' ').replace(/[-_]+/g, ' ').trim();
  return (!base || /^image\d*$/i.test(base)) ? 'gambar' : base;
}

/* d) Sisipkan di posisi kursor: placeholder dulu, lalu diganti URL final */
async function handleImageFiles(files) {
  if (!currentUser && IMAGE_CONFIG.provider === 'supabase') { promptAdminLogin(); return; }
  const ta = document.getElementById('editor-content');

  for (const file of files) {
    const token = `![mengunggah-${Math.random().toString(36).slice(2, 8)}]()`;
    const pos = ta.selectionStart;
    ta.value = ta.value.slice(0, pos) + '\n' + token + '\n' + ta.value.slice(ta.selectionEnd);
    ta.selectionStart = ta.selectionEnd = pos + token.length + 2;

    try {
      setImgStatus('Mengompres ' + (file.name || 'gambar') + '...');
      const blob = await compressImage(file);
      setImgStatus('Mengunggah (' + fmtKB(file.size) + ' → ' + fmtKB(blob.size) + ')...');
      const url = await uploadImage(blob);
      const md = `![${altFromFile(file)}](${url})`;
      ta.value = ta.value.replace(token, () => md);
      const saved = Math.max(0, Math.round((1 - blob.size / file.size) * 100));
      setImgStatus('Selesai: ' + fmtKB(file.size) + ' → ' + fmtKB(blob.size) + ' (hemat ' + saved + '%)', 'ok');
    } catch (err) {
      ta.value = ta.value.replace('\n' + token + '\n', () => '').replace(token, () => '');
      setImgStatus('Gagal: ' + err.message, 'err');
    }
    updateLivePreview();
  }
}

function setupImagePasteAndDrop() {
  const editorArea = document.getElementById('editor-content');
  if (!editorArea) return;

  editorArea.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    const files = [];
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) files.push(item.getAsFile());
    }
    if (files.length) { e.preventDefault(); handleImageFiles(files); }
  });

  editorArea.addEventListener('dragover', (e) => e.preventDefault());
  editorArea.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length) { e.preventDefault(); handleImageFiles(files); }
  });
}

function handleFileSelectImage(e) {
  const files = Array.from(e.target.files || []);
  e.target.value = '';
  if (files.length) handleImageFiles(files);
}

/* ==========================================================================
    5. AKUN (Supabase Auth: email + password). Admin = email di is_admin(); akun lain = kontributor.
    ========================================================================== */
let authMode = 'login';

async function refreshRole() {
  isAdminLoggedIn = false;
  if (currentUser) {
    const { data } = await sb.rpc('is_admin');
    isAdminLoggedIn = data === true;
  }
  updateAdminUIState();
  if (currentUser) await loadProposals();
  else {
    proposals = []; updateProposalBadge();
    const pv = document.getElementById('view-proposals');
    if (pv && !pv.classList.contains('hidden')) showVaultsGrid();
  }
}

function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === 'signup';
  document.getElementById('auth-name-input').classList.toggle('hidden', !signup);
  document.getElementById('auth-title').textContent = signup ? 'Buat Akun' : 'Masuk';
  document.getElementById('auth-subtitle').textContent = signup
    ? 'Akun kontributor bisa mengirim usulan artikel & gambar untuk ditinjau admin.'
    : 'Masuk untuk mengusulkan perubahan (admin: langsung menulis).';
  document.getElementById('auth-submit-text').textContent = signup ? 'Daftar' : 'Masuk';
  document.getElementById('auth-switch-btn').textContent = signup ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar';
  document.getElementById('admin-login-error').classList.add('hidden');
}

function showAuthMsg(msg, ok) {
  const el = document.getElementById('admin-login-error');
  el.textContent = msg;
  el.className = 'text-[11px] text-center ' + (ok ? 'text-emerald-400' : 'text-red-400');
}

async function promptAdminLogin() {
  if (!SB_READY) { alert('Supabase belum dikonfigurasi.'); return; }
  if (currentUser) {
    if (confirm('Keluar dari akun ' + (currentUser.email || '') + '?')) await sb.auth.signOut();
  } else {
    setAuthMode('login');
    document.getElementById('admin-modal').classList.remove('hidden');
    document.getElementById('admin-email-input').focus();
  }
}

function closeAdminModal() {
  document.getElementById('admin-modal').classList.add('hidden');
  document.getElementById('admin-password-input').value = '';
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('admin-email-input').value.trim();
  const password = document.getElementById('admin-password-input').value;

  if (authMode === 'signup') {
    const name = document.getElementById('auth-name-input').value.trim();
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name } } });
    if (error) { showAuthMsg('Pendaftaran gagal: ' + error.message, false); return; }
    if (!data.session) { showAuthMsg('Akun dibuat. Cek email untuk konfirmasi, lalu masuk.', true); return; }
    closeAdminModal();
    return;
  }
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { showAuthMsg('Login gagal: ' + error.message, false); return; }
  closeAdminModal();
}

function displayName() {
  return currentUser?.user_metadata?.name || (currentUser?.email || '').split('@')[0] || 'kontributor';
}

function updateAdminUIState() {
  document.body.classList.toggle('is-admin', isAdminLoggedIn);
  document.body.classList.toggle('is-user', !!currentUser);
  const statusBadge = document.getElementById('admin-status-badge');
  const statusText = document.getElementById('admin-status-text');
  const lockIcon = document.getElementById('admin-lock-icon');
  const editLabel = document.getElementById('reader-edit-label');
  if (editLabel) editLabel.textContent = isAdminLoggedIn ? 'Edit Artikel' : 'Usulkan Edit';

  const base = 'px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition flex items-center space-x-1.5 ';
  if (isAdminLoggedIn) {
    statusText.textContent = 'Admin Active';
    statusBadge.className = base + 'bg-amber-500/20 border-amber-500/40 text-amber-400';
    lockIcon.className = 'fa-solid fa-unlock text-amber-400';
  } else if (currentUser) {
    statusText.textContent = displayName();
    statusBadge.className = base + 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    lockIcon.className = 'fa-solid fa-user text-emerald-400';
  } else {
    statusText.textContent = 'Masuk / Daftar';
    statusBadge.className = base + 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white';
    lockIcon.className = 'fa-solid fa-lock text-slate-500';
  }
}


/* ==========================================================================
    5. PYODIDE WASM ENGINE
    ========================================================================== */
async function initPyodideEngine() {
  if (pyodideInstance) return pyodideInstance;
  if (isPyodideLoading) {
    while (isPyodideLoading) {
      await new Promise(r => setTimeout(r, 200));
    }
    return pyodideInstance;
  }

  isPyodideLoading = true;

  if (!window.loadPyodide) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  pyodideInstance = await loadPyodide();
  await pyodideInstance.loadPackage(["numpy", "matplotlib", "pandas", "scipy"]);
  
  await pyodideInstance.runPythonAsync(`
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io, base64
  `);

  isPyodideLoading = false;
  return pyodideInstance;
}

async function executePythonCode(code, outputElementId) {
  const outputEl = document.getElementById(outputElementId);
  outputEl.innerHTML = '<span class="text-amber-400 font-mono animate-pulse"><i class="fa-solid fa-spinner fa-spin mr-1.5"></i>Memuat Pyodide WASM...</span>';

  try {
    const pyodide = await initPyodideEngine();
    
    pyodide.runPython(`
import sys
import io
sys.stdout = io.StringIO()
plt.close('all')
    `);

    await pyodide.runPythonAsync(code);

    const stdout = pyodide.runPython(`sys.stdout.getvalue()`);

    const hasPlot = pyodide.runPython([
  'img_str = ""',
  'if len(plt.get_fignums()) > 0:',
  '    buf = io.BytesIO()',
  "    plt.savefig(buf, format='png', bbox_inches='tight')",
  '    buf.seek(0)',
  "    img_str = base64.b64encode(buf.read()).decode('utf-8')",
  "    plt.close('all')",
  'img_str'
].join('\n'));

    let resultHTML = "";
    if (stdout) {
      resultHTML += `<div class="mb-2 text-slate-200">${escapeHtml(stdout)}</div>`;
    }
    if (hasPlot) {
      resultHTML += `<img src="data:image/png;base64,${hasPlot}" class="max-w-full rounded-lg border border-slate-800 my-2 shadow-lg" />`;
    }

    if (!stdout && !hasPlot) {
      resultHTML = `<span class="text-slate-500 italic">[Kode berhasil dieksekusi tanpa output]</span>`;
    }

    outputEl.innerHTML = resultHTML;

  } catch (err) {
    outputEl.innerHTML = `<span class="text-red-400 font-mono">[Error]: ${escapeHtml(err.message)}</span>`;
  }
}

/* ==========================================================================
    6. NAVIGATION & VAULTS RENDERING
    ========================================================================== */
const mq = q => window.matchMedia ? window.matchMedia(q) : { matches: true, addEventListener() {} };
const desktopMQ = mq('(min-width:1024px)');

// Desktop: sidebar bisa disembunyikan. HP/tablet: sidebar menjadi laci (drawer) di atas konten.
function toggleSidebar() {
  const side = document.getElementById('wiki-sidebar');
  if (desktopMQ.matches) { side.classList.toggle('collapsed'); return; }
  const open = side.classList.toggle('open');
  document.getElementById('sidebar-backdrop').classList.toggle('show', open);
}

function closeSidebarMobile() {
  if (desktopMQ.matches) return;
  document.getElementById('wiki-sidebar').classList.remove('open');
  document.getElementById('sidebar-backdrop').classList.remove('show');
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  const activeTab = document.getElementById(`view-${tabId}`);
  if (activeTab) activeTab.classList.remove('hidden');

  closeSidebarMobile();
  if (tabId === 'proposals') refreshProposalsView();
  if (tabId === 'editor') updateLivePreview();
  window.scrollTo(0, 0);
}

function showVaultsGrid() {
  renderVaultsGrid();
  switchTab('vaults-grid');
}

function renderVaultsGrid(filterTag = 'All') {
  const grid = document.getElementById('vaults-card-grid');
  const tagsContainer = document.getElementById('vault-filter-tags');
  grid.innerHTML = '';
  tagsContainer.innerHTML = '';

  const tags = ['All', ...new Set(vaults.map(v => v.tag))];
  tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.onclick = () => renderVaultsGrid(tag);
    const isActive = filterTag === tag;
    btn.className = `pb-1 text-xs tracking-wide uppercase font-semibold border-b-2 transition ${
      isActive ? 'text-slate-100 border-amber-400' : 'text-slate-400 border-transparent hover:text-slate-100'
    }`;
    btn.textContent = tag;
    tagsContainer.appendChild(btn);
  });

  if (!vaults.length) {
    grid.innerHTML = '<div class="col-span-full text-sm text-slate-400">Belum ada vault. <button onclick="seedSampleData()" class="admin-only mp-add ml-2">Isi dengan data contoh</button></div>';
    return;
  }

  const filteredVaults = filterTag === 'All' ? vaults : vaults.filter(v => v.tag === filterTag);

  filteredVaults.forEach(vault => {
    const count = articles.filter(a => a.vaultId === vault.id).length;
    const card = document.createElement('div');
    card.className = "poster-card group cursor-pointer";
    card.onclick = () => openVault(vault.id);
    card.innerHTML = `
      <div class="relative overflow-hidden bg-slate-800 aspect-[4/3]">
        <button type="button" class="vault-edit-btn admin-only"><i class="fa-solid fa-pen mr-1"></i>Edit</button>
        <img src="${escapeHtml(vault.posterUrl)}" loading="lazy" class="w-full h-full object-cover group-hover:scale-[1.03] transition duration-700" alt="${escapeHtml(vault.title)}">
      </div>
      <div class="mt-4 text-[11px] font-semibold tracking-[0.16em] uppercase text-amber-400">${escapeHtml(vault.tag)}</div>
      <h3 class="mt-1.5 text-2xl font-display font-semibold leading-snug text-slate-100 group-hover:text-amber-400 transition">${escapeHtml(vault.title)}</h3>
      <p class="mt-2 text-[15px] font-display text-slate-400 leading-relaxed line-clamp-3">${escapeHtml(vault.description)}</p>
      <div class="mt-3 text-xs font-mono text-slate-500">${count} artikel</div>
    `;
    card.querySelector('.vault-edit-btn').onclick = (e) => { e.stopPropagation(); openEditVaultModal(vault.id); };
    grid.appendChild(card);
  });
}

function openVault(vaultId) {
  activeVaultId = vaultId;
  document.getElementById('sidebar-vault-select').value = vaultId;
  const firstArticle = articles.find(a => a.vaultId === vaultId);
  if (firstArticle) displayArticle(firstArticle.id);
  renderFolderTreeNav();
  switchTab('reader');
}

function switchVault(vaultId) {
  activeVaultId = vaultId;
  renderFolderTreeNav();
  const firstArticle = articles.find(a => a.vaultId === vaultId);
  if (firstArticle) displayArticle(firstArticle.id);
}

function renderVaultSelectOptions() {
  const select = document.getElementById('sidebar-vault-select');
  const editorSelect = document.getElementById('editor-vault');
  select.innerHTML = '';
  editorSelect.innerHTML = '';

  vaults.forEach(v => {
    const opt1 = document.createElement('option');
    opt1.value = v.id; opt1.textContent = v.title;
    select.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = v.id; opt2.textContent = v.title;
    editorSelect.appendChild(opt2);
  });

  select.value = activeVaultId;
}

function renderSidebarTagChips() {
  const container = document.getElementById('sidebar-tag-chips');
  container.innerHTML = '';

  const allTags = ['All', ...new Set(articles.flatMap(a => a.tags || []))];
  allTags.forEach(tag => {
    const chip = document.createElement('button');
    const isActive = activeTagFilter === tag;
    chip.onclick = () => {
      activeTagFilter = tag;
      renderSidebarTagChips();
      renderFolderTreeNav();
    };
    chip.className = `text-[10px] px-2 py-0.5 rounded-full border font-mono transition ${
      isActive 
        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400' 
        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
    }`;
    chip.textContent = tag === 'All' ? 'Semua Tag' : `#${tag}`;
    container.appendChild(chip);
  });
}

function renderFolderTreeNav(searchQuery = '') {
  const container = document.getElementById('folder-tree-nav');
  container.innerHTML = '';

  let vaultArticles = articles.filter(a => a.vaultId === activeVaultId);
  
  if (activeTagFilter !== 'All') {
    vaultArticles = vaultArticles.filter(a => a.tags && a.tags.includes(activeTagFilter));
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    vaultArticles = vaultArticles.filter(a => 
      a.title.toLowerCase().includes(q) ||
      a.content.toLowerCase().includes(q) ||
      (a.folderPath && a.folderPath.toLowerCase().includes(q)) ||
      (a.tags && a.tags.some(t => t.toLowerCase().includes(q)))
    );
  }

  if (vaultArticles.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-500 italic p-2">Tidak ada artikel ditemukan.</p>';
    return;
  }

  const tree = {};
  vaultArticles.forEach(art => {
    const folder = art.folderPath || 'root';
    if (!tree[folder]) tree[folder] = [];
    tree[folder].push(art);
  });

  Object.keys(tree).forEach(folderPath => {
    const folderHeader = document.createElement('div');
    folderHeader.className = "text-[11px] font-bold text-slate-500 flex items-center gap-1 mt-2 mb-1 px-1";
    folderHeader.innerHTML = `<i class="fa-regular fa-folder text-amber-500"></i><span>docs/${escapeHtml(folderPath)}</span>`;
    container.appendChild(folderHeader);

    tree[folderPath].forEach(art => {
      const isActive = art.id === currentArticleId;
      const btn = document.createElement('button');
      btn.onclick = () => {
        displayArticle(art.id);
        switchTab('reader');
      };
      btn.className = `w-full text-left pl-4 pr-2 py-1.5 rounded text-xs transition flex items-center justify-between ${
        isActive 
          ? 'bg-amber-500/10 text-amber-400 font-semibold border-l-2 border-amber-500' 
          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
      }`;
      
      btn.innerHTML = `<span class="truncate"><i class="fa-regular fa-file-lines mr-1.5 opacity-60"></i>${escapeHtml(art.title)}</span>`;
      container.appendChild(btn);
    });
  });
}

/* ==========================================================================
    7. MARKDOWN & LATEX RENDERER
    ========================================================================== */
/* ===== INTERACTIVE MATH: blok ```graph + parameter yang bisa di-drag ===== */
const MP_COLORS=['#2563eb','#d9480f','#0f9d6b','#9333ea','#b7791f'];
const mpNice=r=>{const p=Math.pow(10,Math.floor(Math.log10(r))),f=r/p;return(f<1.5?1:f<3.5?2:f<7.5?5:10)*p;};
const mpFmt=v=>Math.abs(v)<1e-9?'0':String(+v.toFixed(4));

function mpParse(src,mem){
  const params={},curves=[],num='(-?\\d*\\.?\\d+)';
  const pRe=new RegExp('^([A-Za-z_]\\w*)\\s*=\\s*'+num+'\\s*(?:\\[\\s*'+num+'\\s*,\\s*'+num+'\\s*\\])?$');
  src.split('\n').forEach(raw=>{
    const l=raw.trim(); if(!l||l[0]==='#')return;
    let m=l.match(pRe);
    if(m){const def=+m[2],k=mem[m[1]];
      params[m[1]]={def,val:(k&&k.def===def)?k.val:def,min:m[3]!==undefined?+m[3]:Math.min(-5,def*2),max:m[4]!==undefined?+m[4]:Math.max(5,def*2)};return;}
    m=l.match(/^([A-Za-z_]\w*)\s*\(\s*x\s*\)\s*=\s*(.+)$/);
    if(m){let fn=null;try{fn=math.compile(m[2]);}catch(e){}
      curves.push({name:m[1]+'(x)',fn,color:MP_COLORS[curves.length%MP_COLORS.length]});}
  });
  return {params,curves};
}

function mpSet(root,n,v){
  const p=root._mp.params[n]; if(!p)return;
  p.val=Math.min(p.max,Math.max(p.min,Math.round(v*100)/100));
  root._mpMem[n]={def:p.def,val:p.val};
  mpSync(root);
}
function mpSync(root){
  const sc=root._mp;
  for(const n in sc.params){
    const v=sc.params[n].val;
    if(mpTipEl&&mpTipEl.dataset.param===n&&mpTipEl._root===root)mpTipShow(mpTipEl);
  }
  if(!sc.raf)sc.raf=requestAnimationFrame(()=>{sc.raf=0;sc.widgets.forEach(mpDraw);});
}
function mpZoom(w,f,px,py){
  const r=w.canvas.getBoundingClientRect(),v=w.view;
  px=px??r.width/2; py=py??r.height/2;
  const ns=Math.min(2000,Math.max(3,v.s*f)); f=ns/v.s;
  const cx=r.width/2+v.ox,cy=r.height/2+v.oy;
  v.ox=px-(px-cx)*f-r.width/2; v.oy=py-(py-cy)*f-r.height/2; v.s=ns;
}

function mpDraw(w){
  const c=w.canvas,dpr=window.devicePixelRatio||1,r=c.getBoundingClientRect();
  if(!r.width)return;
  const pw=Math.round(r.width*dpr),ph=Math.round(r.height*dpr);
  if(c.width!==pw||c.height!==ph){c.width=pw;c.height=ph;}
  const ctx=c.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0);
  const W=r.width,H=r.height,v=w.view,cx=W/2+v.ox,cy=H/2+v.oy;
  const X=px=>(px-cx)/v.s,Y=py=>(cy-py)/v.s,SX=x=>cx+x*v.s,SY=y=>cy-y*v.s;
  ctx.clearRect(0,0,W,H);
  const st=mpNice(70/v.s);
  ctx.font='11px "Fira Code",monospace'; ctx.lineWidth=1;
  for(let i=Math.ceil(X(0)/st);i<=Math.floor(X(W)/st);i++){
    const sx=SX(i*st); ctx.strokeStyle='rgba(27,26,23,.07)';
    ctx.beginPath();ctx.moveTo(sx,0);ctx.lineTo(sx,H);ctx.stroke();
    if(i){ctx.fillStyle='#8a847a';ctx.fillText(mpFmt(i*st),sx+3,Math.min(H-4,Math.max(12,cy+14)));}
  }
  for(let i=Math.ceil(Y(H)/st);i<=Math.floor(Y(0)/st);i++){
    const sy=SY(i*st); ctx.strokeStyle='rgba(27,26,23,.07)';
    ctx.beginPath();ctx.moveTo(0,sy);ctx.lineTo(W,sy);ctx.stroke();
    if(i){ctx.fillStyle='#8a847a';ctx.fillText(mpFmt(i*st),Math.min(W-34,Math.max(4,cx+6)),sy-4);}
  }
  ctx.strokeStyle='rgba(27,26,23,.55)'; ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(0,cy);ctx.lineTo(W,cy);ctx.moveTo(cx,0);ctx.lineTo(cx,H);ctx.stroke();

  const base={}; for(const n in w.sc.params)base[n]=w.sc.params[n].val;
  const ev=(cv,x)=>{try{base.x=x;const y=cv.fn.evaluate(base);return(typeof y==='number'&&isFinite(y))?y:NaN;}catch(e){return NaN;}};
  w.curves.forEach(cv=>{
    if(!cv.fn)return;
    ctx.beginPath();ctx.strokeStyle=cv.color;ctx.lineWidth=2.5;ctx.lineJoin='round';
    let on=false,p0=0;
    for(let px=0;px<=W;px+=1.5){
      const y=ev(cv,X(px)); if(isNaN(y)){on=false;continue;}
      const py=SY(y); if(on&&Math.abs(py-p0)>H*3)on=false;
      on?ctx.lineTo(px,py):ctx.moveTo(px,py); on=true;p0=py;
    }
    ctx.stroke();
  });
  let info='';
  if(w.hover){
    const hx=X(w.hover.x);
    ctx.strokeStyle='rgba(27,26,23,.35)';ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(w.hover.x,0);ctx.lineTo(w.hover.x,H);ctx.stroke();ctx.setLineDash([]);
    info='x='+hx.toFixed(2);
    w.curves.forEach(cv=>{
      if(!cv.fn)return; const y=ev(cv,hx); if(isNaN(y))return;
      ctx.fillStyle=cv.color;ctx.beginPath();ctx.arc(w.hover.x,SY(y),4.5,0,7);ctx.fill();
      info+=' · '+cv.name.replace('(x)','')+'='+y.toFixed(2);
    });
  }
  w.coord.textContent=info;
}

let mpTipEl=null;
function mpTipShow(el){
  mpTipEl=el; let t=document.getElementById('mp-tip');
  if(!t){t=document.createElement('div');t.id='mp-tip';document.body.appendChild(t);}
  const p=el._root._mp.params[el.dataset.param], r=el.getBoundingClientRect();
  t.innerHTML='<i>'+el.dataset.param+'</i> = '+p.val.toFixed(2);
  t.style.display='block'; t.style.left=(r.left+r.width/2)+'px'; t.style.top=(r.top-8)+'px';
}
function mpTipHide(){mpTipEl=null;const t=document.getElementById('mp-tip');if(t)t.style.display='none';}

function setupInteractiveMath(root){
  mpTipHide();
  const mem=root._mpMem=root._mpMem||{}, sc=root._mp={params:{},widgets:[],raf:0};
  root.querySelectorAll('pre > code.language-graph').forEach(code=>{
    const {params,curves}=mpParse(code.textContent,mem);
    Object.assign(sc.params,params);
    const fig=document.createElement('figure'); fig.className='mp-fig';
    fig.innerHTML='<div class="mp-bar"></div><canvas class="mp-canvas" title="Seret untuk menggeser · Ctrl+scroll untuk zoom"></canvas><div class="mp-foot"><div class="mp-legend"></div><span class="mp-coord"></span><div class="mp-btns"><button type="button" data-a="in">+</button><button type="button" data-a="out">−</button><button type="button" data-a="reset">Reset</button></div></div>';
    code.parentElement.replaceWith(fig);
    const c=fig.querySelector('canvas');
    const w={sc,canvas:c,curves,view:{s:40,ox:0,oy:0},hover:null,drag:null,coord:fig.querySelector('.mp-coord')};
    w.names=Object.keys(params); w.bar=fig.querySelector('.mp-bar');
    fig.querySelector('.mp-legend').innerHTML=curves.map(cv=>'<span><em style="background:'+cv.color+'"></em>'+cv.name+'</span>').join('');
    fig.querySelector('.mp-btns').addEventListener('click',e=>{
      const a=e.target.dataset.a; if(!a)return;
      if(a==='reset')w.view={s:40,ox:0,oy:0}; else mpZoom(w,a==='in'?1.25:1/1.25);
      mpDraw(w);
    });
    c.addEventListener('pointerdown',e=>{w.drag={x:e.clientX,y:e.clientY};c.setPointerCapture(e.pointerId);c.classList.add('grab');});
    c.addEventListener('pointerup',()=>{w.drag=null;c.classList.remove('grab');});
    c.addEventListener('pointercancel',()=>{w.drag=null;c.classList.remove('grab');});
    c.addEventListener('pointermove',e=>{
      const r=c.getBoundingClientRect(); w.hover={x:e.clientX-r.left,y:e.clientY-r.top};
      if(w.drag){w.view.ox+=e.clientX-w.drag.x;w.view.oy+=e.clientY-w.drag.y;w.drag={x:e.clientX,y:e.clientY};}
      mpDraw(w);
    });
    c.addEventListener('pointerleave',()=>{w.hover=null;mpDraw(w);});
    c.addEventListener('wheel',e=>{
      if(!(e.ctrlKey||e.metaKey))return; e.preventDefault();
      const r=c.getBoundingClientRect(); mpZoom(w,e.deltaY<0?1.12:1/1.12,e.clientX-r.left,e.clientY-r.top); mpDraw(w);
    },{passive:false});
    if(window.ResizeObserver)new ResizeObserver(()=>mpDraw(w)).observe(c);
    sc.widgets.push(w);
  });
  // parameter yang tidak muncul di rumus tampil sebagai huruf scrub di atas grafik
  sc.widgets.forEach(w=>w.names.forEach(n=>{
    if(root.querySelector('[data-param="'+n+'"]'))return;
    const sp=document.createElement('span'); sp.className='mp-scrub mp-chip-s'; sp.dataset.param=n; sp.textContent=n; w.bar.appendChild(sp);
  }));
  // huruf di rumus: \htmlData{param=a}{a} -> drag untuk ubah, hover untuk lihat nilai
  root.querySelectorAll('[data-param]').forEach(el=>{
    const n=el.dataset.param; if(!sc.params[n])return;
    el._root=root; el.classList.add('mp-scrub');
    el.addEventListener('pointerenter',()=>mpTipShow(el));
    el.addEventListener('pointerleave',()=>{if(!el._drag)mpTipHide();});
    el.addEventListener('pointerdown',e=>{
      e.preventDefault(); el.setPointerCapture(e.pointerId); el._drag=true; mpTipShow(el);
      const x0=e.clientX,v0=sc.params[n].val;
      const mv=ev=>{const q=sc.params[n];mpSet(root,n,v0+(ev.clientX-x0)*(q.max-q.min)/300);};
      const up=()=>{el._drag=false;el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);if(!el.matches(':hover'))mpTipHide();};
      el.addEventListener('pointermove',mv); el.addEventListener('pointerup',up);
    });
  });
  mpSync(root);
}


/* ===== SLIDE RUMUS: blok ```steps — morph antar langkah, klik kiri/kanan rumus untuk mundur/maju ===== */
function stParse(src){
  const o={title:'',steps:[]};
  src.split('\n').forEach(raw=>{
    const l=raw.trim(); if(!l||l[0]==='#')return;
    const t=l.match(/^title\s*:\s*(.+)$/i); if(t){o.title=t[1];return;}
    const i=l.lastIndexOf(' | ');
    o.steps.push(i>0?{tex:l.slice(0,i).trim(),cap:l.slice(i+3).trim()}:{tex:l,cap:''});
  });
  return o;
}
function stLayer(tex,boxed){
  const layer=document.createElement('div'); layer.className='st-layer';
  const eq=document.createElement('div'); eq.className='st-eq';
  try{katex.render('\\displaystyle '+tex,eq,{throwOnError:false,trust:true});}catch(e){eq.textContent=tex;}
  // glyph dibuat inline-block supaya bisa digeser (transform) saat morph
  eq.querySelectorAll('.katex-html *').forEach(n=>{
    if(!n.children.length&&n.textContent.replace(/[\u200b\s]/g,''))n.style.display='inline-block';
  });
  if(boxed){const b=document.createElement('div');b.className='st-box';eq.prepend(b);}
  layer.appendChild(eq); return layer;
}
function stItems(layer){
  const out=[];
  layer.querySelectorAll('.katex-html *').forEach(n=>{
    let key=null;
    if(n.classList.contains('frac-line'))key='«frac»';
    else if(n.classList.contains('sqrt-line'))key='«sqrt»';
    else if(n.tagName.toLowerCase()==='svg')key='«svg»';
    else if(!n.children.length&&!n.closest('svg')){const t=n.textContent.replace(/[\u200b\s]/g,'');if(t)key=t;}
    if(key!==null)out.push({el:n,key,bar:key[0]==='«',rect:n.getBoundingClientRect()});
  });
  return out;
}
function stLCS(a,b){
  const n=a.length,m=b.length,d=Array.from({length:n+1},()=>new Int16Array(m+1));
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)
    d[i][j]=a[i].key===b[j].key?d[i+1][j+1]+1:Math.max(d[i+1][j],d[i][j+1]);
  const pairs=[];let i=0,j=0;
  while(i<n&&j<m){
    if(a[i].key===b[j].key){pairs.push([i,j]);i++;j++;}
    else if(d[i+1][j]>=d[i][j+1])i++; else j++;
  }
  return pairs;
}
function stMeasure(st){
  const n=st.steps.length,probe=document.createElement('div');
  probe.className='st-main'; probe.style.cssText='position:absolute;left:0;right:0;visibility:hidden;min-height:0';
  st.stage.appendChild(probe); let h=0;
  st.steps.forEach((s,k)=>{probe.replaceChildren(stLayer(s.tex,n>1&&k===n-1));h=Math.max(h,probe.offsetHeight);});
  probe.remove(); if(h)st.main.style.minHeight=Math.ceil(h)+'px';
}
function stShowGhost(st){
  st.ghost.replaceChildren();
  if(st.i>0)st.ghost.appendChild(stLayer(st.steps[st.i-1].tex,false));
}
function stUpdateUI(st){
  st.count.textContent=(st.i+1)+' / '+st.steps.length;
  st.fig.toggleAttribute('data-first',st.i===0);
  st.fig.toggleAttribute('data-last',st.i===st.steps.length-1);
  st.cap.textContent=st.steps[st.i].cap;
}
function stGo(st,to){
  if(to<0||to>=st.steps.length||to===st.i)return;
  if(st.finish)st.finish();
  st.i=to; st.mem[st.k]=to;
  const S=st.steps[to],n=st.steps.length;
  const quick=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
  const oldLayer=st.main.querySelector('.st-layer');
  const oi=oldLayer?stItems(oldLayer):[];            // ukur posisi lama sebelum layer baru dipasang
  const newLayer=stLayer(S.tex,n>1&&to===n-1);
  st.main.appendChild(newLayer);
  stUpdateUI(st); stShowGhost(st);
  if(quick||!oldLayer){if(oldLayer)oldLayer.remove();return;}
  const ni=stItems(newLayer),pairs=stLCS(oi,ni),anims=[],usedN=new Set(),D=650;
  pairs.forEach(([a,b])=>{
    const o=oi[a],q=ni[b]; usedN.add(b);
    const dx=o.rect.left-q.rect.left,dy=o.rect.top-q.rect.top;
    let sx=1,sy=1;
    if(q.bar){sx=q.rect.width?o.rect.width/q.rect.width:1;sy=q.rect.height?o.rect.height/q.rect.height:1;}
    else if(q.rect.width>1){sx=sy=Math.min(2.5,Math.max(.4,o.rect.width/q.rect.width));}
    o.el.style.visibility='hidden';
    anims.push(q.el.animate(
      [{transformOrigin:'0 0',transform:'translate('+dx+'px,'+dy+'px) scale('+sx+','+sy+')'},
        {transformOrigin:'0 0',transform:'translate(0,0) scale(1,1)'}],
      {duration:D,easing:'cubic-bezier(.65,0,.35,1)',fill:'backwards'}));
  });
  ni.forEach((q,b)=>{if(!usedN.has(b))anims.push(q.el.animate([{opacity:0},{opacity:1}],{duration:380,delay:300,easing:'ease-out',fill:'backwards'}));});
  const nb=newLayer.querySelector('.st-box');
  if(nb)anims.push(nb.animate([{opacity:0},{opacity:1}],{duration:380,delay:300,fill:'backwards'}));
  anims.push(oldLayer.animate([{opacity:1},{opacity:0}],{duration:240,easing:'ease-out',fill:'forwards'}));
  anims.push(st.cap.animate([{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'none'}],{duration:380,delay:250,fill:'backwards'}));
  anims.push(st.ghost.animate([{opacity:0},{opacity:1}],{duration:380,delay:200,fill:'backwards'}));
  const fin=()=>{anims.forEach(a=>{try{a.finish();}catch(e){}});oldLayer.remove();if(st.finish===fin)st.finish=null;};
  st.finish=fin;
  Promise.all(anims.map(a=>a.finished.catch(()=>{}))).then(()=>{if(st.finish===fin)fin();});
}
function setupSteps(root){
  const mem=root._stMem=root._stMem||[]; let k=0;
  root.querySelectorAll('pre > code.language-steps').forEach(code=>{
    const {title,steps}=stParse(code.textContent); if(!steps.length)return;
    const fig=document.createElement('figure'); fig.className='st-fig'; fig.tabIndex=0;
    fig.innerHTML=(title?'<div class="st-title"></div>':'')+
      '<div class="st-stage"><div class="st-ghost"></div><div class="st-main"></div><div class="st-cap"></div>'+
      '<span class="st-arrow l">‹</span><span class="st-arrow r">›</span></div>'+
      '<div class="st-foot"><span class="st-count"></span><span>Klik kiri/kanan rumus untuk mundur/maju · tombol ← → saat aktif</span></div>';
    if(title)fig.querySelector('.st-title').textContent=title;
    code.parentElement.replaceWith(fig);
    const st={fig,steps,k:k++,mem,i:Math.min(steps.length-1,Math.max(0,mem[k-1]||0)),finish:null,
      stage:fig.querySelector('.st-stage'),ghost:fig.querySelector('.st-ghost'),main:fig.querySelector('.st-main'),
      cap:fig.querySelector('.st-cap'),count:fig.querySelector('.st-count')};
    st.main.appendChild(stLayer(steps[st.i].tex,steps.length>1&&st.i===steps.length-1));
    stShowGhost(st); stUpdateUI(st);
    stMeasure(st); if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>stMeasure(st));
    const side=e=>{const r=st.stage.getBoundingClientRect();return (e.clientX-r.left)<r.width/2?-1:1;};
    st.stage.addEventListener('pointermove',e=>{fig.dataset.side=side(e)<0?'l':'r';});
    st.stage.addEventListener('pointerleave',()=>{delete fig.dataset.side;});
    st.stage.addEventListener('click',e=>{fig.focus({preventScroll:true});stGo(st,st.i+side(e));});
    fig.addEventListener('keydown',e=>{
      const to=e.key==='ArrowRight'?st.i+1:e.key==='ArrowLeft'?st.i-1:e.key==='Home'?0:e.key==='End'?steps.length-1:null;
      if(to===null)return; e.preventDefault(); stGo(st,to);
    });
  });
}

document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAddVaultModal();});

function renderMarkdownAndMath(targetElement, markdownContent) {
  targetElement.innerHTML = marked.parse(preprocessMarkdown(markdownContent));   // extras.js: ::: callout + opsi fence
  targetElement.querySelectorAll('img').forEach(img => { img.loading = 'lazy'; img.decoding = 'async'; });

  setupCallouts(targetElement);                       // > [!theorem] ... -> kotak (sebelum KaTeX agar judul bisa memuat rumus)

  if (window.renderMathInElement) {
    renderMathInElement(targetElement, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false},
        {left: '\\(', right: '\\)', display: false},
        {left: '\\[', right: '\\]', display: true}
      ],
      throwOnError: false,
      trust: true
    });
  }
  setupInteractiveMath(targetElement);
  setupSteps(targetElement);
  setupCodeBlocks(targetElement);                     // Python (jalankan + sembunyikan) & listing statis LaTeX/Julia/C++/JS
  linkifyInline(targetElement, targetElement.id === 'reader-markdown');   // #tag dan [[artikel]]
}

function escapeCodeForAttribute(str) {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

function displayArticle(articleId) {
  const article = articles.find(a => a.id === articleId) || articles[0];
  if (!article) return;

  currentArticleId = article.id;
  activeVaultId = article.vaultId;
  document.getElementById('sidebar-vault-select').value = activeVaultId;

  const vaultObj = vaults.find(v => v.id === article.vaultId);

  document.getElementById('reader-title').textContent = article.title;
  document.getElementById('reader-vault-badge').textContent = `Vault: ${vaultObj?.title || 'Umum'}`;
  document.getElementById('reader-path-breadcrumb').textContent = `docs/${article.folderPath || 'root'}/${article.id}.md`;
  document.getElementById('reader-updated-at').textContent = article.updatedAt ? new Date(article.updatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

  const tagsContainer = document.getElementById('reader-tags-container');
  tagsContainer.innerHTML = '';
  if (article.tags) {
    article.tags.forEach(t => {
      const span = document.createElement('button');
      span.type = 'button';
      span.title = 'Buka dokumen bertag #' + t;
      span.onclick = () => openTagTarget(t, span);
      span.className = "reader-tag text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700";
      span.textContent = `#${t}`;
      tagsContainer.appendChild(span);
    });
  }

  const readerEl = document.getElementById('reader-markdown');
  readerEl._mpMem = {};
  renderMarkdownAndMath(readerEl, article.content);

  generateTOC(article.content);
  renderFolderTreeNav();
  syncArticleHash(article.id);
  applyPendingAnchor();
}

// Daftar isi dibangun dari heading hasil render (akurat: abaikan komentar '#' di blok kode, rumus ikut benar).
function generateTOC() {
  const toc = document.getElementById('reader-toc');
  const details = document.getElementById('toc-details');
  const countEl = document.getElementById('toc-count');
  toc.innerHTML = '';

  const heads = Array.from(document.querySelectorAll('#reader-markdown h1, #reader-markdown h2, #reader-markdown h3'))
    .filter(h => window.getComputedStyle(h).display !== 'none');
  countEl.textContent = heads.length ? `(${heads.length})` : '';

  if (!heads.length) {
    toc.innerHTML = '<li class="text-slate-500 italic">Tidak ada sub-judul</li>';
  } else {
    heads.forEach(h => {
      const clone = h.cloneNode(true);
      clone.querySelectorAll('.katex-mathml').forEach(n => n.remove());
      const level = parseInt(h.tagName[1], 10);
      const li = document.createElement('li');
      li.style.paddingLeft = `${(level - 1) * 0.6}rem`;
      li.className = 'hover:text-amber-400 cursor-pointer truncate transition';
      li.textContent = clone.textContent.trim();
      li.onclick = () => {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (!desktopMQ.matches && details) details.open = false;   // HP: lipat setelah memilih
      };
      toc.appendChild(li);
    });
  }
  if (details) details.open = desktopMQ.matches;                  // desktop terbuka, HP terlipat
}

/* ==========================================================================
    8. SNIPPET & LIVE PREVIEW
    ========================================================================== */
function insertSnippet(type) {
  const textarea = document.getElementById('editor-content');
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  let snippet = "";

  if (type === 'table') {
    snippet = `\n| Header 1 | Header 2 |\n| :--- | :--- |\n| Data A | Data B |\n`;
  } else if (type === 'math') {
    snippet = `\n$$ G_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu} $$\n`;
  } else if (type === 'graph') {
    snippet = `\n$$f(x) = \\htmlData{param=a}{a}\\, x^2$$\n\n\`\`\`graph\na = 1 [-3, 3]\nf(x) = a*x^2\n\`\`\`\n`;
  } else if (type === 'steps') {
    snippet = `\n\`\`\`steps\ntitle: Contoh slide rumus\nax^2+bx+c=0 | Persamaan awal\nx^2+\\frac{b}{a}x+\\frac{c}{a}=0 | Bagi kedua ruas dengan a\nx=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}\n\`\`\`\n`;
  } else if (type === 'python') {
    snippet = `\n\`\`\`python\nimport numpy as np\nimport matplotlib.pyplot as plt\n\nx = np.linspace(0, 10, 100)\nplt.plot(x, np.sin(x))\nplt.show()\n\`\`\`\n`;
  }

  if (EXTRA_SNIPPETS[type]) snippet = EXTRA_SNIPPETS[type];
  if (!snippet) return;

  textarea.value = textarea.value.substring(0, start) + snippet + textarea.value.substring(end);
  updateLivePreview();
}

function updateLivePreview() {
  const inputContent = document.getElementById('editor-content').value;
  const previewContainer = document.getElementById('editor-live-preview');
  renderMarkdownAndMath(previewContainer, inputContent);
}

function handleSearch() {
  const query = document.getElementById('wiki-search-input').value;
  renderFolderTreeNav(query);
}

/* ==========================================================================
    9. EDITOR: SIMPAN ARTIKEL VIA UPSERT
    ========================================================================== */
function applyEditorMode() {
  document.getElementById('editor-submit-btn-text').textContent = isAdminLoggedIn ? 'Simpan Artikel' : 'Kirim Usulan';
  document.getElementById('editor-note').value = '';
}

function createNewArticle() {
  if (!currentUser) { promptAdminLogin(); return; }
  if (!vaults.length) { alert(isAdminLoggedIn ? 'Buat vault terlebih dahulu (tombol "Tambah Vault").' : 'Belum ada vault.'); return; }
  document.getElementById('editor-page-heading').textContent = isAdminLoggedIn ? "Tulis Artikel Baru" : "Usulkan Artikel Baru";
  document.getElementById('editor-vault').value = activeVaultId;
  document.getElementById('editor-folder').value = `${activeVaultId}/topik`;
  document.getElementById('editor-id').value = "";
  document.getElementById('editor-id').readOnly = false;
  document.getElementById('editor-title').value = "";
  document.getElementById('editor-tags').value = "kuantum, matematika";
  document.getElementById('editor-content').value = `# Judul Artikel\n\nTulis isi markdown, rumus $E=mc^2$, atau paste gambar (Ctrl+V) di sini...`;
  applyEditorMode();
  switchTab('editor');
}

function editCurrentArticle() {
  if (!currentUser) { promptAdminLogin(); return; }
  const article = articles.find(a => a.id === currentArticleId);
  if (!article) return;

  document.getElementById('editor-page-heading').textContent = (isAdminLoggedIn ? 'Edit Artikel: ' : 'Usulkan Edit: ') + article.title;
  document.getElementById('editor-vault').value = article.vaultId;
  document.getElementById('editor-folder').value = article.folderPath || '';
  document.getElementById('editor-id').value = article.id;
  document.getElementById('editor-id').readOnly = true;
  document.getElementById('editor-title').value = article.title;
  document.getElementById('editor-tags').value = article.tags ? article.tags.join(', ') : '';
  document.getElementById('editor-content').value = article.content;
  applyEditorMode();
  switchTab('editor');
}

async function handleEditorSubmit(e) {
  e.preventDefault();
  if (!currentUser) { promptAdminLogin(); return; }

  const idField = document.getElementById('editor-id');
  const id = idField.value.trim().toLowerCase().replace(/\s+/g, '-');
  const isNew = !idField.readOnly;
  const existing = articles.find(a => a.id === id);
  const fields = {
    id,
    vaultId: document.getElementById('editor-vault').value,
    folderPath: document.getElementById('editor-folder').value.trim() || 'root',
    title: document.getElementById('editor-title').value.trim(),
    tags: document.getElementById('editor-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    content: document.getElementById('editor-content').value
  };
  const btn = document.querySelector('#article-editor-form button[type="submit"]');

  /* ---- Kontributor: kirim usulan ke tabel `proposals` ---- */
  if (!isAdminLoggedIn) {
    if (isNew && existing) { alert(`ID "${id}" sudah dipakai artikel lain. Gunakan ID berbeda, atau buka artikelnya lalu pilih "Usulkan Edit".`); return; }
    btn.disabled = true;
    const { error } = await sb.from('proposals').insert({
      article_id: id, vault_id: fields.vaultId, folder_path: fields.folderPath, title: fields.title,
      content: fields.content, tags: fields.tags,
      note: document.getElementById('editor-note').value.trim() || null,
      author_name: displayName(),
      base_updated_at: existing ? existing.updatedAt : null
    });
    btn.disabled = false;
    if (error) { alert('Gagal mengirim usulan: ' + error.message); return; }
    alert('Usulan terkirim. Admin akan meninjau sebelum diterbitkan.');
    switchTab('proposals');
    return;
  }

  /* ---- Admin: tulis langsung ke `articles` via upsert ---- */
  if (isNew && existing && !confirm(`Artikel dengan ID "${id}" sudah ada. Timpa?`)) return;
  btn.disabled = true;
  // updated_at diisi otomatis oleh trigger database
  const { data, error } = await sb.from('articles').upsert(articleToRow(fields), { onConflict: 'id' }).select().single();
  btn.disabled = false;
  if (error) { alert('Gagal menyimpan: ' + error.message); return; }

  const saved = mapArticle(data);
  const idx = articles.findIndex(a => a.id === saved.id);
  if (idx >= 0) articles[idx] = saved; else articles.unshift(saved);

  activeVaultId = saved.vaultId;
  currentArticleId = saved.id;
  renderVaultsGrid();
  renderVaultSelectOptions();
  renderSidebarTagChips();
  displayArticle(saved.id);
  switchTab('reader');
}

/* ==========================================================================
    10. USULAN: daftar (kontributor = milik sendiri, admin = semua) & review admin
    ========================================================================== */
async function loadProposals() {
  if (!currentUser) { proposals = []; updateProposalBadge(); return; }
  const { data, error } = await sb.from('proposals').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) { console.warn('Gagal memuat usulan:', error.message); return; }
  proposals = data;
  updateProposalBadge();
}

function updateProposalBadge() {
  const b = document.getElementById('proposal-badge');
  if (!b) return;
  const n = isAdminLoggedIn ? proposals.filter(p => p.status === 'pending').length : 0;
  b.textContent = n;
  b.classList.toggle('hidden', n === 0);
}

async function refreshProposalsView() { await loadProposals(); renderProposals(); }

function renderProposals() {
  const box = document.getElementById('proposal-cards');
  document.getElementById('proposals-heading').textContent = isAdminLoggedIn ? 'Usulan Perubahan' : 'Usulan Saya';
  document.getElementById('proposals-subheading').textContent = isAdminLoggedIn
    ? 'Tinjau usulan kontributor. "Setujui" langsung menerbitkan ke artikel.'
    : 'Status usulan yang pernah Anda kirim.';
  if (!proposals.length) { box.innerHTML = '<p class="text-xs text-slate-500 italic">Belum ada usulan.</p>'; return; }

  const sorted = [...proposals].sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1));
  const badge = { pending: 'bg-amber-500/20 text-amber-400', approved: 'bg-emerald-500/20 text-emerald-400', rejected: 'bg-red-500/20 text-red-400' };
  const label = { pending: 'MENUNGGU', approved: 'DISETUJUI', rejected: 'DITOLAK' };

  box.innerHTML = sorted.map(p => {
    const target = articles.find(a => a.id === p.article_id);
    const changed = target && p.base_updated_at && new Date(target.updatedAt).getTime() !== new Date(p.base_updated_at).getTime();
    const mine = currentUser && p.author_id === currentUser.id;
    const pending = p.status === 'pending';
    return `
    <div class="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="space-y-1">
          <div class="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span class="px-2 py-0.5 rounded-full font-semibold ${badge[p.status]}">${label[p.status]}</span>
            <span>${escapeHtml(p.author_name || 'anonim')}</span>
            <span>· ${new Date(p.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          </div>
          <h3 class="text-base font-bold text-white font-display">${escapeHtml(p.title)}</h3>
          <p class="text-xs text-slate-400 font-mono">${target ? 'Edit artikel: ' + escapeHtml(target.title) : 'Artikel baru'} · docs/${escapeHtml(p.folder_path)}/${escapeHtml(p.article_id)}.md</p>
          ${p.note ? `<p class="text-xs text-slate-300 italic">“${escapeHtml(p.note)}”</p>` : ''}
          ${changed && pending ? '<p class="text-xs text-red-400"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Artikel sudah berubah sejak usulan ini dibuat; menyetujui akan menimpa versi saat ini.</p>' : ''}
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button onclick="previewProposal('${p.id}')" class="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700">Pratinjau</button>
          ${pending && isAdminLoggedIn ? `
            <button onclick="approveProposal('${p.id}')" class="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg">Setujui</button>
            <button onclick="rejectProposal('${p.id}')" class="px-3 py-1.5 text-xs font-semibold text-red-400 bg-slate-800 hover:bg-slate-700 rounded-lg border border-red-500/30">Tolak</button>` : ''}
          ${pending && mine && !isAdminLoggedIn ? `<button onclick="withdrawProposal('${p.id}')" class="px-3 py-1.5 text-xs font-semibold text-red-400 bg-slate-800 hover:bg-slate-700 rounded-lg border border-red-500/30">Tarik</button>` : ''}
        </div>
      </div>
      <div id="pv-${p.id}" class="hidden wiki-content border-t border-slate-800 pt-4"></div>
    </div>`;
  }).join('');
}

function previewProposal(id) {
  const p = proposals.find(x => x.id === id);
  const el = document.getElementById('pv-' + id);
  if (!p || !el) return;
  if (!el.classList.contains('hidden')) { el.classList.add('hidden'); return; }
  el._mpMem = {};
  renderMarkdownAndMath(el, p.content);
  el.classList.remove('hidden');
}

async function approveProposal(id) {
  if (!confirm('Setujui dan terbitkan usulan ini?')) return;
  const { error } = await sb.rpc('approve_proposal', { p_id: id });
  if (error) { alert('Gagal menyetujui: ' + error.message); return; }
  await loadData();
  await refreshProposalsView();
}

async function rejectProposal(id) {
  if (!confirm('Tolak usulan ini?')) return;
  const { error } = await sb.from('proposals').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', id).eq('status', 'pending');
  if (error) { alert('Gagal menolak: ' + error.message); return; }
  await refreshProposalsView();
}

async function withdrawProposal(id) {
  if (!confirm('Tarik usulan ini?')) return;
  const { error } = await sb.from('proposals').delete().eq('id', id);
  if (error) { alert('Gagal menarik usulan: ' + error.message); return; }
  await refreshProposalsView();
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function toggleWorkbenchDrawer() {
  document.getElementById('workbench-drawer').classList.toggle('translate-x-full');
}

function runWorkbenchCode() {
  const code = document.getElementById('workbench-editor').value;
  executePythonCode(code, 'workbench-output');
}



/* ==========================================================================
    VAULT: TAMBAH & EDIT (nama, ID, kategori, poster, deskripsi)
    ========================================================================== */
let editingVaultId = null;

function setVaultModalMode() {
  const edit = !!editingVaultId;
  document.getElementById('vault-modal-title').textContent = edit ? 'Edit Vault' : 'Buat Vault Baru';
  document.getElementById('vault-submit-text').textContent = edit ? 'Simpan Perubahan' : 'Simpan Vault';
  document.getElementById('vault-id-hint').classList.toggle('hidden', !edit);
  document.getElementById('vault-poster-status').textContent = '';
}

function previewPoster() {
  const img = document.getElementById('vault-poster-preview');
  const url = document.getElementById('vaultPoster').value.trim();
  img.onerror = () => img.classList.add('hidden');
  if (url) { img.src = url; img.classList.remove('hidden'); } else { img.removeAttribute('src'); img.classList.add('hidden'); }
}

function openAddVaultModal() {
  if (!isAdminLoggedIn) { promptAdminLogin(); return; }
  editingVaultId = null;
  document.getElementById('addVaultForm').reset();
  setVaultModalMode();
  previewPoster();
  document.getElementById('addVaultModal').classList.remove('hidden');
}

function openEditVaultModal(id) {
  if (!isAdminLoggedIn) { promptAdminLogin(); return; }
  const v = vaults.find(x => x.id === id);
  if (!v) return;
  editingVaultId = id;
  document.getElementById('addVaultForm').reset();
  document.getElementById('vaultId').value = v.id;
  document.getElementById('vaultTitle').value = v.title;
  document.getElementById('vaultTag').value = v.tag;
  document.getElementById('vaultPoster').value = v.posterUrl;
  document.getElementById('vaultDescription').value = v.description;
  setVaultModalMode();
  previewPoster();
  document.getElementById('addVaultModal').classList.remove('hidden');
}

function closeAddVaultModal() {
  document.getElementById('addVaultModal').classList.add('hidden');
  document.getElementById('addVaultForm').reset();
  editingVaultId = null;
}

// Unggah gambar poster: kompres -> upload (provider terpilih) -> isi kolom URL
async function handlePosterFile(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  if (!currentUser && IMAGE_CONFIG.provider === 'supabase') { promptAdminLogin(); return; }
  const st = document.getElementById('vault-poster-status');
  try {
    st.textContent = 'Mengompres...';
    const blob = await compressImage(file);
    st.textContent = 'Mengunggah (' + fmtKB(file.size) + ' → ' + fmtKB(blob.size) + ')...';
    const url = await uploadImage(blob);
    document.getElementById('vaultPoster').value = url;
    previewPoster();
    st.textContent = 'Selesai: ' + fmtKB(blob.size);
  } catch (err) {
    st.textContent = 'Gagal: ' + err.message;
  }
}

async function handleVaultSubmit(event) {
  event.preventDefault();
  if (!isAdminLoggedIn) { promptAdminLogin(); return; }
  const fields = {
    id: document.getElementById('vaultId').value.trim().toLowerCase().replace(/\s+/g, '-'),
    title: document.getElementById('vaultTitle').value.trim(),
    tag: document.getElementById('vaultTag').value.trim(),
    posterUrl: document.getElementById('vaultPoster').value.trim(),
    description: document.getElementById('vaultDescription').value.trim()
  };

  /* ---- Vault baru ---- */
  if (!editingVaultId) {
    const { data, error } = await sb.from('vaults').insert(vaultToRow(fields)).select().single();
    if (error) {
      alert(error.code === '23505' ? 'ID Vault sudah digunakan! Harap gunakan ID yang lain.' : 'Gagal menyimpan vault: ' + error.message);
      return;
    }
    vaults.push(mapVault(data));
    if (!activeVaultId) activeVaultId = data.id;
    renderVaultsGrid();
    renderVaultSelectOptions();
    closeAddVaultModal();
    return;
  }

  /* ---- Edit vault ---- */
  const oldId = editingVaultId;
  const idChanged = fields.id !== oldId;
  if (idChanged && !confirm(`Ubah ID vault "${oldId}" menjadi "${fields.id}"?\nSemua artikel di vault ini ikut dipindahkan. Path folder artikel tidak berubah otomatis.`)) return;

  const { data, error } = await sb.from('vaults').update(vaultToRow(fields)).eq('id', oldId).select().single();
  if (error) {
    const msg = error.code === '23505' ? 'ID Vault sudah digunakan! Harap gunakan ID yang lain.'
      : error.code === '23503' ? 'Perubahan ID ditolak oleh relasi artikel. Jalankan ulang supabase-setup.sql (FK harus "on update cascade").'
      : 'Gagal menyimpan: ' + error.message;
    alert(msg);
    return;
  }

  const updated = mapVault(data);
  const i = vaults.findIndex(v => v.id === oldId);
  if (i >= 0) vaults[i] = updated; else vaults.push(updated);
  if (idChanged) {
    articles.forEach(a => { if (a.vaultId === oldId) a.vaultId = updated.id; });
    if (activeVaultId === oldId) activeVaultId = updated.id;
    await loadProposals();
  }
  renderVaultsGrid();
  renderVaultSelectOptions();
  renderSidebarTagChips();
  renderFolderTreeNav();
  if (currentArticleId && articles.some(a => a.id === currentArticleId)) displayArticle(currentArticleId);
  closeAddVaultModal();
}
