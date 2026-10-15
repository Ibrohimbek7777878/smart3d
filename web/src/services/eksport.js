/* TZ-09 6-bosqich: "Fayllar" — haqiqiy fayllar. Eski app/js/app.js dagi eksport funksiyalari SO'ZMA-SO'Z
 * (integrityCheck, exportOBJ/GLB, holes, cutlist, XNC, hisobot, Excel, smeta, loyiha, BPJ, GibLab, CNC) —
 * global `state` o'rniga kontekst: c = { doc, H, res, name, matCode, fasadCode, sheet, nestCfg, sp, toast }.
 * Stanok fayllari (TZ-01): SINOV belgisi bilan; Biesse/Homag — TZ-11 gacha berilmaydi; BPJ — faqat admin (TZ-17 gacha). */
import * as THREE from 'three';
import { validateDoc } from '../../../app/js/engine/rules.js';
import { buildOBJ, cutlistCSV, smetaCSV, xncCSV, download } from '../../../app/js/engine/objexport.js';
import { buildGLB } from '../../../app/js/engine/glbexport.js';
import { buildXLSX } from '../../../app/js/engine/xlsxexport.js';
import { buildBPJ } from '../../../app/js/engine/bpj.js';
import { buildProject as buildGlProject } from '../../../app/js/engine/giblab.js';
import { cncBundle, cutGCode } from '../../../app/js/engine/cnc.js';
import { render1080p, render360Panorama } from '../../../app/js/engine/photo-render.js';
import { s3n } from '../shared/design3d/engine.js';

const fname = (c) => (c.name || 'smart3d').trim().replace(/\s+/g, '_');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const view = (c) => Object.assign({}, c.doc, { placements: c.H.viewPlacements(c.doc) });

/** Eksportdan oldin tekshiruv — fayl/modul buzilmasligi uchun (eski integrityCheck) */
function ok(c, needCutlist) {
  if (!c.doc || !c.doc.placements || !c.doc.placements.length) { c.toast('Loyiha bo\'sh — mebel qo\'ying'); return false; }
  if (!c.H) { c.toast('Bazalar yuklanmagan'); return false; }
  const v = validateDoc(c.doc, { catalog: c.H.catalog });
  if (!v.ok) { c.toast('Validatsiya xatosi: ' + ((v.errors[0] && v.errors[0].message) || '')); return false; }
  if (needCutlist && !(c.res && c.res.cutlists && c.res.cutlists.length)) { c.toast('Avval smeta hisoblansin (cutlist bo\'sh)'); return false; }
  return true;
}
/* TZ-19: xato — c.fail(e, nom) orqali (kod bilan xabar va jurnal: S3D-EXP-101); c.fail bo'lmasa — oddiy xabar */
const failed = (c, e, nom) => { if (c.fail) c.fail(e, nom); else { console.error('eksport', e); c.toast((nom || 'Xato') + ': ' + e.message); } };
function safe(c, fn) { try { fn(); } catch (e) { failed(c, e, 'Fayl'); } }

export const eksport = {
  /* ── Mijozga ── */
  hisobot(c) {
    const res = c.res;
    if (!res || !res.priceRes) { c.toast('Avval smeta hisoblansin'); return; }
    const name = c.name || 'Smart3D';
    const pr = res.priceRes, prod = res.prod, s = (res.nest && res.nest.summary) || {};
    const fmt = (x) => s3n(x == null ? 0 : x);
    const rows = pr.lines.map(l =>
      `<tr><td>${esc(l.name)}<br><small>${esc(l.code)} · ${Number(l.w) || 0}×${Number(l.d) || 0} mm</small></td><td class=n>${Number(l.qty) || 0}</td><td class=n>${fmt(l.unit_price)}</td><td class=n>${fmt(l.amount)}</td></tr>`
    ).join('') || '<tr><td colspan=4>Mebel qo\'yilmagan</td></tr>';
    const prodRows = ((prod && prod.lines) || []).map(l =>
      `<tr><td>${esc(l.name || l.material || '')}</td><td class=n>${esc(l.unit || '')}</td><td class=n>${fmt(l.amount != null ? l.amount : l.cost)}</td></tr>`).join('');
    /* qoidalar S4/6.3: hujjatda logo — dizayndagi belgi; Bittada logo fayli kelganda shu joyga (TZ-08) */
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(name)} — hisobot</title>
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
<div class="logo"><i>3D</i><span><b>Smart3D</b><small>by Bittada</small></span>${/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(c.logo || '') ? `<img class="usta" src="${c.logo}" alt="Sex logosi">` : ''}</div>
<h1>${esc(name)}</h1>
<div class="meta">Smart3D hisobot · ${new Date().toLocaleDateString('uz-UZ')} · material: ${esc(c.matCode)}</div>
<h2>1. Kotirovka (mijozga)</h2>
<table><thead><tr><th>Mebel</th><th class=n>Miq.</th><th class=n>Narx</th><th class=n>Summa</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="tot">JAMI: ${fmt(pr.total)} so'm${pr.incomplete ? ' *' : ''}</div>
${pr.incomplete ? '<div class="meta">* ba\'zi zapchastlarning narxi bazada yo\'q — to\'liq emas</div>' : ''}
${prodRows ? `<h2>2. Ishlab chiqarish xarajati</h2><table><tbody>${prodRows}</tbody></table>
<div class="tot">Jami ishlab chiqarish: ${fmt(prod.total)} so'm</div>` : ''}
<h2>3. Raskroy</h2>
<div class="stats">
  <span><b>${s.total_sheets || 0}</b> varaq</span>
  <span><b>${s.utilization_pct || 0}%</b> foydalanish</span>
  <span><b>${s.waste_m2 || 0}</b> m² ochiq</span>
  <span><b>${s.remnant_count || 0}</b> qoldiq (${s.remnant_usable_m2 || 0} m²)</span>
  <span><b>${fmt(s.material_cost)}</b> varaq xarajati</span>
</div>
<footer>Smart3D by Bittada · ${esc(name)} · ${new Date().toISOString().slice(0, 10)} · sahifa 1/1</footer>
<script>window.onload = () => { window.print(); };</script>
</body></html>`;
    const w = window.open('', '_blank');
    if (!w) { c.toast('Brauzer yangi oynani yopdi — ruxsat bering'); return; }
    w.document.write(html); w.document.close();
  },
  async rasm(c) {
    if (!c.sp) return;
    const sp = c.sp, bg = sp.scene.background, walls = sp.groups.walls3d.children.map(w => w.visible);
    try {
      c.toast('1080p rasm olinmoqda…');
      sp.scene.background = new THREE.Color(0x0C1C22);              // mavzu foni shaffof — rasmda dizayn rangi
      const r = await render1080p(sp, { download: true });
      c.toast(`1080p rasm saqlandi (${r.width}×${r.height})`);
    } catch (e) { failed(c, e, 'Rasm'); }
    finally { sp.scene.background = bg; sp.groups.walls3d.children.forEach((w, i) => { w.visible = walls[i]; }); sp._resize(); sp._invalidate(); }
  },
  async panorama(c) {
    if (!c.sp) return;
    const sp = c.sp, bg = sp.scene.background;
    try {
      c.toast('360° panorama tayyorlanmoqda…');
      sp.scene.background = new THREE.Color(0x0C1C22);
      for (const w of sp.groups.walls3d.children) w.visible = true;   // xona markazidan — hamma devor ko'rinadi
      await render360Panorama(sp, { download: true });
      c.toast('360° panorama saqlandi');
    } catch (e) { failed(c, e, 'Panorama'); }
    finally { sp.scene.background = bg; sp._resize(); sp._invalidate(); }
  },
  glb(c) {
    if (!ok(c, false)) return;
    safe(c, () => {
      const r = buildGLB(view(c), c.H.catalog);
      download(fname(c) + '-model.glb', r.glb, 'model/gltf-binary');
      c.toast(`GLB tayyor — ${r.stats.totalBoxes} panel (${Math.round(r.stats.byteLength / 1024)} KB)`);
    });
  },
  /* ── Sexga ── */
  excel(c) {
    if (!ok(c, true)) return;
    safe(c, () => {
      const res = c.res;
      const x = buildXLSX({ doc: c.doc, catalog: c.H.catalog, materials: c.H.effectiveMaterials(c.sheet), priceRes: res.priceRes, prod: res.prod,
        nest: res.nest, sheet: c.sheet, materialCode: c.matCode, projectName: c.name || 'Smart3D Loyihasi', services: c.H.services });
      download(fname(c) + '-smeta.xlsx', x, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      c.toast('Excel smeta tayyor (5 ta bo\'lim)');
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
    const r = buildOBJ(view(c), c.H.catalog);
    download('smart3d-model.obj', r.obj, 'text/plain');
    setTimeout(() => download('smart3d-model.mtl', r.mtl, 'text/plain'), 350);
    c.toast('OBJ + MTL — ' + r.placements.length + ' guruh');
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
      c.toast(`GibLab tayyor — ${ops} operatsiya, ${st.placed}/${st.parts} detal, ${st.sheets} varaq`);
      if (gl.warnings && gl.warnings.length) console.warn('GibLab ogohlantirish:', gl.warnings);
    });
  },
  xnc(c) {
    if (!ok(c, true)) return;
    download(fname(c) + '-xnc.csv', '﻿' + xncCSV(c.res.cutlists, c.H.materials, c.H.catalog), 'text/csv');
    c.toast('XNC CSV tayyor — GibLab import uchun');
  },
  _cnc(c, fn, suffix, mime, msg) {
    if (!ok(c, true)) return;
    safe(c, () => { download(fname(c) + suffix, fn(c.res.nest, c.res.cutlists), mime); c.toast(msg + ' — SINOV: sexda tekshirilmagan'); });
  },
  dxf(c) { this._cnc(c, (n, cl) => cncBundle(n, cl).dxf, '-raskroy.dxf', 'application/dxf', 'DXF tayyor — raskroy'); },
  gcode(c) { this._cnc(c, (n, cl) => cutGCode(n, cl, { toolDia: 6.0, addTabs: true }), '-kesim.nc', 'text/plain', 'G-code (ISO) tayyor'); },
  ptp(c) { this._cnc(c, (n, cl) => cncBundle(n, cl).ptp, '-ptp.csv', 'text/csv', 'PTP pozitsiya tayyor'); },
  nc(c) { this._cnc(c, (n, cl) => cncBundle(n, cl).nc, '-teshik.nc', 'text/plain', 'NC (Excellon) tayyor'); },
  altendorf(c) { this._cnc(c, (n, cl) => cncBundle(n, cl).altendorf, '-altendorf-fazali-kesim.txt', 'text/plain', 'Altendorf kesim xaritasi tayyor'); },
  /** BPJ (TZ-17 gacha faqat admin, SINOV) */
  bpj(c) {
    if (!ok(c, false)) return;
    safe(c, () => {
      const b = buildBPJ(view(c), c.H.catalog, c.H.materials, { modelName: c.name || 'Smart3D', materialCode: c.matCode, cutlists: c.res && c.res.cutlists });
      download(fname(c) + '.bpj', JSON.stringify(b, null, 2), 'application/json');
      c.toast('BPJ tayyor — ' + b.meta.totalPanels + ' panel — SINOV: Bazis\'da tekshirilmagan');
    });
  }
};
