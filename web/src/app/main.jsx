import React from 'react';
import { createRoot } from 'react-dom/client';
import '../fonts.js';
import App from './App.jsx';
import { bootstrap } from './bootstrap.js';
import { installGlobalHandlers, report } from '../shared/lib/jurnal.js';
import XatoChegarasi from '../shared/ui/XatoChegarasi.jsx';
import { get, set } from '../store/index.js';
import { t, til, tilKut } from '../i18n/index.js';
import './app.css';

installGlobalHandlers();
const dastlabkiNom = get().project.name;   // store import paytida (lug'at yuklanmagan bo'lsa — o'zbekcha) hisoblangan sukut nomi
bootstrap();
/* Tezlik (testchi, 2026-10-22): tanlangan til lug'ati (ruscha/inglizcha alohida bo'lak) tayyor bo'lgach chiziladi — o'zbekchada kutish yo'q (darhol).
 * Lug'at yuklanmasa (tarmoq) — o'zbekcha matn bilan chiziladi, xato kodi bilan jurnalga yoziladi. */
const chiz = () => {
  if (til() !== 'uz' && get().project.name === dastlabkiNom) set('project', { name: t('umumiy.yangi_loyiha') });
  createRoot(document.getElementById('root')).render(<XatoChegarasi modul="app" joy="sahifa"><App /></XatoChegarasi>);
};
tilKut().then(chiz, (err) => { report('S3D-NET-101', { modul: 'i18n', err }); chiz(); });
