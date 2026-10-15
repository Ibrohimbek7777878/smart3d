import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const r = (p) => fileURLToPath(new URL(p, import.meta.url));
const DATA = r('../app/data');   // ma'lumot — bitta manba (eski sayt bilan umumiy)
const API = process.env.SMART3D_API || 'http://127.0.0.1:3000';   // Smart3D server (dev/preview proksi)

/* TZ-09: app/data/*.json — dev'da /data/ dan beriladi, build'da dist/data/ ga ko'chiriladi (nusxa repoda saqlanmaydi) */
function smart3dData() {
  return {
    name: 'smart3d-data',
    configureServer(server) {
      server.middlewares.use('/data', (req, res, next) => {
        const f = path.join(DATA, decodeURIComponent((req.url || '').split('?')[0]));
        if (!f.startsWith(DATA + path.sep) || !f.endsWith('.json') || !fs.existsSync(f)) return next();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        fs.createReadStream(f).pipe(res);
      });
    },
    writeBundle(opts) {
      const out = path.join(opts.dir, 'data');
      fs.mkdirSync(out, { recursive: true });
      for (const n of fs.readdirSync(DATA)) if (n.endsWith('.json')) fs.copyFileSync(path.join(DATA, n), path.join(out, n));
    }
  };
}

/* TZ-09: engine/price.js — UMD (brauzerda self.SpPrice, Node'da module.exports). Vite build'i uni CommonJS o'ramiga
   oladi va API global'ga yetmaydi. Shu sababli build'da u ESM ko'rinishida beriladi: fayl O'ZGARMAYDI, o'qib o'raladi —
   API default eksport va self.SpPrice (eski kod global'dan o'qiydi). */
function smart3dPrice() {
  const PRICE = r('../app/js/engine/price.js');
  return {
    name: 'smart3d-price', enforce: 'pre',
    async resolveId(id, importer) {
      if (!/engine\/price\.js$/.test(id)) return null;
      const res = await this.resolve(id, importer, { skipSelf: true });
      return res && path.resolve(res.id) === PRICE ? '\0smart3d-price' : null;
    },
    load(id) {
      if (id !== '\0smart3d-price') return null;
      const src = fs.readFileSync(PRICE, 'utf8');
      return 'const m = { exports: {} };\n(function (module, exports) {\n' + src + '\n}).call({}, m, m.exports);\n' +
        'const api = m.exports;\nif (typeof self !== "undefined" && !self.SpPrice) self.SpPrice = api;\nexport default api;\n';
    }
  };
}

// 2 sahifa: / (sayt) va /app.html (ilova)
export default defineConfig({
  plugins: [
    react(),
    smart3dPrice(),
    smart3dData(),
    /* internetsiz ishlash: sahifa, kod, shrift va ma'lumot oldindan keshlanadi; /api — doim tarmoqdan */
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      filename: 'sw.js',
      manifest: {
        name: 'Smart3D', short_name: 'Smart3D', lang: 'uz',
        start_url: 'app.html', scope: './', display: 'standalone',
        background_color: '#0F2229', theme_color: '#0F2229',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,json,png,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: null,
        cleanupOutdatedCaches: true
      }
    })
  ],
  resolve: { dedupe: ['three', 'react', 'react-dom'] },   // dvigatel (app/js) ham shu three nusxasini oladi
  server: {
    fs: { allow: [r('..')] },                              // ../app/js/engine importi uchun
    proxy: { '/api': API, '/ws': { target: API.replace(/^http/, 'ws'), ws: true } }
  },
  preview: { proxy: { '/api': API } },                     // testlar: build + server (tests/ui/web_*.sh)
  build: {
    rollupOptions: {
      input: { main: r('./index.html'), app: r('./app.html') },
    },
  },
});
