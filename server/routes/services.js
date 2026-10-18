/* SERVICES API (Kamchilik 18) — xizmatlar ro'yxati (app/data/services.json), o'qish — hamma. */
import express from 'express';
import { readJsonData } from '../lib/malumot.js';

export default function servicesRouter() {
  const r = express.Router();
  r.get('/api/services', (req, res) => {
    res.json(readJsonData('services.json') || { services: [] });
  });
  return r;
}
