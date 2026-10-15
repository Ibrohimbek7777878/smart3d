import React from 'react';
import { createRoot } from 'react-dom/client';
import '../fonts.js';
import App from './App.jsx';
import { bootstrap } from './bootstrap.js';
import './app.css';

bootstrap();
createRoot(document.getElementById('root')).render(<App />);
