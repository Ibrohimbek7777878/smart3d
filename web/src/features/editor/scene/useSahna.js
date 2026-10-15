import { useEffect, useRef } from 'react';
import { useSlice, set } from '../../../store/index.js';
import { report } from '../../../shared/lib/jurnal.js';
import { xatoMatn } from '../../../../../app/js/xatolar.js';
import { project } from '../../../store/project.js';
import { useViewer } from '../../../shared/design3d/useViewer.js';
import { s3Viewer, s3Mats, s3Box, s3Label, S3_TIPS } from '../../../shared/design3d/engine.js';
import { ichiniKorsaBoladi } from '../../../services/ichki.js';
import { faylYukla, preloadEksport } from '../files/actions.js';
import { openAi } from '../ai/actions.js';
import { select } from '../actions.js';
import { scene, mountSahna, unmountSahna } from './sahna.js';
import * as A from './actions.js';

/** sahna: yaratish/tozalash va ko'rinish (2D/3D, aylanish, tanlov) — 3D bilan sinxron */
export function useSahnaView() {
  const data = useSlice('data'), ed = useSlice('editor');
  const host = useRef(null), ov = useRef(null);
  useEffect(() => {
    if (!data.ready || !host.current) return undefined;
    let alive = true;
    mountSahna(host.current, A.roomTap, () => alive)
      .then(() => preloadEksport())                          // fayllar moduli — sahnadan keyin, fonda
      .catch(e => { report('S3D-SCENE-101', { modul: 'editor/scene', err: e }); set('editor', { sceneErr: true }); });
    return () => { alive = false; unmountSahna(); };
  }, [data.ready]);
  useEffect(() => { if (scene.sahna) scene.sahna.setMode(ed.view); }, [ed.view]);
  useEffect(() => { if (scene.sahna) scene.sahna.spin(ed.spin); }, [ed.spin]);
  useEffect(() => { if (scene.sahna) scene.sahna.select(ed.sel); }, [ed.sel]);
  const it = scene.sahna && scene.sahna.items;
  const anyOpen = it ? it.moverKeys(null).some(k => it.isOpen(k)) : false;
  return {
    roomHost: host, roomOv: ov, notLoaded: !ed.sceneOn,
    loadText: ed.sceneErr ? xatoMatn('S3D-SCENE-101') : data.err || '3D sahna yuklanmoqda…',
    vw: { b2: ed.view === '2d' ? 'var(--acc)' : 'transparent', t2: ed.view === '2d' ? 'var(--ink)' : 'var(--txt)', b3: ed.view === '3d' ? 'var(--acc)' : 'transparent', t3: ed.view === '3d' ? 'var(--ink)' : 'var(--txt)', sb: ed.spin ? 'var(--cyan)' : 'rgba(23,50,57,.9)', st: ed.spin ? '#06231E' : 'var(--txt)' },
    set2D: () => A.setView('2d'), set3D: () => A.setView('3d'), toggleSpin: A.toggleSpin, center: A.center,
    shot: () => faylYukla('rasm'),
    vrOk: ed.vrOk, vr: A.vr,
    toggleAllOpen: () => A.toggleOpen(null), openAllLabel: anyOpen ? 'Hammasini yopish' : 'Eshiklarni ochish',
    openAi
  };
}

/** birinchi ochilishdagi 3 maslahat */
export function useMaslahat() {
  const nav = useSlice('nav'), ed = useSlice('editor');
  return {
    tip: { on: nav.screen === 'app' && ed.tip < 3, text: S3_TIPS[Math.min(ed.tip, 2)], n: Math.min(ed.tip, 2) + 1, btn: ed.tip >= 2 ? 'Tushunarli' : 'Keyingi' },
    tipNext: A.tipNext, tipSkip: A.tipSkip
  };
}

/** tanlangan modul kartasi: o'lcham (chegarasi bilan), surish, burish, nusxa, o'chirish, eshiklar, "Ichini ko'rish" */
export function useModulKarta() {
  const ed = useSlice('editor');
  useSlice('project');
  const sm = project.pl(ed.sel), smF = project.fr(sm), it = scene.sahna && scene.sahna.items;
  if (!sm || !smF || ed.part) return { show: false };
  const smOpen = it ? it.moverKeys(sm.id).some(k => it.isOpen(k)) : false;
  const dimRow = (key, label) => ({
    label, min: smF['min_' + key] || '—', max: smF['max_' + key] || '—', val: ed.raw[key] ?? sm[key],
    dec: () => A.setDim(key, sm[key] - 10), inc: () => A.setDim(key, sm[key] + 10),
    onInput: ev => { const val = ev.target.value; set('editor', s => ({ raw: { ...s.raw, [key]: val } })); },
    commit: () => { if (ed.raw[key] !== undefined) A.setDim(key, ed.raw[key]); },
    key: ev => { if (ev.key === 'Enter') ev.target.blur(); }
  });
  const canIns = ichiniKorsaBoladi(smF);
  return {
    show: true, deselect: () => select(null),
    sm: { openLabel: (smOpen ? 'Yopish' : 'Ochish') + (smF.category === 'drawer_base' ? ' · tortmalar' : ' · eshiklar'), canIns, noIns: !canIns,
      name: sm.name || smF.name, code: sm.frg, warn: ed.warn[sm.id] || '', hasWarn: !!ed.warn[sm.id],
      rows: [dimRow('w', 'Eni'), dimRow('d', 'Chuqurligi'), dimRow('h', 'Bo\'yi')] },
    moveL: () => A.moveBy(-50), moveR: () => A.moveBy(50), rotate: A.rotate, dup: A.duplicate, askDel: A.askDelete,
    toggleModOpen: () => A.toggleOpen(sm.id), openInside: A.openInside
  };
}

/* detal kartasi: aylanuvchi mini-3D (dizayn kodi), o'lcham — haqiqiy */
function miniViewer(P) {
  return (T, h, o) => {
    const v = s3Viewer(T, h, o); v.M = s3Mats(T, null, null); v.grid.visible = false; v.shadow.visible = false;
    const s = P.size.map(x => x / 1000), geo = s3Box(T, s[0], s[1], s[2]), mt = P.mk === 'glass' ? new T.MeshStandardMaterial({ color: 0x6FA3AA, roughness: .2 }) : v.M[P.mk]();
    const g = new T.Group(); g.add(new T.Mesh(geo, mt), new T.LineSegments(new T.EdgesGeometry(geo), new T.LineBasicMaterial({ color: 0xFF7A45 }))); v.root.add(g);
    v.target.set(0, 0, 0); v.dist = Math.max(...s) * 2.5 + .12;
    const tn = s.indexOf(Math.min(...s)); v.phi = tn === 1 ? .9 : .32; v.theta = tn === 0 ? 1.05 : -.5; v.auto = true;
    const an = (x, y, z) => { const q = new T.Object3D(); q.position.set(x, y, z); g.add(q); return q; };
    if (P.size[0] >= 30) s3Label(v, Math.round(P.size[0]) + '', '', an(0, -s[1] / 2 - .02, s[2] / 2 + .02), 'dim').op = 1;
    if (P.size[1] >= 30) s3Label(v, Math.round(P.size[1]) + '', '', an(s[0] / 2 + .03, 0, s[2] / 2), 'dim').op = 1;
    if (P.size[2] >= 30) s3Label(v, Math.round(P.size[2]) + '', '', an(s[0] / 2 + .03, -s[1] / 2, 0), 'dim').op = 1;
    return v;
  };
}

export function useDetalKarta() {
  const ed = useSlice('editor'), P = ed.part, it = scene.sahna && scene.sahna.items;
  const [miniHost, miniOv] = useViewer(!!P, P ? miniViewer(P) : null, [P && P.id]);
  return {
    hasPart: !!P, closePart: A.closePart, miniHost, miniOv, togglePartOpen: A.togglePartOpen,
    pt: P ? { name: P.name, dim: P.dim + ' mm', mat: P.mat, edge: P.edge, code: P.code, isMov: !!P.key, movLabel: it && P.key && it.isOpen(P.key) ? 'Yopish' : 'Ochish' } : {}
  };
}
