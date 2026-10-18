/* Smart3D service worker — offline PWA (birinchi tashrifdan keyin internetsiz ishlaydi).
 *
 * Strategiya:
 *   · HTML / JS / CSS / JSON — avval TARMOQ, bo'lmasa kesh: yangi versiya bir yuklanishda
 *     yetib boradi, eski va yangi fayllar aralashib qolmaydi.
 *   · vendor/ (three.js) va icons/ — avval KESH: o'zgarmaydi, tez ochiladi.
 *   · /api/ va /ws — umuman keshlanmaydi (jonli ma'lumot).
 * SHELL ro'yxati js/app.js importlari va fetch() lari bilan bir xil bo'lishi SHART —
 * yangi modul qo'shilsa shu yerga ham yoziladi va CACHE versiyasi oshiriladi.
 */
const CACHE = 'smart3d-v19';
const SHELL = [
  './',
  'index.html',
  'manifest.json',
  'css/app.css',
  'icons/icon-192.png',
  'icons/icon-512.png',
  /* ilova */
  'js/app.js',
  'js/ai.js',
  'js/controls.js',
  'js/items.js',
  'js/materials3d.js',
  'js/scene.js',
  /* hisoblash dvigatellari */
  'js/engine/assembler.js',
  'js/engine/bpj.js',
  'js/engine/cnc.js',
  'js/engine/cutlist.js',
  'js/engine/expr.js',
  'js/engine/giblab.js',
  'js/engine/glbexport.js',
  'js/engine/nesting.js',
  'js/engine/kitchen.js',
  'js/engine/objexport.js',
  'js/engine/photo-render.js',
  'js/engine/price.js',
  'js/engine/rules.js',
  'js/engine/search.js',
  'js/engine/slots.js',
  'js/engine/standart.js', 'js/auth.js', 'js/auth-core.js',
  'js/engine/xlsxexport.js',
  'js/engine/logo.js',
  /* ma'lumotlar (app.js boot() da yuklanadi) */
  'data/appliances.json',
  'data/fragments-mc.json',
  'data/furnitura-catalog.json',
  'data/sex-standartlari.json',
  'data/fragments.json',
  'data/materials.json',
  'data/materials-index.json',
  'data/nesting-defaults.json',
  'data/services.json',
  'data/sheet-catalog.json',
  /* three.js */
  'vendor/three/three.module.js',
  'vendor/three/addons/controls/OrbitControls.js',
  'vendor/three/addons/renderers/CSS2DRenderer.js',
  'vendor/three/addons/webxr/VRButton.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function putCache(req, res) {
  if (res && res.ok && res.type === 'basic') {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy));
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname === '/ws') return;

  const immutable = url.pathname.includes('/vendor/') || url.pathname.includes('/icons/');
  if (immutable) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => putCache(req, res))));
    return;
  }
  /* avval tarmoq; internet bo'lmasa — kesh (navigatsiyada index.html) */
  e.respondWith(
    fetch(req).then(res => putCache(req, res)).catch(() =>
      caches.match(req).then(hit => hit ||
        (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))
    )
  );
});
