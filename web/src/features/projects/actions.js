import { get, set } from '../../store/index.js';
import { project } from '../../store/project.js';
import { S } from '../../store/session.js';
import { toast, confirm, xato } from '../../store/ui.js';
import * as L from '../../services/loyiha.js';
import { clamp } from '../../shared/lib/format.js';
import { runAI } from '../editor/ai/actions.js';

/* TZ-19: loyiha hayoti — ro'yxat, ochish, yangi, fayldan, o'chirish, saytdan kelgan modul. */
const EDITOR = { screen: 'app' };
const editorStart = (tip) => set('editor', { step: 2, done: { 1: true }, tip, sel: null, part: null, warn: {} });

/** "Loyihalarim" — serverdan ro'yxat */
export async function goProjects() {
  set('nav', { screen: 'projects' });
  set('editor', { sel: null, part: null });
  if (!S.loggedIn) { set('projects', { list: [] }); return; }
  const list = await S.listProjects().catch(() => null);
  if (list) set('projects', { list });
}

export async function openProject(id) {
  await project.load();
  if (await S.openProject(id)) {
    set('nav', EDITOR); set('editor', { step: 2, done: { 1: true }, tip: 3 });
    project.changed('room', true);
  }
}

/** "+ Yangi loyiha" → onboarding */
export function newProject() {
  S.resetCurrent(); project.reset(); project.res = null;
  set('project', { name: 'Yangi loyiha', client: '' });
  set('editor', { sel: null, part: null, warn: {} });
  set('nav', { screen: 'onb1' });
}

/** onboarding → muharrir: AI matni bo'lsa — AI quradi, aks holda xona (+ oshxona namunasi) */
export async function openEditor() {
  await project.load();
  if (!project.H) { xato('S3D-DATA-101', { modul: 'projects' }); return; }
  S.resetCurrent();
  const o = get().onb, ai = get().ai;
  if (o.kind === 'ai' && ai.text.trim()) { project.reset(); await runAI(true); }
  else {
    const room = { w: clamp(+o.room.w || 3600, 1500, 9000), d: clamp(+o.room.d || 3000, 1500, 9000), h: clamp(+o.room.h || 2700, 2200, 4000) };
    set('onb', { room });
    project.fromOnboarding(o.kind, room);
  }
  set('nav', EDITOR); editorStart(0);
  project.changed('room', true);
  applyPending();
}

/** saytdagi "Bu modulni loyihamga qo'shish" — haqiqiy katalogdan, chegarasiga keltirilgan eni bilan */
export function applyPending() {
  const pd = get().nav.pending;
  if (!pd || !project.H) return;
  const frag = project.H.catalog[pd.mod];
  set('nav', { pending: null });
  if (!frag) return;
  const p = L.addPlacement(project.doc, frag);
  const warn = L.setSize(p, frag, 'w', pd.w);
  set('editor', s => ({ sel: p.id, warn: warn ? { ...s.warn, [p.id]: warn } : s.warn }));
  project.changed('items', true);
  setTimeout(() => toast('Saytdagi modul loyihaga qo\'shildi: ' + pd.mod + ' · ' + p.w + ' mm'), 400);
}

export async function openPending() {
  await project.load();
  if (!project.H) return;
  S.resetCurrent(); project.reset();
  set('project', { name: 'Yangi loyiha' });
  set('nav', EDITOR); set('editor', { step: 2, done: { 1: true }, tip: 3 });
  project.changed('room', true);
  applyPending();
}

/** loyiha fayli (smart3d-project.json — eski va yangi sayt bir xil shakl); serverda yangi loyiha bo'lib saqlanadi */
export function openFile(ev) {
  const f = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!f) return;
  const rd = new FileReader();
  rd.onload = async () => {
    let p = null;
    try { p = JSON.parse(String(rd.result)); } catch (_) { /* pastda tekshiriladi */ }
    if (!p || p.app !== 'smart3d' || !p.doc || !p.doc.room || !Array.isArray(p.doc.placements)) { xato('S3D-PROJ-101', { modul: 'projects', xabar: 'fayl: ' + f.name.slice(0, 60) }); return; }
    await project.load();
    S.resetCurrent();
    set('nav', EDITOR); set('editor', { step: 2, done: { 1: true }, tip: 3 });
    project.apply(p);
    S.changed();
    toast('Loyiha fayldan ochildi — ' + p.doc.placements.length + ' mebel');
  };
  rd.readAsText(f);
}

/** o'chirish = yashirish (arxiv), eski saytdagidek */
export function askRemove(p) {
  confirm({ title: 'Loyihani o\'chirasizmi?', text: '"' + (p.name || 'Loyiha') + '" ro\'yxatdan olib tashlanadi.', ok: 'O\'chirish', danger: true,
    yes: async () => {
      if (await S.removeProject(p.id)) { toast('Loyiha o\'chirildi'); goProjects(); }
      else xato('S3D-NET-101', { matn: 'O\'chirilmadi — internetni tekshiring', modul: 'projects' });
    } });
}
