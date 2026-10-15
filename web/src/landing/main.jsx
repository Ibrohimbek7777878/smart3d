import React from 'react';
import { createRoot } from 'react-dom/client';
import '../fonts.js';
import Landing from './Landing.jsx';
import XatoChegarasi from '../shared/ui/XatoChegarasi.jsx';
import { installGlobalHandlers } from '../shared/lib/jurnal.js';
import './landing.css';

installGlobalHandlers();
createRoot(document.getElementById('root')).render(<XatoChegarasi modul="landing" joy="sahifa"><Landing /></XatoChegarasi>);
