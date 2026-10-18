import React from 'react';
import { createRoot } from 'react-dom/client';
import '../fonts.js';
import App from './App.jsx';
import { bootstrap } from './bootstrap.js';
import { installGlobalHandlers } from '../shared/lib/jurnal.js';
import XatoChegarasi from '../shared/ui/XatoChegarasi.jsx';
import './app.css';

installGlobalHandlers();
bootstrap();
createRoot(document.getElementById('root')).render(<XatoChegarasi modul="app" joy="sahifa"><App /></XatoChegarasi>);
