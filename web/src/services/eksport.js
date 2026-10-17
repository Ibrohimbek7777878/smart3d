/* TZ-09 6-bosqich: "Fayllar" — haqiqiy fayllar. Eski app/js/app.js dagi eksport funksiyalari SO'ZMA-SO'Z
 * (integrityCheck, exportOBJ/GLB, holes, cutlist, XNC, hisobot, Excel, smeta, loyiha, BPJ, GibLab, CNC) —
 * global `state` o'rniga kontekst: c = { doc, H, res, name, matCode, fasadCode, sheet, nestCfg, sp, toast }.
 * Stanok fayllari (TZ-01): SINOV belgisi bilan; Biesse/Homag — TZ-11 gacha berilmaydi; BPJ — faqat admin (TZ-17 gacha). */
import * as THREE from 'three';
import { validateDoc } from '../../../app/js/engine/rules.js';
import { buildOBJ, cutlistCSV, smetaCSV, xncCSV, download, hasDownloadHandler } from '../../../app/js/engine/objexport.js';
import { buildGLB } from '../../../app/js/engine/glbexport.js';
import { buildXLSX, XLSX_YORLIQ_UZ } from '../../../app/js/engine/xlsxexport.js';
import { buildBPJ } from '../../../app/js/engine/bpj.js';
import { buildProject as buildGlProject } from '../../../app/js/engine/giblab.js';
import { cncBundle, cutGCode } from '../../../app/js/engine/cnc.js';
import { SimpleZip } from '../../../app/js/engine/xlsxexport.js';
import { stanokModeli } from '../../../app/js/engine/post/smart3d.js';
import { projectYoz } from '../../../app/js/engine/post/project.js';
import { kdtFayllar } from '../../../app/js/engine/post/kdt.js';
import { cp1251 } from '../../../app/js/engine/post/xml.js';
import { render1080p, render360Panorama } from '../../../app/js/engine/photo-render.js';
import { s3n } from '../shared/design3d/engine.js';
import { t, til } from '../i18n/index.js';
import { modulNomi, materialNomi } from './loyiha.js';

/** data:URL → Blob (rasm Telegram'ga yuborilganda) */
const dataUrlBlob = (u) => { const [h, b] = String(u).split(','); const bin = atob(b || ''); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: (/data:([^;]+)/.exec(h) || [])[1] || 'application/octet-stream' }); };

/* TZ-18 6-bosqich: hujjat (PDF hisobot, Excel) va xabarlar — tanlangan tilda. O'zbekchada satr nomlari dvigatel
   yozganicha (avvalgi hujjat bilan aynan); rus/inglizda — tuzilgan maydonlardan qayta yig'iladi.
   Mahsulot (ERP, Bazis) va furnitura nomlari tarjima qilinmaydi (TZ-18 §2). Stanok fayllari — o'zgarmaydi. */
const LOC = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-GB' };
const BIRLIK = ['varaq', 'm', 'dona', 'detal', 'komplekt'];
function hujjatTili(c) {
  const uz = til() === 'uz';
  const M = (c.H && c.H.materials) || {};
  const asl = (code) => { const m = [...(M.panel_materials || []), ...(M.edge_materials || [])].find(x => x.code === code); return m ? m.name : code; };
  const tx = (l) => (l.taxminiy ? t('narx.taxminiy') : '');
  return {
    uz, locale: LOC[til()] || 'uz-UZ',
    modul: (l) => (uz || !c.H || !c.H.catalog[l.code] ? l.name : modulNomi(c.H, c.H.catalog[l.code])),
    qator: (l) => {
      if (uz) return l.name;
      if (/^Plita/.test(l.group)) return materialNomi(c.H, l.code, asl(l.code)) + ' ' + (l.util != null ? t('hujjat.plita_q', { n: l.qty, p: l.util }) : t('hujjat.plita_taxmin', { n: l.qty }));
      if (l.group === 'Kromka') return materialNomi(c.H, l.code, asl(l.code)) + tx(l);
      if (l.group === 'Xizmatlar') return (l.code === 'hole:tanlanmagan' ? t('hujjat.teshik_tanlanmagan', { n: l.qty }) : t('hujjat.teshik_q', { n: l.qty })) + tx(l);
      if (l.group === 'Ish haqi') return t('hujjat.ish_haqi_q', { n: l.qty }) + tx(l);
      return l.name;
    },
    birlik: (u) => (uz || !BIRLIK.includes(u) ? u : t('hujjat.u_' + u)),
    yorliq: uz ? XLSX_YORLIQ_UZ : {
      loyiha: t('hujjat.x_loyiha'), sarlavha: t('hujjat.x_sarlavha'), sana: t('hujjat.x_sana'), locale: LOC[til()],
      b1: t('hujjat.x_b1'), b1h: t('hujjat.x_b1h').split('|'), b1j: t('hujjat.x_b1j'), yoq: t('hujjat.x_yoq'), narxYoq: t('hujjat.x_narx_yoq'),
      b2: t('hujjat.x_b2'), b2h: t('hujjat.x_b2h').split('|'), b2j: t('hujjat.x_b2j'), b3: t('hujjat.x_b3'), b3h: t('hujjat.x_b3h').split('|'), b3j: t('hujjat.x_b3j'),
      b4: t('hujjat.x_b4'), b4h: t('hujjat.x_b4h').split('|'), b4j: t('hujjat.x_b4j'), b5: t('hujjat.x_b5'), b5h: t('hujjat.x_b5h').split('|'),
      tannarx: t('hujjat.x_tannarx'), tannarxT: t('hujjat.x_tannarx_t'), tannarxA: t('hujjat.x_tannarx_a'),
      ustama: t('hujjat.x_ustama'), ustamaT: t('hujjat.x_ustama_t'), ustamaA: t('hujjat.x_ustama_a'),
      yakuniy: t('hujjat.x_yakuniy'), toliqEmas: t('hujjat.x_toliq_emas'), dona: t('hujjat.x_dona')
    }
  };
}

const fname = (c) => (c.name || 'smart3d').trim().replace(/\s+/g, '_');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const view = (c) => Object.assign({}, c.doc, { placements: c.H.viewPlacements(c.doc) });

/** Eksportdan oldin tekshiruv — fayl/modul buzilmasligi uchun (eski integrityCheck) */
function ok(c, needCutlist) {
  if (!c.doc || !c.doc.placements || !c.doc.placements.length) { c.toast(t('hujjat.t_bosh')); return false; }
  if (!c.H) { c.toast(t('hujjat.t_baza')); return false; }
  const v = validateDoc(c.doc, { catalog: c.H.catalog });
  if (!v.ok) { c.toast(t('hujjat.t_valid', { s: (v.errors[0] && v.errors[0].message) || '' })); return false; }
  if (needCutlist && !(c.res && c.res.cutlists && c.res.cutlists.length)) { c.toast(t('hujjat.t_cutlist')); return false; }
  return true;
}
/* TZ-19: xato — c.fail(e, nom) orqali (kod bilan xabar va jurnal: S3D-EXP-101); c.fail bo'lmasa — oddiy xabar */
const failed = (c, e, nom) => { if (c.fail) c.fail(e, nom); else { console.error('eksport', e); c.toast((nom || t('hujjat.f_xato')) + ': ' + e.message); } };
function safe(c, fn) { try { fn(); } catch (e) { failed(c, e, t('hujjat.f_fayl')); } }

export const eksport = {
  /* ── Mijozga ── */
  hisobot(c) {
    const res = c.res;
    if (!res || !res.priceRes) { c.toast(t('hujjat.t_avval')); return; }
    const T = hujjatTili(c), th = t('hujjat.r_th').split('|');
    const name = c.name || 'Smart3D';
    const pr = res.priceRes, prod = res.prod, s = (res.nest && res.nest.summary) || {};
    const fmt = (x) => s3n(x == null ? 0 : x);
    const rows = pr.lines.map(l =>
      `<tr><td>${esc(T.modul(l))}<br><small>${esc(l.code)} · ${Number(l.w) || 0}×${Number(l.d) || 0} ${esc(t('umumiy.mm'))}</small></td><td class=n>${Number(l.qty) || 0}</td><td class=n>${fmt(l.unit_price)}</td><td class=n>${fmt(l.amount)}</td></tr>`
    ).join('') || `<tr><td colspan=4>${esc(t('hujjat.r_bosh'))}</td></tr>`;
    const prodRows = ((prod && prod.lines) || []).map(l =>
      `<tr><td>${esc(T.qator(l) || l.material || '')}</td><td class=n>${esc(T.birlik(l.unit || ''))}</td><td class=n>${fmt(l.amount != null ? l.amount : l.cost)}</td></tr>`).join('');
    /* qoidalar S4/6.3: hujjatda logo — dizayndagi belgi; Bittada logo fayli kelganda shu joyga (TZ-08) */
    const html = `<!DOCTYPE html><html lang="${til()}"><head><meta charset="utf-8"><title>${esc(t('hujjat.r_title', { nom: name }))}</title>
<style>
  body{font-family:Manrope,Segoe UI,Arial,sans-serif;color:#111;margin:28px;font-size:13px}
  .logo{display:flex;align-items:center;gap:10px;margin-bottom:14px}
  .logo i{width:38px;height:38px;border-radius:12px;background:#FF7A45;color:#2A1206;display:grid;place-items:center;font-weight:800;font-style:normal;font-size:16px}
  .logo b{font-size:18px;display:block;line-height:1.1} .logo small{font-size:11px;color:#555}
  .logo .usta{height:28px;max-width:120px;object-fit:contain;margin-left:auto}   /* usta logosi — Bittada belgisidan kichik (S4) */
  h1{font-size:20px;margin:0 0 2px} h2{font-size:15px;margin:18px 0 8px;border-bottom:2px solid #333;padding-bottom:3px}
  .meta{color:#555;font-size:12px;margin-bottom:14px}
  table{width:100%;border-collapse:collapse;margin:6px 0}
  th,td{border:1px solid #999;padding:5px 8px;text-align:left}
  th{background:#eee} .n{text-align:right} small{color:#666}
  .tot{font-weight:700;font-size:15px;margin-top:8px;text-align:right}
  .stats{display:flex;gap:18px;margin:6px 0} .stats b{font-size:16px}
  footer{margin-top:24px;color:#777;font-size:11px;border-top:1px solid #ccc;padding-top:6px}
  @media print{body{margin:12mm}}
</style></head><body>
<div class="logo"><i>3D</i><span><b>Smart3D</b><small>by Bittada</small></span>${/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(c.logo || '') ? `<img class="usta" src="${c.logo}" alt="${esc(t('hujjat.r_logo_alt'))}">` : ''}</div>
<h1>${esc(name)}</h1>
<div class="meta">${esc(t('hujjat.r_meta', { d: new Date().toLocaleDateString(T.locale), m: c.matCode }))}</div>
<h2>${esc(t('hujjat.r_k'))}</h2>
<table><thead><tr><th>${esc(th[0])}</th><th class=n>${esc(th[1])}</th><th class=n>${esc(th[2])}</th><th class=n>${esc(th[3])}</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="tot">${esc(t('hujjat.r_jami', { s: fmt(pr.total) }))}${pr.incomplete ? ' *' : ''}</div>
${pr.incomplete ? `<div class="meta">${esc(t('hujjat.r_toliq_emas'))}</div>` : ''}
${prodRows ? `<h2>${esc(t('hujjat.r_ich'))}</h2><table><tbody>${prodRows}</tbody></table>
<div class="tot">${esc(t('hujjat.r_ich_jami', { s: fmt(prod.total) }))}</div>` : ''}
<h2>${esc(t('hujjat.r_raskroy'))}</h2>
<div class="stats">
  <span><b>${s.total_sheets || 0}</b> ${esc(t('hujjat.r_varaq'))}</span>
  <span><b>${s.utilization_pct || 0}%</b> ${esc(t('hujjat.r_foyd'))}</span>
  <span><b>${s.waste_m2 || 0}</b> ${esc(t('hujjat.r_ochiq'))}</span>
  <span><b>${s.remnant_count || 0}</b> ${esc(t('hujjat.r_qoldiq', { m: s.remnant_usable_m2 || 0 }))}</span>
  <span><b>${fmt(s.material_cost)}</b> ${esc(t('hujjat.r_varaq_x'))}</span>
</div>
<footer>Smart3D by Bittada · ${esc(name)} · ${new Date().toISOString().slice(0, 10)} · ${esc(t('hujjat.r_sahifa'))}</footer>
<script>window.onload = () => { window.print(); };</script>
</body></html>`;
    const w = window.open('', '_blank');
    if (!w) { c.toast(t('hujjat.t_oyna')); return; }
    w.document.write(html); w.document.close();
  },
  async rasm(c) {
    if (!c.sp) return;
    const sp = c.sp, bg = sp.scene.background, walls = sp.groups.walls3d.children.map(w => w.visible);
    try {
      c.toast(t('hujjat.t_rasm'));
      sp.scene.background = new THREE.Color(0x0C1C22);              // mavzu foni shaffof — rasmda dizayn rangi
      const r = await render1080p(sp, { download: !hasDownloadHandler() });
      if (hasDownloadHandler()) download(fname(c) + '-1080p.png', dataUrlBlob(r.dataUrl), 'image/png');   // TZ-16: Telegram — bot chatiga
      c.toast(t('hujjat.t_rasm_ok', { w: r.width, h: r.height }));
    } catch (e) { failed(c, e, t('hujjat.f_rasm')); }
    finally { sp.scene.background = bg; sp.groups.walls3d.children.forEach((w, i) => { w.visible = walls[i]; }); sp._resize(); sp._invalidate(); }
  },
  async panorama(c) {
    if (!c.sp) return;
    const sp = c.sp, bg = sp.scene.background;
    try {
      c.toast(t('hujjat.t_pano'));
      sp.scene.background = new THREE.Color(0x0C1C22);
      for (const w of sp.groups.walls3d.children) w.visible = true;   // xona markazidan — hamma devor ko'rinadi
      const r = await render360Panorama(sp, { download: !hasDownloadHandler() });
      if (hasDownloadHandler()) download(fname(c) + '-360.jpg', dataUrlBlob(r.dataUrl), 'image/jpeg');
      c.toast(t('hujjat.t_pano_ok'));
    } catch (e) { failed(c, e, t('hujjat.f_pano')); }
    finally { sp.scene.background = bg; sp._resize(); sp._invalidate(); }
  },
  glb(c) {
    if (!ok(c, false)) return;
    safe(c, () => {
      const r = buildGLB(view(c), c.H.catalog);
      download(fname(c) + '-model.glb', r.glb, 'model/gltf-binary');
      c.toast(t('hujjat.t_glb', { n: r.stats.totalBoxes, kb: Math.round(r.stats.byteLength / 1024) }));
    });
  },
  /* ── Sexga ── */
  excel(c) {
    if (!ok(c, true)) return;
    safe(c, () => {
      const res = c.res;
      const T = hujjatTili(c);
      const x = buildXLSX({ doc: c.doc, catalog: c.H.catalog, materials: c.H.effectiveMaterials(c.sheet), priceRes: res.priceRes, prod: res.prod,
        nest: res.nest, sheet: c.sheet, materialCode: c.matCode, projectName: c.name || (T.uz ? 'Smart3D Loyihasi' : T.yorliq.loyiha), services: c.H.services,
        yorliq: T.yorliq, modulNomi: T.modul, qatorNomi: T.qator, birlik: T.birlik });
      download(fname(c) + '-smeta.xlsx', x, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      c.toast(t('hujjat.t_excel'));
    });
  },
  cutlist(c) { if (ok(c, true)) safe(c, () => download('smart3d-cutlist.csv', cutlistCSV(c.res.cutlists), 'text/csv')); },
  loyiha(c) {
    if (!ok(c, false)) return;
    download('smart3d-project.json', JSON.stringify({ app: 'smart3d', v: 2, ts: Date.now(), material: c.matCode, fasad: c.fasadCode, sheet: c.sheet || null, name: c.name, doc: c.doc }, null, 1), 'application/json');
  },
  smetaCsv(c) {
    if (!ok(c, true)) return;
    const pr = c.res.priceRes;
    download('smart3d-smeta.csv', smetaCSV(pr.lines.map(l => ({ group: 'Mebel', name: l.name, qty: l.qty, unit: 'dona', unit_price: l.unit_price, amount: l.amount })), pr.total), 'text/csv');
  },
  obj(c) {
    if (!ok(c, false)) return;
    /* faqat tanlangan modul (c.opt.id — AI yangi qurgan modul, yoki editor.sel); tanlanmagan — butun loyiha */
    const id = c.opt && c.opt.id != null ? c.opt.id : c.sel;
    const pl = id != null ? c.doc.placements.find(p => p.id === id) : null;
    const nom = pl ? '-' + String((c.doc.chizmalar && c.doc.chizmalar[pl.frg] && c.doc.chizmalar[pl.frg].nom) || (c.H.catalog[pl.frg] && c.H.catalog[pl.frg].name) || pl.frg).trim().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '') : '';
    const r = buildOBJ(view(c), c.H.catalog, pl ? { only: pl.id } : {});
    const fn = pl ? fname(c) + nom : 'smart3d-model';
    download(fn + '.obj', r.obj.replace('mtllib smart3d.mtl', 'mtllib ' + fn + '.mtl'), 'text/plain');
    setTimeout(() => download(fn + '.mtl', r.mtl, 'text/plain'), 350);
    c.toast(t('hujjat.t_obj', { n: r.placements.length }));
  },
  teshiklar(c) {
    if (!ok(c, false)) return;
    const r = buildOBJ(view(c), c.H.catalog, { cutlists: (c.res && c.res.cutlists) || [] });
    download('smart3d-holes.json', JSON.stringify({ version: 1, unit: 'mm', holes: r.holes, placements: r.placements }, null, 1), 'application/json');
  },
  /* ── Stanokka (TZ-01: SINOV, sexda tekshirilmagan) ── */
  giblab(c) {
    if (!ok(c, true)) return;
    safe(c, () => {
      const res = c.res, n = c.nestCfg || {};
      const gl = buildGlProject({ cutlists: res.cutlists, materials: c.H.materials, modelName: c.name || 'Smart3D', materialCode: c.matCode, nest: res.nest,
        settings: { kerf: n.kerf, trimL: n.trimL, trimW: n.trimW } });
      download(fname(c) + '.project', gl.xml, 'application/xml');
      const ops = (gl.xml.match(/<operation /g) || []).length, st = gl.stats || {};
      c.toast(t('hujjat.t_giblab', { o: ops, p: st.placed, d: st.parts, v: st.sheets }));
      if (gl.warnings && gl.warnings.length) console.warn('GibLab ogohlantirish:', gl.warnings);
    });
  },
  xnc(c) {
    if (!ok(c, true)) return;
    download(fname(c) + '-xnc.csv', '﻿' + xncCSV(c.res.cutlists, c.H.materials, c.H.catalog), 'text/csv');
    c.toast(t('hujjat.t_xnc'));
  },
  _cnc(c, fn, suffix, mime, msg) {
    if (!ok(c, true)) return;
    safe(c, () => { download(fname(c) + suffix, fn(c.res.nest, c.res.cutlists), mime); c.toast(msg + t('hujjat.t_sinov')); });
  },
  dxf(c) { this._cnc(c, (n, cl) => cncBundle(n, cl).dxf, '-raskroy.dxf', 'application/dxf', t('hujjat.t_dxf')); },
  gcode(c) { this._cnc(c, (n, cl) => cutGCode(n, cl, { toolDia: 6.0, addTabs: true }), '-kesim.nc', 'text/plain', t('hujjat.t_gcode')); },
  ptp(c) { this._cnc(c, (n, cl) => cncBundle(n, cl).ptp, '-ptp.csv', 'text/csv', t('hujjat.t_ptp')); },
  nc(c) { this._cnc(c, (n, cl) => cncBundle(n, cl).nc, '-teshik.nc', 'text/plain', t('hujjat.t_nc')); },
  altendorf(c) { this._cnc(c, (n, cl) => cncBundle(n, cl).altendorf, '-altendorf-fazali-kesim.txt', 'text/plain', t('hujjat.t_alt')); },
  /* TZ-11: sexdagi zanjir — Bazis eksportidek GibLab .project (GibLab kesimni o'zi optimallashtiradi, arra fayllarini o'zi
     chiqaradi) va KDT prisadka fayllari (ZIP). 30 ta haqiqiy buyurtmada tekshirilgan; texnolog sinovigacha — SINOV, faqat admin. */
  _stanok(c) {
    return stanokModeli({ cutlists: c.res.cutlists, placements: c.res.placements, catalog: c.H.catalog, materials: c.H.materials, nom: c.name || 'Smart3D' });
  },
  giblabBazis(c) {
    if (!ok(c, true)) return;
    safe(c, () => {
      const { model, ogoh } = this._stanok(c);
      download(fname(c) + '-bazis.project', cp1251(projectYoz(model)), 'application/xml');
      c.toast(t('hujjat.t_giblab_bazis', { d: model.detallar.length, s: model.detallar.reduce((a, d) => a + d.soni, 0) })
        + (ogoh.spTeshik ? t('hujjat.t_sp_teshik', { n: ogoh.spTeshik }) : '') + t('hujjat.t_sinov'));
    });
  },
  kdt(c) {
    if (!ok(c, true)) return;
    safe(c, () => {
      const { model, ogoh } = this._stanok(c), zip = new SimpleZip();
      const kq = (id) => (model.kromkalar.find(k => k.id === id) || {}).t || 0;
      let n = 0;
      for (const d of model.detallar) {
        const kr = Object.fromEntries(Object.entries(d.kromka).map(([q, id]) => [q, id ? kq(id) : 0]));
        for (const f of kdtFayllar({ kod: d.kod, nom: d.nom, dl: d.dl, dw: d.dw, t: d.t, kromka: kr }, d.xnc)) { zip.addFile(f.nom, f.matn); n++; }
      }
      download(fname(c) + '-kdt.zip', new Blob([zip.generate()], { type: 'application/zip' }), 'application/zip');
      c.toast(t('hujjat.t_kdt', { n, d: model.detallar.length }) + (ogoh.spTeshik ? t('hujjat.t_sp_teshik', { n: ogoh.spTeshik }) : '') + t('hujjat.t_sinov'));
    });
  },
  /** BPJ (TZ-17 gacha faqat admin, SINOV) */
  bpj(c) {
    if (!ok(c, false)) return;
    safe(c, () => {
      const b = buildBPJ(view(c), c.H.catalog, c.H.materials, { modelName: c.name || 'Smart3D', materialCode: c.matCode, cutlists: c.res && c.res.cutlists });
      download(fname(c) + '.bpj', JSON.stringify(b, null, 2), 'application/json');
      c.toast(t('hujjat.t_bpj', { n: b.meta.totalPanels }));
    });
  }
};
