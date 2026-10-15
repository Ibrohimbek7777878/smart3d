import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const r = (p) => fileURLToPath(new URL(p, import.meta.url));

// 2 sahifa: / (sayt) va /app.html (ilova)
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: { main: r('./index.html'), app: r('./app.html') },
    },
  },
});
