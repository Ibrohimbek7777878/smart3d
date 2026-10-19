import { useEffect, useRef } from 'react';
import { useSlice, set } from '../../../store/index.js';
import { report } from '../../../shared/lib/jurnal.js';
import { xatoMatni, tr } from '../../../i18n/index.js';
import { project } from '../../../store/project.js';
import { useViewer } from '../../../shared/design3d/useViewer.js';
import { s3Viewer, s3Mats, s3Box, s3Label } from '../../../shared/design3d/engine.js';
import { ichiniKorsaBoladi } from '../../../services/ichki.js';
import { faylYukla, preloadEksport } from '../files/actions.js';
import { select } from '../actions.js';
import { scene, mountSahna, unmountSahna } from './sahna.js';
import * as A from './actions.js';
import { t } from '../../../i18n/index.js';
import * as L from '../../../services/loyiha.js';
import { openMaterial } from '../catalog/material.js';
import { useRejim } from '../oddiy/rejim.js';
import { openSheet } from '../../../store/ui.js';
import { tahrirla } from '../chizish/chizish.js';
import { belgiGuruh } from '../../../services/belgi3d.js';
import { texnikaTuri, texnikaSukut, TEXNIKA_QISMLAR, TEXNIKA_PALITRA } from '../../../../../app/js/texnika3d.js';

/* egasi #167: detal kartasi — teshiklar (soni, tur bo'yicha) va kromka (tomonlar, qalinlik) matni; kesim bilan bog'lanmasa — "—" */
const son1 = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
function teshikMatn(tk) {
  if (!tk) return '—';
  const n = tk.tesh.length;
  if (!n) return t('sahna.teshik_yoq');
  return t('sahna.teshik_soni', { n }) + ' (' + tk.turlar.map(([k, c]) => t('teshik.' + k) + ' ' + c).join(', ') + ')';
}
/* TZ-38: shu detalga tegishli zapchast (soni, tur bo'yicha) */
function zapchastMatn(tk) {
  if (!tk) return '—';
  const n = (tk.zap || []).length;
  if (!n) return t('sahna.teshik_yoq');
  return t('sahna.teshik_soni', { n }) + ' (' + (tk.zapTurlar || []).map(([k, c]) => t('zapchast.tur_' + k) + ' ' + c).join(', ') + ')';
}
function kromkaMatn(tk) {
  if (!tk) return '—';
  if (!tk.edges.length) return t('sahna.kromka_yoq');
  return tk.edges.map(e => e.sides.map(s => t('kromka.' + s)).join(', ') + ' · ' + son1(e.qalinlik) + ' ' + t('umumiy.mm')).join('; ');
}

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
  /* TZ-23 B: Bazis loyihasida eshik ochilmaydi (faylda petlya tomoni yo'q) — o'rniga fasadsiz ko'rinish */
  const kr = useSlice('korinish'), bazis = !!(project.doc && project.doc.bazis);
  return {
    roomHost: host, roomOv: ov, notLoaded: !ed.sceneOn,
    loadText: ed.sceneErr ? xatoMatni('S3D-SCENE-101') : data.err ? xatoMatni('S3D-DATA-101') : t('sahna.yuklanmoqda'),
    vw: { b2: ed.view === '2d' ? 'var(--acc)' : 'transparent', t2: ed.view === '2d' ? 'var(--ink)' : 'var(--txt)', b3: ed.view === '3d' ? 'var(--acc)' : 'transparent', t3: ed.view === '3d' ? 'var(--ink)' : 'var(--txt)', sb: ed.spin ? 'var(--cyan)' : 'rgba(23,50,57,.9)', st: ed.spin ? '#06231E' : 'var(--txt)' },
    set2D: () => A.setView('2d'), set3D: () => A.setView('3d'), toggleSpin: A.toggleSpin, center: A.center,
    shot: () => faylYukla('rasm'),
    vrOk: ed.vrOk, vr: A.vr,
    toggleAllOpen: bazis ? A.bazisFasadsiz : () => A.toggleOpen(null),
    openAllLabel: bazis ? (kr.fasadsiz ? t('sahna.fasadlarni_korsatish') : t('sahna.fasadsiz_korish')) : anyOpen ? t('sahna.hammasini_yopish') : t('sahna.eshiklarni_ochish')
  };
}

/** birinchi ochilishdagi 3 maslahat */
export function useMaslahat() {
  const nav = useSlice('nav'), ed = useSlice('editor');
  return {
    tip: { on: nav.screen === 'app' && ed.tip < 3, text: t('sahna.maslahat' + (Math.min(ed.tip, 2) + 1)), n: Math.min(ed.tip, 2) + 1, btn: ed.tip >= 2 ? t('sahna.tushunarli') : t('sahna.keyingi') },
    tipNext: A.tipNext, tipSkip: A.tipSkip
  };
}

/** tanlangan modul kartasi: o'lcham (chegarasi bilan), surish, burish, nusxa, o'chirish, eshiklar, "Ichini ko'rish";
 *  TZ-23 E: "Material" — faqat shu modul uchun (o'zida tanlangan bo'lsa — nomi) */
export function useModulKarta() {
  const ed = useSlice('editor'), rj = useRejim();
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
  const xH = +(project.doc.room && project.doc.room.wall_height) || 2700, rotNow = ((+sm.rot || 0) % 360 + 360) % 360, zNow = +sm.z || 0;
  const tomonlar = [['old', 0], ['orqa', 180], ['chap', 90], ['ong', 270]].map(([k, r]) => ({ k, label: t('sahna.tomon_' + k), on: rotNow === r, go: () => A.tomon(k) }));
  const zTez = [['pol', 0], ['ustki', 1450], ['oyna', 900], ['shift', Math.max(0, xH - sm.h)]].map(([k, z]) => ({ k, label: t('sahna.z_' + k), z, on: zNow === z, go: () => A.setZ(z) }));
  /* egasi #232: o'rnatma texnika — qismlar (korpus, eshik, ruchka …) rangi palitradan yoki o'zi tanlagan */
  const tTuri = smF.category === 'appliance' ? texnikaTuri(smF.code) : null;
  const tSukut = tTuri ? texnikaSukut(tTuri) : null;
  const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');
  const texnika = tTuri ? {
    qismlar: TEXNIKA_QISMLAR[tTuri].map(q => {
      const joriy = (sm.texnikaRang && sm.texnikaRang[q] != null) ? sm.texnikaRang[q] : (tSukut[q] != null ? tSukut[q] : tSukut.korpus);
      return { id: q, label: t('texnika.q_' + q), joriy: hex(joriy), joriyN: joriy, tanla: (n) => A.setTexnikaRang(q, n) };
    }),
    palitra: TEXNIKA_PALITRA.map(c => ({ id: c.id, label: t('texnika.r_' + c.id), hex: hex(c.rang), n: c.rang })),
    sukut: A.texnikaSukutRang, ozgargan: !!sm.texnikaRang
  } : null;
  return {
    texnika,
    plc: {
      tomonlar, zTez, rotVal: ed.raw.rot ?? rotNow, zVal: ed.raw.z ?? zNow, zMax: Math.max(0, xH - sm.h),
      rotInput: ev => { const val = ev.target.value; set('editor', s => ({ raw: { ...s.raw, rot: val } })); },
      rotCommit: () => { if (ed.raw.rot !== undefined && ed.raw.rot !== '') A.setRot(ed.raw.rot); else set('editor', s => ({ raw: { ...s.raw, rot: undefined } })); },
      zInput: ev => { const val = ev.target.value; set('editor', s => ({ raw: { ...s.raw, z: val } })); },
      zCommit: () => { if (ed.raw.z !== undefined && ed.raw.z !== '') A.setZ(ed.raw.z); else set('editor', s => ({ raw: { ...s.raw, z: undefined } })); },
      key: ev => { if (ev.key === 'Enter') ev.target.blur(); }
    },
    show: true, deselect: () => select(null),
    sm: { openLabel: (smOpen ? t('umumiy.yopish') : t('sahna.ochish')) + (smF.category === 'drawer_base' ? t('sahna.tortmalar') : t('sahna.eshiklar')), canIns, noIns: !canIns,
      name: L.joyNomi(project.H, sm, smF), code: sm.frg, warn: ed.warn[sm.id] || '', hasWarn: !!ed.warn[sm.id],
      rows: [dimRow('w', t('sahna.eni')), dimRow('d', t('sahna.chuqurligi')), dimRow('h', t('sahna.boyi'))] },
    almash: rj.oddiy ? null : A.almashBosh,
    moveL: () => A.moveBy(-50), moveR: () => A.moveBy(50), rotate: A.rotate, dup: A.duplicate, askDel: A.askDelete,
    toggleModOpen: () => A.toggleOpen(sm.id), openInside: A.openInside,
    /* #182: Bazis modulining detallari o'z materialida (BZM-…) — modul slotini hisob ham, 3D ham e'tiborsiz qoldiradi ("Tanlandi" o'zgarib,
       kesim va 3D o'zgarmasdi). Shuning uchun Bazis moduli — Bazis materiallari ro'yxatiga (har biri "Almashtirish", doc.bazis.almash) */
    material: () => (project.doc.bazis && project.doc.bazis.fragment && project.doc.bazis.fragment.code === sm.frg ? openSheet('bazis', {}) : openMaterial('korpus', sm.id)),
    chizma: project.doc.chizmalar && project.doc.chizmalar[sm.frg] ? () => tahrirla(sm.id) : null,   // TZ-24 A: qo'lda chizilgan
    matLabel: sm.slots && sm.slots.korpus ? project.matName(sm.slots.korpus) : t('mebel.modul_materiali')
  };
}

/* detal kartasi: aylanuvchi mini-3D (dizayn kodi), o'lcham — haqiqiy */
function miniViewer(P) {
  return (T, h, o) => {
    const v = s3Viewer(T, h, o); v.M = s3Mats(T, null, null); v.grid.visible = false; v.shadow.visible = false;
    const s = P.size.map(x => x / 1000), geo = s3Box(T, s[0], s[1], s[2]), mt = P.mk === 'glass' ? new T.MeshStandardMaterial({ color: 0x6FA3AA, roughness: .2 }) : v.M[P.mk]();
    const g = new T.Group(); g.add(new T.Mesh(geo, mt), new T.LineSegments(new T.EdgesGeometry(geo), new T.LineBasicMaterial({ color: 0xFF7A45 }))); v.root.add(g);
    /* egasi #167: shu detalning teshiklari va kromkasi (dizayn o'qlari: x, y — bo'yi, z — chuqurligi; metr), kichik oynada ko'rinsin — kattaroq;
       WebGL'siz (SVG) ko'rinishda yo'q — InstancedMesh SVG da chizilmaydi */
    if (P.tk && !v.svg) g.add(belgiGuruh(T, { teshiklar: P.tk.tesh, kromkalar: P.tk.krom, zapchast: P.tk.zap || [] },   // TZ-38: shu detalning zapchasti (aniq joyida)
      
      { xf: (a) => [a[0] / 1000, a[2] / 1000, a[1] / 1000], xd: (a) => [a[0], a[2], a[1]], k: 0.001, minD: 16, minZ: 14, minKromka: 6, chiqish: 4 }));
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
    pt: P ? { name: tr(P.name), dim: P.dim + ' ' + t('umumiy.mm'), mat: P.mat, edge: P.tk ? kromkaMatn(P.tk) : P.edge, teshik: teshikMatn(P.tk), zapchast: zapchastMatn(P.tk), code: P.code, isMov: !!P.key, movLabel: it && P.key && it.isOpen(P.key) ? t('umumiy.yopish') : t('sahna.ochish') } : {}
  };
}
