import React from 'react';
import { createRoot } from 'react-dom/client';
import '../fonts.js';
import Landing from './Landing.jsx';
import XatoChegarasi from '../shared/ui/XatoChegarasi.jsx';
import { installGlobalHandlers, report } from '../shared/lib/jurnal.js';
import { eskiKeshniTozala } from '../shared/lib/eskiKesh.js';
import { tilKut } from '../i18n/index.js';
import './landing.css';

installGlobalHandlers();
eskiKeshniTozala();
/* Tezlik (testchi, 2026-10-22): tanlangan til lug'ati (ruscha/inglizcha alohida bo'lak) tayyor bo'lgach chiziladi — o'zbekchada kutish yo'q; yuklanmasa — o'zbekcha */
const chiz = () => createRoot(document.getElementById('root')).render(<XatoChegarasi modul="landing" joy="sahifa"><Landing /></XatoChegarasi>);
tilKut().then(chiz, (err) => { report('S3D-NET-101', { modul: 'i18n', err }); chiz(); });
