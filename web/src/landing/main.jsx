import React from 'react';
import { createRoot } from 'react-dom/client';
import '../fonts.js';
import Landing from './Landing.jsx';
import XatoChegarasi from '../shared/ui/XatoChegarasi.jsx';
import { installGlobalHandlers } from '../shared/lib/jurnal.js';
import { eskiKeshniTozala } from '../shared/lib/eskiKesh.js';
import './landing.css';

installGlobalHandlers();
eskiKeshniTozala();
createRoot(document.getElementById('root')).render(<XatoChegarasi modul="landing" joy="sahifa"><Landing /></XatoChegarasi>);
