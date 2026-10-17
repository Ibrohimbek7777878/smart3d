/* app/data/*.json — sayt bilan umumiy ma'lumot (bitta manba). Fayl yo'q bo'lsa — null. */
import fs from 'fs';
import path from 'path';
import { APP_DIR } from './config.js';

export function readJsonData(name) {
  const p = path.join(APP_DIR, 'data', name);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}
