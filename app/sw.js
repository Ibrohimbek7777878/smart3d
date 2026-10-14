/* Smart3D service worker — offline PWA (birinchi tashrifdan keyin internetsiz ishlaydi). */
const CACHE = 'smart3d-v8';
const SHELL = [
  './',
  'index.html',
  'manifest.json',
  'css/app.css',
  'data/fragments.json',
  'data/materials.json',
  'data/materials-index.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'js/app.js',
  'js/scene.js',
  'js/controls.js',
  'js/items.js',
  'js/materials3d.js',
  'js/ai.js',
  'js/engine/price.js',
  'js/engine/rules.js',
  'js/engine/cutlist.js',
  'js/engine/nesting.js',
  'js/engine/objexport.js',
  'js/engine/bpj.js',
  'js/engine/cnc.js',
  'js/engine/giblab.js',
  'js/engine/search.js',
  'data/nesting-defaults.json',
  'data/sheet-catalog.json',
  'data/furnitura-catalog.json',
  'vendor/three/three.module.js',
  'vendor/three/addons/controls/OrbitControls.js',
  'vendor/three/addons/controls/TransformControls.js',
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

/* stale-while-revalidate: tez cache'dan, fon yangilanadi */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      const net = fetch(e.request).then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
