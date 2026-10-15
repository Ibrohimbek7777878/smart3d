/* Smart3D js/app.js — asosiy ilova (state + UI + hisoblash trubkasi).
 *
 * Trubka (har bir o'zgarishda):
 *   doc o'zgardi → validate (rules.js) + narx (price.js × material factor)
 *   → cutlist (detallar/teshik/kromka) → raskroy (nesting.js) → UI render
 *
 * Kod manbalari (qayta ishlatilgan):
 *   mebelcity-platform: price-engine.js, sp-validate.js, sp-materials.js,
 *   sp-scene.js, sp-controls.js, fragments.json, sunpin_nesting.py (port)
 */
import { createScene, DEFAULT_ROOM } from './scene.js';
import { attachControls } from './controls.js';
import { createItems } from './items.js';
import { validateDoc, footprint, roomBBox } from './engine/rules.js';
import { deriveKitchen, moykaHole } from './engine/kitchen.js';
import { cutlist, productionCost } from './engine/cutlist.js';
import { nestProject } from './engine/nesting.js';
import { buildOBJ, cutlistCSV, smetaCSV, xncCSV, download } from './engine/objexport.js';
import { buildGLB } from './engine/glbexport.js';
import { buildXLSX } from './engine/xlsxexport.js';
import { buildBPJ } from './engine/bpj.js';
import { buildProject as buildGlProject } from './engine/giblab.js';
import { cncBundle, cutGCode } from './engine/cnc.js';
import { buildSearchIndex, searchMaterial } from './engine/search.js';
import { applySexStandart } from './engine/standart.js';
import { aiBuild, startVoice, voiceSupported, parseZamer, suggestLayout, USTKI_Z } from './ai.js';
import { VRButton } from '../vendor/three/addons/webxr/VRButton.js';
import * as THREE from 'three';
import { render1080p, render360Panorama } from './engine/photo-render.js';
import './engine/price.js';   // UMD → window.SpPrice
const SpPrice = window.SpPrice;

/* ═══════════════════ STATE ═══════════════════ */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const state = {
  doc: null,
  catalog: {},          // {code: frag}
  materials: null,      // materials.json
  materialCode: 'LDSP18',   // korpus (va polka) materiali — slots.korpus
  fasadCode: 'MDF16',       // fasad (eshik, tortma) materiali — slots.fasad
  sheetCatalog: null,   // ERP katalogi (sheet-catalog.json)
  searchIndex: null,    // material ID + fuzzy qidiruv indeksi
  sheet: null,          // tanlangan real mahsulot {sku,name,type,th,l,w,uzs}
  prices: {},
  services: null,       // xizmatlar tarifi (services.json)
  selectedId: null,
  filter: 'all',
  idSeq: 1,
  recalc: { last: null },
  voice: null
};

let sp = null, ctl = null, items = null;

const PHONE_MQ = window.matchMedia('(max-width: 599px)');   // app.css telefon chegarasi bilan bir xil
const fmtSum = (n) => SpPrice.fmtSoom(n);

/** TZ-08: o'z tasdiq oynamiz (confirm() o'rniga). Esc yoki fonga bosish — bekor. → Promise<boolean> */
function askConfirm(text, okLabel = 'Tasdiqlash') {
  const m = $('#askModal');
  if (!m) return Promise.resolve(false);                     // oyna belgisi yo'q — xavfsiz tomon: bekor
  $('#askText').textContent = text;
  $('#askOk').textContent = okLabel;
  m.hidden = false;
  $('#askOk').focus();
  return new Promise(resolve => {
    const done = (v) => {
      m.hidden = true;
      $('#askOk').removeEventListener('click', yes); $('#askCancel').removeEventListener('click', no);
      m.removeEventListener('click', back); document.removeEventListener('keydown', key, true);
      resolve(v);
    };
    const yes = () => done(true), no = () => done(false);
    const back = (e) => { if (e.target === m) done(false); };
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } };
    $('#askOk').addEventListener('click', yes); $('#askCancel').addEventListener('click', no);
    m.addEventListener('click', back); document.addEventListener('keydown', key, true);
  });
}

function toast(msg, kind) {
  const t = document.createElement('div');
  t.className = 'toast' + (kind ? ' ' + kind : '');
  t.textContent = msg;
  $('#toast').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; }, 2600);
  setTimeout(() => t.remove(), 3200);
}

/* ═══════════════════ NARX QURILISHI ═══════════════════ */

/** Loyiha slotlari (TZ §5 3.1): usta tanlagan korpus va fasad hamma modulga qo'llanadi. */
function projectSlots() {
  return { korpus: state.materialCode, polka: state.materialCode, fasad: state.fasadCode };
}

/** ERP varag'i qaysi slotga tegishli: LDSP/LMDF/OSB → korpus, HDF → orqa, MDF (va akril) → fasad.
 *  Oyna va boshqalar slot emas (null) — korpus/fasad tanloviga tegmaydi. */
function slotForBase(base) {
  if (/^HDF/.test(base)) return 'orqa';
  if (/^(LDSP|LMDF|OSB)/.test(base)) return 'korpus';
  if (/^MDF/.test(base)) return 'fasad';
  return null;
}

/* ERP katalogidagi real mahsulot → hisoblash bazasi (kod) */
function baseForSheet(sh) {
  const table = {
    LDSP: { 18: 'LDSP18', 16: 'LDSP16' },
    LMDF: { 16: 'LMDF16', 18: 'LDSP18' },
    AKRIL: { 18: 'MDF18', 16: 'MDF16', 8: 'MDF8' },
    MDF: { 18: 'MDF18', 16: 'MDF16', 8: 'MDF8' },
    HDF: { 3: 'HDF3', 2: 'HDF3' },
    OYNA: { 4: 'OYNA' }
  }[sh.type] || {};
  const th = Math.round(sh.th || 0);
  if (table[th]) return table[th];
  let best = null, bd = 1e9;
  for (const k in table) {
    const d = Math.abs(+k - th);
    if (d < bd) { bd = d; best = table[k]; }
  }
  return best || 'MDF16';
}

/** Tanlangan real mahsulot bo'yicha materiallar nusxasi: haqiqiy narx + varaq o'lchami. */
function effectiveMaterials() {
  const sh = state.sheet;
  if (!sh || !state.materials) return state.materials;
  const base = baseForSheet(sh);
  const mats = JSON.parse(JSON.stringify(state.materials));
  const pm = (mats.panel_materials || []).find(x => x.code === base);
  if (!pm) return state.materials;
  if (sh.uzs > 0) pm.sheet_price = sh.uzs;
  if (sh.l > 100 && sh.w > 100) pm.sheets = [[sh.l, sh.w]];
  return mats;
}

/** price.js uchun katalog jadvali — endi faqat o'lcham ogohlantirishlari (W_SIZE_CLAMP) uchun;
 *  mijoz narxi tannarxdan hisoblanadi (productionCost → buildQuote). */
function buildPrices() {
  const prices = {};
  for (const code in state.catalog) {
    const fr = state.catalog[code];
    prices[code] = {
      mode: fr.price_mode || 'unit',
      price: fr.price || 0,
      name: fr.name, base_w: fr.w,
      min_w: fr.min_w, max_w: fr.max_w, min_d: fr.min_d, max_d: fr.max_d,
      stretch_axis: fr.stretch_axis
    };
  }
  return prices;
}

/* ═══════════════════ RECALC ═══════════════════ */
let recalcTimer = 0;
function scheduleRecalc(immediate) {
  clearTimeout(recalcTimer);
  if (immediate) { doRecalc(); return; }
  recalcTimer = setTimeout(doRecalc, 220);
}

function doRecalc() {
  if (!state.doc || !state.materials) return;
  const doc = state.doc;
  state.prices = buildPrices();
  const mats = effectiveMaterials();   // real ERP mahsuloti tanlangan bo'lsa — haqiqiy narx/olcham

  /* 1) o'lcham ogohlantirishlari (katalog min/max) */
  const sizeCheck = SpPrice.calc(doc, state.prices, {});

  /* 2) validatsiya */
  const val = validateDoc(doc, { catalog: state.catalog });

  /* 3) cutlist + ishlab chiqarish xarajati */
  const cutlists = [];
  const allParts = [];
  const slots = projectSlots();
  const mkHole = moykaHole(doc);             // F2: moyka kesimi — birinchi stoleshnitsaga
  for (const p of viewPlacements()) {
    const fr = state.catalog[p.frg];
    if (!fr) continue;
    const cl = cutlist(fr, p.w, p.d, p.h, mats, { projectSlots: slots, placementSlots: p.slots });
    cl.placementId = p.id;                   // CNC join uchun
    /* F2: moyka kesimi — stoleshnitsa run'ining birinchi segmentiga */
    if (mkHole && p.frg === 'SP-ST-001' && p.runIdx === 0 && p.segIdx === 0) {
      cl.holes.push(Object.assign({}, mkHole));
    }
    cutlists.push(cl);
    /* id — noyob (placement + ref) — nesting ref/CNC join uchun */
    for (const x of cl.parts) allParts.push(Object.assign({}, x, { id: p.id + ':' + x.ref }));
  }
  /* 4) raskroy */
  const nest = nestProject(allParts, mats, state.nestCfg || {});

  /* 5) ishlab chiqarish tannarxi (haqiqiy varaqlar soni bilan) */
  const prod = productionCost(cutlists, mats, { nestResult: nest, furnituraById: state.furnById, xizmatlar: state.doc.xizmatlar || {} });

  /* 6) mijoz kotirovkasi — tannarx × (1 + ustama), modullarga taqsimlangan */
  const priceRes = buildQuote(doc, cutlists, prod, sizeCheck.warnings);

  state._res = { priceRes, val, cutlists, prod, nest };
  renderTotal(priceRes);
  renderMsgs(val, priceRes, prod);
  renderSmeta(priceRes, prod);
  renderNest(nest);
  renderCutlist(cutlists);
  renderExCheck(val, doc, cutlists, nest);
}

/** Kotirovka: har modul = uning tannarx ulushi × (1 + ustama). Satrlar yig'indisi = jami
 *  (UI, Excel, hisobot va smeta.csv — hammasi shu bitta obyektdan o'qiydi; TZ §5 3.6). */
function buildQuote(doc, cutlists, prod, sizeWarnings) {
  const byId = {};
  for (const p of viewPlacements()) byId[p.id] = p;   /* F2: synthetic oshxona qatorlari ham */

  const lines = cutlists.map((cl, i) => {
    const p = byId[cl.placementId] || {};
    const frag = state.catalog[cl.fragment] || {};
    const amount = (prod.perModule[i] || {}).client || 0;
    return { code: cl.fragment, name: p.name || frag.name || cl.fragment, w: p.w, d: p.d, h: p.h,
             qty: 1, unit_price: amount, amount };
  });
  return {
    lines,
    subtotal: prod.clientTotal,
    discount: 0,
    total: prod.clientTotal,
    markupPct: prod.markupPct,
    missing: prod.missing,
    incomplete: prod.missing.length > 0,
    /* W_NO_PRICE — eski katalog narxi haqida, endi ishlatilmaydi */
    warnings: (sizeWarnings || []).filter(w => w.code !== 'W_NO_PRICE')
  };
}

/* ═══════════════════ RENDER ═══════════════════ */
function renderTotal(priceRes) {
  const star = priceRes.incomplete ? '*' : '';
  $('#totalPrice').innerHTML = fmtSum(priceRes.total) + star +
    '<small>' + (priceRes.incomplete ? "jami (to'liq emas)" : 'jami narx') + '</small>';
  $('#smTotal').textContent = fmtSum(priceRes.total) + star;
  const n = (state.doc.placements || []).length;
  $('#smSub').innerHTML = n + ' dona mebel<br>korpus: ' + esc(state.materialCode) + ' · fasad: ' + esc(state.fasadCode);
}

function renderMsgs(val, priceRes, prod) {
  const box = $('#smMsgs');
  const items = [];
  for (const e of val.errors) items.push(`<div class="msg err">❌ ${esc(e.code)} — ${esc(e.message)}</div>`);
  const seen = new Set();
  for (const w of val.warnings.concat(priceRes.warnings)) {
    const k = w.code + w.message;
    if (seen.has(k)) continue; seen.add(k);
    items.push(`<div class="msg warn">⚠️ ${esc(w.code)} — ${esc(w.message)}</div>`);
  }
  if (priceRes.missing && priceRes.missing.length) {
    items.push(`<div class="msg warn">⚠️ <b>Smeta to'liq emas</b> — ${priceRes.missing.length} ta narx bazada yo'q
      (0 so'm deb olindi, o'ylab topilmaydi): ${priceRes.missing.map(m => esc(m.name)).join(', ')}</div>`);
  }
  if (prod && prod.taxminiy && prod.taxminiy.length) {
    items.push(`<div class="msg warn">⚠️ <b>Taxminiy narx</b> — ${prod.taxminiy.map(esc).join(', ')}: egasi hali tasdiqlamagan
      (narx-toldirish jadvali, TZ-04)</div>`);
  }
  if (!items.length) items.push('<div class="msg ok">✅ Chizma to\'g\'ri — xato yo\'q</div>');
  box.innerHTML = items.join('');
}

function renderSmeta(priceRes, prod) {
  const tb = $('#smTable').querySelector('tbody');
  const tf = $('#smTable').querySelector('tfoot');
  tb.innerHTML = priceRes.lines.map(l => `
    <tr>
      <td>${esc(l.name)}<br><small style="color:var(--muted)">${esc(l.code)} · ${Number(l.w) || 0}×${Number(l.d) || 0}${l.extra && l.extra.stretch_k ? ' · k=' + (Number(l.extra.stretch_k) || 0) : ''}</small></td>
      <td class="num">${Number(l.qty) || 0}</td>
      <td class="num">${fmtSum(l.unit_price)}</td>
      <td class="num">${fmtSum(l.amount)}</td>
    </tr>`).join('') ||
    '<tr><td colspan="4" style="color:var(--muted)">Mebel qo\'yilmagan</td></tr>';
  tf.innerHTML = `<tr><td colspan="3">JAMI (tannarx + ${Math.round((priceRes.markupPct || 0) * 100)}% ustama)${priceRes.incomplete ? ' *' : ''}</td>
    <td class="num">${fmtSum(priceRes.total)}</td></tr>`;

  /* Sex tannarxi (Haqiqiy ishlab chiqarish xarajatlari) */
  const wTb = $('#smWorkshopTable')?.querySelector('tbody');
  const wTf = $('#smWorkshopTable')?.querySelector('tfoot');
  if (wTb && prod) {
    const b = prod.breakdown || {};
    const tx = (g) => (prod.taxminiy || []).includes(g);
    const xzt = (prod.xizmat_taklif && prod.xizmat_taklif.teshik) || { tanlangan: false, qty: 0, amount: 0 };
    /* TZ-03: xizmat tanlovi bloki — belgi holati loyihadan, summa har doim ko'rinadi */
    if ($('#xzTeshik')) {
      $('#xzTeshik').checked = !!xzt.tanlangan;
      $('#xzTeshikInfo').textContent = xzt.qty ? `— ${xzt.qty} teshik · ${fmtSum(xzt.amount)}` : "— loyihada teshik yo'q";
      $('#xzNote').classList.toggle('hidden', !!xzt.tanlangan || !xzt.qty);
    }
    const rows = [
      { name: 'Varaqlar (LDSP/MDF/HDF)', qty: `${b.sheetsCount || 0} dona (${b.panelAreaM2 || 0} m²)`, unit: '-', amount: prod.sheetCost },
      { name: 'Kromka (qirra lenta)' + (tx('Kromka') ? ' — taxminiy' : ''), qty: `${b.edgeMeters || 0} metr`, unit: '-', amount: prod.edgeCost },
      { name: 'Furnitura / apparatura', qty: `${b.hwCount || 0} dona`, unit: '-', amount: prod.hwCost },
      { name: 'Prisadka (burg\'ulash)' + (xzt.tanlangan ? (tx('Prisadka') ? ' — taxminiy' : '') : ' — tanlanmagan'), qty: `${b.holeCount || 0} ta teshik`, unit: '-', amount: prod.holeCost },
      { name: 'Ish haqi / Usta mehnati' + (tx('Ish haqi') ? ' — taxminiy' : ''), qty: 'Loyiha', unit: '-', amount: prod.laborCost }
    ];
    if (prod.missing.length) rows.push({ name: '⚠️ Narxi bazada yo\'q (0 deb olindi)', qty: prod.missing.length + ' ta', unit: '-', amount: 0 });
    wTb.innerHTML = rows.map(r => `
      <tr>
        <td>${esc(r.name)}</td>
        <td class="num" style="font-size:12px;color:var(--muted)">${r.qty}</td>
        <td class="num">-</td>
        <td class="num">${fmtSum(r.amount)}</td>
      </tr>
    `).join('');
    if (wTf) {
      wTf.innerHTML = `
        <tr><td colspan="3"><b>Sex tannarxi (Sof xarajat)</b></td><td class="num"><b>${fmtSum(prod.totalWorkshopCost)}</b></td></tr>
        <tr style="color:#059669"><td colspan="3">Tavsiya etilgan foyda (+${Math.round((prod.margin - 1) * 100)}% ustama)</td><td class="num">${fmtSum(prod.suggestedClientPrice - prod.totalWorkshopCost)}</td></tr>
        <tr style="background:#f8fafc"><td colspan="3"><b>Tavsiya narx (Mijozga)</b></td><td class="num"><b>${fmtSum(prod.suggestedClientPrice)}</b></td></tr>
      `;
    }
  }
}

function renderNest(nest) {
  const s = nest.summary;
  const modeName = nest.mode === 'strip' ? 'Lenta (GibLab)' : 'Guillotine';
  $('#nestStats').innerHTML = `
    <div class="stat"><b>${s.total_sheets}</b><span>varaq</span></div>
    <div class="stat"><b>${s.utilization_pct}%</b><span>foydalanish</span></div>
    <div class="stat"><b>${s.waste_m2}</b><span>ochiq m² (ostatka)</span></div>
    <div class="stat"><b>${s.remnant_count || 0}</b><span>delovoy qoldiq (${s.remnant_usable_m2 || 0} m²)</span></div>
    <div class="stat"><b>${fmtSum(s.material_cost)}</b><span>varaq xarajati</span></div>
    <div class="stat"><b>${esc(modeName)}</b><span>rejim</span></div>`;

  /* birinchi varaqning sodda ko'rinishi */
  const mats = Object.keys(nest.by_material);
  const box = $('#nestPreview');
  if (!mats.length) { box.innerHTML = ''; return; }
  const mat = mats[0];
  const r = nest.by_material[mat];
  const sheet = r.sheets[0];
  if (!sheet) { box.innerHTML = '<div class="msg warn">Varaqqa joylashmadi</div>'; return; }
  const ar = sheet.length / sheet.width;
  let html = `<div class="nest-cap"><span>${esc(mat)} — 1-varaq (${sheet.parts.length} detal)</span><span>${r.sheet_length}×${r.sheet_width}</span></div>`;
  html += `<div class="nest-sheet" style="--ar:${ar}">`;
  for (const p of sheet.parts) {
    const fw = p.rotated ? p.width : p.length;   // X o'lchami (varaq bo'ylab)
    const fh = p.rotated ? p.length : p.width;   // Y o'lchami (varaq eni bo'ylab)
    const l = (fw / sheet.length * 100).toFixed(2);
    const w = (fh / sheet.width * 100).toFixed(2);
    const x = (p.x / sheet.length * 100).toFixed(2);
    const y = (p.y / sheet.width * 100).toFixed(2);
    html += `<div class="nest-part" style="left:${x}%;top:${y}%;width:${l}%;height:${w}%;${p.rotated ? 'background:#c8b8e8;' : ''}">${esc(p.code)}</div>`;
  }
  /* qoldiqlar (1-varaqdagi) */
  for (const rm of (r.remnants || []).filter(x => x.sheet === 1)) {
    const l = (rm.w / sheet.length * 100).toFixed(2);
    const w = (rm.h / sheet.width * 100).toFixed(2);
    const x = (rm.x / sheet.length * 100).toFixed(2);
    const y = (rm.y / sheet.width * 100).toFixed(2);
    html += `<div class="nest-part" style="left:${x}%;top:${y}%;width:${l}%;height:${w}%;background:repeating-linear-gradient(45deg,#e8f5e9,#e8f5e9 6px,#c8e6c9 6px,#c8e6c9 12px);opacity:.85;font-size:9px">qoldiq</div>`;
  }
  html += '</div>';
  box.innerHTML = html;
}

function renderCutlist(cutlists) {
  const box = $('#cutList');
  box.innerHTML = cutlists.map(cl => {
    const frag = state.catalog[cl.fragment] || {};
    const hw = cl.hardware.map(h => {
      const meta = (state.materials.hardware || []).find(x => x.code === h.code);
      return `${meta ? meta.name : h.code} ×${h.qty}`;
    }).join(', ');
    return `<details class="msg" style="background:var(--surface-2);border:1px solid var(--line)">
      <summary style="cursor:pointer;font-weight:700">${esc(frag.name || cl.fragment)}
        <span style="color:var(--muted);font-weight:500"> — ${cl.stats.part_count} detal · ${cl.stats.hole_count} teshik · ${cl.stats.edge_meters} m kromka</span></summary>
      <table class="smeta" style="margin-top:6px"><thead><tr><th>Detal</th><th style="text-align:right">O'lcham</th></tr></thead><tbody>
      ${cl.parts.map(p => `<tr><td>${esc(p.code)}</td><td class="num">${p.length}×${p.width}</td></tr>`).join('')}
      </tbody></table>
      <div style="font-size:11.5px;color:var(--muted);margin-top:6px">Furnitura: ${esc(hw || '—')}<br>
      Teshiklar: ${cl.holes.map(h => `${esc(h.kind)} Ø${Number(h.dia) || 0}×${Number(h.depth) || 0} (${Number(h.qty) || 0})`).join(', ') || '—'}</div>
    </details>`;
  }).join('') || '<div class="msg warn">Mebel yo\'q</div>';
}

function renderExCheck(val, doc, cutlists, nest) {
  const n = (doc.placements || []).length;
  const totalCutlistParts = (cutlists || []).reduce((s, c) => s + (c.parts || []).reduce((sp, p) => sp + (p.qty || 1), 0), 0);
  const totalCutlistArea = Math.round((cutlists || []).reduce((s, c) => s + ((c.stats && c.stats.area_m2) || 0), 0) * 1000) / 1000;
  const placedCount = nest?.summary?.placed_count || 0;
  const placedArea = nest?.summary?.used_area_m2 || 0;
  const unplacedCount = Object.values(nest?.by_material || {}).reduce((s, r) => s + ((r && r.unplaced) || []).length, 0);
  const holes = (cutlists || []).reduce((s, c) => s + (c.holes || []).reduce((sh, h) => sh + (h.qty || 1), 0), 0);
  /* maydon: yaxlitlash farqi 0.01 m² gacha ruxsat */
  const isMatched = (totalCutlistParts === placedCount) && (unplacedCount === 0) &&
    Math.abs(totalCutlistArea - placedArea) <= 0.01;

  let html = '';
  if (!val.ok) {
    html = `<div class="msg err">⚠️ Exportdan oldin xatolarni tuzating (${val.errors.length} ta xato mavjud)</div>`;
  } else if (!isMatched) {
    html = `<div class="msg warn">⚠️ Detallar mos emas: kesim listida ${totalCutlistParts} ta (${totalCutlistArea} m²),
      raskroyda ${placedCount} ta (${placedArea} m²), sig'magani ${unplacedCount} ta. Varaq o'lchamini tekshiring!</div>`;
  } else {
    html = `
      <div class="msg ok">
        <b>✅ Kesim listi va raskroy mos:</b><br>
        • Modullar: ${n} ta | Detallar: ${totalCutlistParts} ta (hammasi varaqqa tushdi)<br>
        • Panel maydoni: ${totalCutlistArea} m² (kesim listi) = ${placedArea} m² (raskroy)<br>
        • Teshiklar: ${holes} ta | Varaqlar: ${nest?.summary?.total_sheets || 0} dona
      </div>`;
  }
  /* AUDIT-2026-10-14 §3: stanok fayllari haqiqiy stanokda sinalmagan */
  html += `<div class="msg warn">⚠️ <b>SINOV:</b> stanok fayllari (DXF, NC, G-code, PTP, Altendorf)
    hali sexda sinalmagan — ishlab chiqarishda ishlatmang.</div>`;
  $('#exCheck').innerHTML = html;
}

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* ═══════════════════ DOC YANGILASH ═══════════════════ */
/* DEFAULT_ROOM dan YANGI xona (massivlar nusxa — Object.assign payvast
   massivlarni umumiy qoldiradi: yangi loyiha eski openings/utilities ni
   meros qilib olardi). */
function freshRoom() {
  return {
    ...DEFAULT_ROOM,
    outline: DEFAULT_ROOM.outline.map(p => p.slice()),
    openings: DEFAULT_ROOM.openings.map(o => ({ ...o })),
    utilities: []
  };
}

/* F2: oshxona sozlamalari (persist) — yangi loyiha: stoleshnitsa/sokol o'chirilgan */
function freshKitchen() {
  return {
    stoleshnitsa: false, sokol: false,
    dobor: false, doborH: 60,
    karniz: false, karnizH: 60,
    moyka: { on: false, offset: 600, fromBack: 100, size: 500 }
  };
}

/* F2: foydalanuvchi placements + synthetic oshxona elementlari (auto, persist emas).
   3D/smeta/raskroy/export — hammasi shu ro'yxatdan o'qiydi. */
function viewPlacements() {
  const user = (state.doc && state.doc.placements) || [];
  if (!state.catalog || !state.doc || !state.doc.kitchen) return user;
  try { return user.concat(deriveKitchen(state.doc, state.catalog)); }
  catch (e) { console.warn('deriveKitchen:', e); return user; }
}

function setDoc(doc, opts = {}) {
  state.doc = doc;
  if (!doc.kitchen) doc.kitchen = freshKitchen();   /* F2 */
  state.idSeq = Math.max(state.idSeq,
    1 + doc.placements.reduce((m, p) => Math.max(m, parseInt(String(p.id).replace(/\D/g, ''), 10) || 0), 0));
  sp.setDoc(doc);
  items.setPlacements(viewPlacements(), state.catalog);
  syncZamerInputs();
  if (!opts.skipRecalc) scheduleRecalc(opts.immediate);
}

function addPlacement(frag) {
  const bb = roomBBox(state.doc.room.outline);
  const id = 'p' + (state.idSeq++);
  /* TZ-15: ustki (osma) modul — AI bilan bir xil balandlikda; bo'sh joy faqat balandligi
     kesishadigan modullar orasidan (ustki — ustkilar, pastki — pastkilar orasidan) */
  const ustki = /^(wall_cabinet|wall_corner)$/.test(frag.category) || /^kuxnya-(ustki|antresol)$/.test(frag.group || '');
  const z0 = frag.default_z != null ? +frag.default_z : (ustki ? USTKI_Z : 0);
  const zKesishadi = (p) => { const pz = +p.z || 0; return pz < z0 + (+frag.h || 0) && z0 < pz + (+p.h || 0); };
  // devor bo'ylab eng chap bo'sh joy — rot'li modullar uchun ham (footprint, A2)
  const row = state.doc.placements.filter(p => footprint(p).y0 < 300 + bb.minY && zKesishadi(p))
    .sort((a, b) => footprint(a).x0 - footprint(b).x0);
  let x = bb.minX;
  for (const p of row) {
    const f = footprint(p);
    if (f.x0 - x >= frag.w) break;
    x = f.x1;
  }
  if (x + frag.w > bb.maxX) x = Math.max(bb.minX, bb.maxX - frag.w);
  // qarama-qarshi devor band bo'lsa — markazga
  const p = {
    id, frg: frag.code, name: frag.name,
    x: Math.round(x / 50) * 50, y: 50, z: z0,
    w: frag.w, d: frag.d, h: frag.h, rot: 0, qty: 1
  };
  state.doc.placements.push(p);
  items.setPlacements(viewPlacements(), state.catalog);
  items.select(id);
  scheduleRecalc();
  toast(frag.name + ' qo\'yildi', 'good');
}

function removePlacement(id) {
  const i = state.doc.placements.findIndex(x => x.id === id);
  if (i < 0) return;
  state.doc.placements.splice(i, 1);
  items.select(null);
  hideItemCard();
  items.setPlacements(viewPlacements(), state.catalog);
  scheduleRecalc(true);
}

/* ═══════════════════ ITEM CARD ═══════════════════ */
function showItemCard(id) {
  const p = state.doc.placements.find(x => x.id === id);
  if (!p) return hideItemCard();
  const frag = state.catalog[p.frg] || {};
  $('#itemCard').classList.remove('hidden');
  $('#icName').textContent = p.name || frag.name || p.frg;
  $('#icCode').textContent = p.frg;
  $('#icW').value = p.w; $('#icD').value = p.d; $('#icH').value = p.h; $('#icX').value = p.x; $('#icZ').value = p.z || 0;
  checkClamp(p, frag);
}
function hideItemCard() { $('#itemCard').classList.add('hidden'); $('#icWarn').classList.add('hidden'); }

/** Chegaradan tashqari o'lcham uchun ogohlantirish. siqildi=true — p usta kiritgan qiymat, u siqib qo'yilgan */
function checkClamp(p, frag, siqildi = false) {
  const w = [];
  for (const [k, nom] of [['w', 'eni'], ['d', 'chuqurligi'], ['h', "bo'yi"]]) {
    const lo = frag['min_' + k], hi = frag['max_' + k];
    if (lo && p[k] < lo) w.push(`${nom} ${p[k]} mm < min ${lo}` + (siqildi ? ` → ${lo} ga siqildi` : ''));
    if (hi && p[k] > hi) w.push(`${nom} ${p[k]} mm > max ${hi}` + (siqildi ? ` → ${hi} ga siqildi` : ''));
  }
  const el = $('#icWarn');
  if (w.length) { el.textContent = '⚠️ ' + w.join(' · '); el.classList.remove('hidden'); }
  else el.classList.add('hidden');
}

function clampSize(p, frag) {
  const out = {};
  if (frag.min_w) out.w = Math.max(p.w, frag.min_w);
  if (frag.max_w) out.w = Math.min(out.w || p.w, frag.max_w);
  if (frag.min_d) out.d = Math.max(p.d, frag.min_d);
  if (frag.max_d) out.d = Math.min(out.d || p.d, frag.max_d);
  if (frag.min_h) out.h = Math.max(p.h, frag.min_h);
  if (frag.max_h) out.h = Math.min(out.h || p.h, frag.max_h);
  return out;
}

/* ═══════════════════ KATALOG ═══════════════════ */
function renderCatalog() {
  const cats = {};
  for (const f of Object.values(state.catalog)) cats[f.category] = (cats[f.category] || 0) + 1;
  const filters = [['all', 'Barchasi']].concat(Object.entries(cats));
  $('#catFilter').innerHTML = filters.map(([c]) =>
    `<button class="chip ${state.filter === c ? 'is-active' : ''}" data-f="${esc(c)}">${c === 'all' ? 'Barchasi' : esc(catName(c))}</button>`
  ).join('');

  const list = Object.values(state.catalog)
    .filter(f => state.filter === 'all' || f.category === state.filter);
  $('#catGrid').innerHTML = list.map(f => `
    <button class="cat-card" data-code="${esc(f.code)}">
      <div class="cc-name">${esc(f.name)}</div>
      <div class="cc-dim">${Number(f.w) || 0}×${Number(f.d) || 0}×${Number(f.h) || 0} mm</div>
      <div class="cc-range">min ${f.min_w ? Number(f.min_w) : '—'} · max ${f.max_w ? Number(f.max_w) : '—'}</div>
      <div class="cc-price" title="${f.category === 'appliance' ? "O'rnatma texnika — nishon o'lchami" : 'Taxminiy: standart o\'lchamda, kroysiz'}">${f.category === 'appliance' ? "o'rnatma texnika" : '~' + fmtSum(estimateFragment(f))}</div>
    </button>`).join('');
}

/** Katalog kartasi narxi — kotirovka bilan bir xil model (tannarx × ustama), standart
 *  o'lchamda va kroysiz (maydon ÷ 85%) taxmin. Material/varaq o'zgarmaguncha keshlanadi. */
const estCache = { key: '', map: {} };
function estimateFragment(f) {
  const sh = state.sheet;
  const xz = state.doc.xizmatlar || {};
  const key = state.materialCode + '|' + state.fasadCode + '|' + (sh ? sh.sku + sh.name + '@' + sh.uzs : '') + '|xz' + (xz.teshik ? 1 : 0);
  if (estCache.key !== key) { estCache.key = key; estCache.map = {}; estCache.mats = null; }
  if (estCache.map[f.code] == null) {
    const mats = estCache.mats || (estCache.mats = effectiveMaterials());   // nusxa — faqat kesh bo'sh bo'lsa
    const cl = cutlist(f, f.w, f.d, f.h, mats, { projectSlots: projectSlots() });
    estCache.map[f.code] = productionCost([cl], mats, { areaEstimate: true, furnituraById: state.furnById, xizmatlar: xz }).clientTotal;
  }
  return estCache.map[f.code];
}

const CAT_NAMES = {
  cabinet: 'Shkaf', wardrobe: 'Garderob', kitchen: 'Oshxona', bathroom: 'Hammom',
  sofa: 'Divan', table: 'Stol', chair: 'Stul', bed: 'Karavot',
  shelf: 'Javon', door: 'Eshik', window: 'Deraza',
  tall_cabinet: 'Penal', drawer_base: 'Tortmali tumba', wall_cabinet: 'Osma shkaf',
  cargo_base: 'Kargo tumba', wall_corner: 'Burchak osma', desk: 'Yozuv stoli',
  mobile_pedestal: "G'ildirakli tumba", coat_hanger: 'Kiyim ilgich', appliance: "O'rnatma texnika",
  vanity: 'Rakovina tumbasi', mirror_cabinet: "Ko'zguli shkaf", countertop: 'Oshxona qo\'shimcha', other: 'Boshqa'
};
function catName(c) { return CAT_NAMES[c] || c; }

function renderMaterials() {
  const panels = (state.materials.panel_materials || []).filter(m => /^(LDSP|LMDF|MDF|OSB)/.test(m.code));
  const opts = (cur) => panels.map(m =>
    `<option value="${esc(m.code)}" ${m.code === cur ? 'selected' : ''}>${esc(m.name)} — varaq ${m.sheet_price > 0 ? fmtSum(m.sheet_price) : "narx yo'q"}</option>`).join('');
  $('#matSel').innerHTML = opts(state.materialCode);
  $('#fasadSel').innerHTML = opts(state.fasadCode);
}

/* ERP katalogi tanlash — qidiruv yoki joriy tip bo'yicha */
const TRANSLIT = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
function normQ(s) {
  return String(s || '').toLowerCase().replace(/[а-яё]/g, c => TRANSLIT[c] || c);
}
function renderSheetSel() {
  const sel = $('#sheetSel'), qIn = $('#sheetQ');
  if (!sel || !state.sheetCatalog) return;
  const all = state.sheetCatalog.sheets || [];
  const q = (qIn && qIn.value || '').trim();
  let items;
  if (q && state.searchIndex) {
    /* ═══ Yangi qidiruv: ID + fuzzy + multi-til ═══ */
    const hits = searchMaterial(q, state.searchIndex, { limit: 150 });
    items = hits.map(h => h.item);
  } else if (q) {
    /* Fallback: eski qidiruv */
    const nq = normQ(q);
    items = all.filter(s => normQ(s.name + ' ' + s.sku + ' ' + s.cat).includes(nq)).slice(0, 200);
  } else {
    const base = (state.materials.panel_materials || []).find(m => m.code === state.materialCode);
    const typeOf = { LDSP18: 'LDSP', LDSP16: 'LDSP', LMDF16: 'LMDF', MDF18: 'MDF', MDF16: 'MDF', MDF8: 'MDF', HDF3: 'HDF', OYNA: 'OYNA' }[state.materialCode];
    const th = base ? base.thickness : 16;
    items = all.filter(s => s.uzs > 0 && s.type === typeOf && Math.abs((s.th || 0) - th) < 0.6).slice(0, 120);
    if (!items.length) items = all.filter(s => s.uzs > 0 && s.type === typeOf).slice(0, 120);
    if (!items.length) items = all.filter(s => s.uzs > 0).slice(0, 60);
  }
  /* ID bo'yicha guruhlash */
  const groups = {};
  items.forEach(s => {
    const key = s.cat_code || s.type || 'BOSH';
    (groups[key] = groups[key] || []).push(s);
  });
  const opts = ['<option value="-1">— ERP katalogi (demo narxlar) —</option>'];
  for (const t of Object.keys(groups).sort()) {
    opts.push(`<optgroup label="${esc(t)} (${groups[t].length})">`);
    for (const s of groups[t]) {
      /* ID orqali index topish */
      const idx = all.findIndex(x => (x.sku && x.sku === s.sku && x.name === s.name) || (x.name === s.name && x.type === s.type));
      const label = (s.id ? '[' + s.id + '] ' : '') + esc(s.name) + (s.sku ? ' · ' + esc(s.sku) : '');
      opts.push(`<option value="${idx}">${label} — ${fmtSum(s.uzs)}</option>`);
    }
    opts.push('</optgroup>');
  }
  sel.innerHTML = opts.join('');
  if (state.sheet) {
    const i = all.findIndex(x => (x.sku && x.sku === state.sheet.sku && x.name === state.sheet.name) || (x.name === state.sheet.name && x.type === state.sheet.type));
    if (i >= 0) sel.value = String(i);
  }
}

/* ═══════════════════ ZAMER ═══════════════════ */
/* F2: oshxona elementlari — UI ↔ doc.kitchen (top-level: setDoc chaqiradi) */
function syncKitchen() {
  const k = state.doc.kitchen;
  if (!k) return;
  $('#kStol').checked = !!k.stoleshnitsa;
  $('#kSokol').checked = !!k.sokol;
  $('#kDobor').checked = !!k.dobor;
  $('#kKarniz').checked = !!k.karniz;
  $('#kDoborH').value = k.doborH || 60;
  $('#kKarnizH').value = k.karnizH || 60;
  const m = k.moyka || {};
  $('#kMoyka').value = m.on ? 'on' : 'off';
  $('#kMoykaSize').value = m.size || 500;
  $('#kMoykaOff').value = m.offset != null ? m.offset : 600;
  $('#kMoykaBack').value = m.fromBack != null ? m.fromBack : 100;
}

function kitchenApply() {
  const k = state.doc.kitchen || (state.doc.kitchen = freshKitchen());
  k.stoleshnitsa = $('#kStol').checked;
  k.sokol = $('#kSokol').checked;
  k.dobor = $('#kDobor').checked;
  k.doborH = Math.max(30, +$('#kDoborH').value || 60);
  k.karniz = $('#kKarniz').checked;
  k.karnizH = Math.max(30, +$('#kKarnizH').value || 60);
  const m = k.moyka || (k.moyka = { on: false, offset: 600, fromBack: 100, size: 500 });
  m.on = $('#kMoyka').value === 'on';
  m.size = Math.max(300, Math.min(900, +$('#kMoykaSize').value || 0) || 500);
  m.offset = Math.max(0, +$('#kMoykaOff').value || 0);
  m.fromBack = Math.max(0, +$('#kMoykaBack').value || 0);
  setDoc(state.doc, { immediate: true });
}

function syncZamerInputs() {
  const r = state.doc.room;
  const bb = roomBBox(r.outline);
  $('#zW').value = Math.round(bb.w); $('#zD').value = Math.round(bb.h); $('#zH').value = r.wall_height;
  renderPts(r.outline);
  renderWallSelect();
  renderOpenings();
  renderUtilities();
  syncKitchen();
}

/* F1: poligon nuqtalar jadvali — applyRoom uchun yagona manba (truth).
   W/D inputlari "rect generator": kiritilsa jadval to'rtburchakka qaytadi. */
function renderPts(pts) {
  $('#zPts').innerHTML = (pts || []).map((p, i) => `
    <div data-row="${i}">
      <b>${i + 1}</b>
      <input class="px" type="number" step="50" value="${Number(p[0]) || 0}" aria-label="X nuqta ${i + 1}">
      <input class="py" type="number" step="50" value="${Number(p[1]) || 0}" aria-label="Y nuqta ${i + 1}">
      <button class="btn" data-delpt="${i}" title="Nuqtani o'chirish"${(pts || []).length <= 3 ? ' disabled' : ''}>✕</button>
    </div>`).join('');
}

function rectifyPts() {
  const w = +$('#zW').value || 4000, d = +$('#zD').value || 3000;
  renderPts([[0, 0], [w, 0], [w, d], [0, d]]);
}

function ptsFromTable() {
  const rows = [...document.querySelectorAll('#zPts [data-row]')];
  if (rows.length < 3) return null;
  const pts = rows.map(r => [+r.querySelector('.px').value, +r.querySelector('.py').value]);
  if (pts.some(p => !isFinite(p[0]) || !isFinite(p[1]))) return null;
  // yopiq halqa (oxirgi = birinchi) bo'lsa — takroriy nuqtani tashlaymiz
  if (pts.length > 3 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
  return pts.length >= 3 ? pts : null;
}

function wallOptionsHtml() {
  const pts = state.doc.room.outline || [];
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const len = Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]));
    return `<option value="${i}">${i} (${len} mm)</option>`;
  }).join('');
}

function renderWallSelect() {
  const pts = state.doc.room.outline || [];
  const curO = $('#oWall').value, curU = $('#uWall').value;
  const html = wallOptionsHtml();
  $('#oWall').innerHTML = html;
  $('#uWall').innerHTML = html;
  if (Number(curO) < pts.length) $('#oWall').value = curO;
  if (Number(curU) < pts.length) $('#uWall').value = curU;
}

function renderUtilities() {
  const utils = state.doc.room.utilities || [];
  $('#uList').innerHTML = utils.map((u, i) =>
    `<span class="chip is-active">${u.type === 'outlet' ? '🔌' : '🚿'} devor ${Number(u.wall) || 0} · ${Number(u.offset) || 0}mm · z${Number(u.z) || 0} <b data-delu="${i}" style="margin-left:6px;cursor:pointer">✕</b></span>`
  ).join('');
}

function ptsEq(a, b) {
  return a.length === b.length &&
    a.every((p, i) => Number(p[0]) === Number(b[i][0]) && Number(p[1]) === Number(b[i][1]));
}

function applyRoom() {
  const h = +$('#zH').value || 2700;
  const cur = state.doc.room.outline || [];
  const w = +$('#zW').value || 4000, d = +$('#zD').value || 3000;
  let pts = ptsFromTable();
  if (!pts || ptsEq(pts, cur)) {
    /* Jadval o'zgartirilmagan (yoki yaroqsiz) → W/D "rect generator" ustuvor:
       qiymatlar programmatik kiritilsa ham (input event chiqmasa) ishlaydi. */
    const bb = roomBBox(cur);
    pts = (Math.round(bb.w) !== w || Math.round(bb.h) !== d)
      ? [[0, 0], [w, 0], [w, d], [0, d]]
      : (pts || cur);
  }
  state.doc.room.outline = pts;
  state.doc.room.wall_height = h;
  setDoc(state.doc, { immediate: true });
  const bb = roomBBox(pts);
  toast('Xona: ' + pts.length + ' nuqta · ' + bb.w + '×' + bb.h + '×' + h + ' mm', 'good');
}

function renderOpenings() {
  const ops = state.doc.room.openings || [];
  $('#oList').innerHTML = ops.map((o, i) =>
    `<span class="chip is-active">${o.type === 'window' ? '🪟' : '🚪'} devor ${Number(o.wall) || 0} · ${Number(o.width) || 0}mm <b data-del="${i}" style="margin-left:6px;cursor:pointer">✕</b></span>`
  ).join('');
}

/* ═══════════════════ AI ═══════════════════ */
async function runAI() {
  const text = $('#aiText').value.trim();
  if (!text) { toast('Avval matn yozing yoki ovozni bosing', 'err'); return; }
  if (state.doc.placements.length &&
      !(await askConfirm('AI yangi konstruksiya quradi — joriy ' + state.doc.placements.length + ' ta mebel almashtiriladi. Davom etasizmi?', 'Almashtirish'))) return;
  const btn = $('#btnBuild');
  btn.disabled = true; btn.textContent = '⏳ Qurilmoqda…';
  try {
    const res = await aiBuild(text, state.catalog);
    res.doc.placements = res.doc.placements.filter(p => state.catalog[p.frg]);
    /* F1/F2: AI yangi xona quradi — lekin quvur/rozetka va oshxona sozlamalari saqlanadi */
    res.doc.room.utilities = (state.doc.room && state.doc.room.utilities) || [];
    res.doc.kitchen = state.doc.kitchen || freshKitchen();
    setDoc(res.doc, { immediate: true });
    sp.setMode('2d');
    ctl.updateButtons();
    $('#aiOut').innerHTML =
      (res.assumed
        ? `<div class="msg warn">⚠️ Xona o'lchami tushunilmadi — 3600×2800 mm taxmin qilindi.
           Matnda "3x4 metr", "3.5 ga 2.8" kabi yozing.</div>`
        : `<div class="msg ok">✅ ${(() => { const b = roomBBox(res.doc.room.outline); return Math.round(b.w) + '×' + Math.round(b.h); })()}×${res.doc.room.wall_height} mm —
       ${res.doc.placements.length} mebel qo'yildi (manba: ${res.source === 'llm' ? 'LLM' : 'qoida engine'})</div>`) +
      (res.unknown.length ? `<div class="msg warn">Tushunilmadi: ${esc(res.unknown.join(', '))}</div>` : '') +
      ((res.notes || []).length ? `<div class="msg warn">⚠️ ${esc(res.notes.join(' · '))}</div>` : '');
    toast('Konstruksiya tayyor!', 'good');
    openTab('smeta');
  } catch (e) {
    toast('AI xato: ' + e.message, 'err');
  } finally {
    btn.disabled = false; btn.textContent = '🪄 Konstruksiyani qurish';
  }
}

function toggleVoice() {
  const btn = $('#btnVoice');
  if (state.voice) {
    state.voice.stop(); state.voice = null;
    btn.classList.remove('rec'); btn.textContent = '🎤 Ovoz';
    return;
  }
  if (!voiceSupported()) { toast('Bu brauzer ovozni qo\'llab-quvvatlamaydi (Chrome/Edge kiriting)', 'err'); return; }
  btn.classList.add('rec'); btn.textContent = '● Yozilyapti…';
  const reset = () => { state.voice = null; btn.classList.remove('rec'); btn.textContent = '🎤 Ovoz'; };
  const VOICE_ERR = {
    'not-allowed': 'Mikrofonga ruxsat bering (brauzer sozlamalari)',
    'service-not-allowed': 'Mikrofonga ruxsat bering (brauzer sozlamalari)',
    'audio-capture': 'Mikrofon topilmadi',
    'network': 'Ovoz xizmati uchun internet kerak'
  };
  let triedRu = false;
  const start = (lang) => {
    const rec = startVoice({
      lang,
      onText: (t) => { $('#aiText').value = t; },
      onEnd: (err) => {
        if (state.voice !== rec) return;            // to'xtatilgan yoki almashtirilgan sessiya
        if (err === 'language-not-supported' && !triedRu) {
          triedRu = true; state.voice = start('ru-RU'); return;   // zaxira: rus tili
        }
        reset();
        if (err && err !== 'no-speech' && err !== 'aborted') toast(VOICE_ERR[err] || ('Ovoz xatosi: ' + err), 'bad');
      }
    });
    return rec;
  };
  state.voice = start('uz-UZ');
  if (!state.voice) reset();
}

/* ═══════════════════ EXPORT ═══════════════════ */

/* Exportdan oldin data integrity — fayl/modul buzilmasligi uchun */
function integrityCheck(needCutlist) {
  if (!state.doc || !state.doc.placements || !state.doc.placements.length) {
    toast('Loyiha bo\'sh — mebel qo\'ying', 'bad'); return false;
  }
  if (!state.materials || !state.catalog) {
    toast('Bazalar yuklanmagan', 'bad'); return false;
  }
  const v = validateDoc(state.doc, { catalog: state.catalog });
  if (!v.ok) {
    toast('Validatsiya xatosi: ' + (v.errors[0] && v.errors[0].message || ''), 'bad');
    return false;
  }
  if (needCutlist && !(state._res && state._res.cutlists && state._res.cutlists.length)) {
    toast('Avval smeta hisoblansin (cutlist bo\'sh)', 'bad'); return false;
  }
  return true;
}

function exportOBJ() {
  if (!integrityCheck(false)) return;
  const r = buildOBJ(Object.assign({}, state.doc, { placements: viewPlacements() }), state.catalog);
  download('smart3d-model.obj', r.obj, 'text/plain');
  setTimeout(() => download('smart3d-model.mtl', r.mtl, 'text/plain'), 350);
  toast('OBJ + MTL yuklanmoqda — ' + r.placements.length + ' guruh', 'good');
}
function exportGlb() {
  if (!integrityCheck(false)) return;
  try {
    const res = buildGLB(Object.assign({}, state.doc, { placements: viewPlacements() }), state.catalog);
    const name = ($('#projName').textContent.trim() || 'smart3d').replace(/\s+/g, '_');
    download(name + '-model.glb', res.glb, 'model/gltf-binary');
    toast(`GLB tayyor — ${res.stats.totalBoxes} panel (${Math.round(res.stats.byteLength / 1024)} KB)`, 'good');
  } catch (e) {
    console.error('GLB export xato:', e);
    toast('GLB xato: ' + e.message, 'bad');
  }
}

let panoViewer = null;

async function take1080pRender() {
  if (!sp) return;
  try {
    toast('1080p Ultra-HD render olinmoqda...', 'info');
    const r = await render1080p(sp, { download: true });
    toast(`1080p render tayyor (${r.width}x${r.height})`, 'good');
  } catch (e) {
    console.error('1080p render xatosi:', e);
    toast('Render xatosi: ' + e.message, 'bad');
  }
}

async function take360Panorama() {
  if (!sp) return;
  try {
    toast('360° Ekvirektangulyar panorama render qilinmoqda...', 'info');
    const r = await render360Panorama(sp, { download: false });
    const dlg = $('#panoModal');
    const container = $('#panoCanvasContainer');
    if (panoViewer) { panoViewer.dispose(); panoViewer = null; }
    container.innerHTML = '';
    dlg.showModal();                     // avval ochamiz — konteyner o'lchami ma'lum bo'lsin
    initPano360Viewer(container, r.canvas);

    $('#panoDownload').onclick = () => {
      const a = document.createElement('a');
      a.href = r.dataUrl;
      a.download = `Smart3D_360_Panorama_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast('360° Panorama yuklab olindi!', 'good');
    };
    $('#panoClose').onclick = () => dlg.close();
    /* ✕ ham, Esc ham shu yerga keladi — WebGL renderer va sikl doim bo'shatiladi */
    dlg.onclose = () => {
      if (panoViewer) {
        panoViewer.dispose();
        panoViewer = null;
      }
    };
    toast('360° Virtual Tur ochildi!', 'good');
  } catch (e) {
    console.error('360 panorama xatosi:', e);
    toast('Panorama xatosi: ' + e.message, 'bad');
  }
}

function initPano360Viewer(container, panoCanvas) {
  const w = container.clientWidth || 800;
  const h = container.clientHeight || 400;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h);
  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, w / h, 1, 1100);
  camera.target = new THREE.Vector3(0, 0, 0);

  /* oyna o'lchami o'zgarsa (telefon burildi) — ko'rgich ham moslashadi */
  const ro = new ResizeObserver(() => {
    const cw = container.clientWidth || w, ch = container.clientHeight || h;
    renderer.setSize(cw, ch);
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
  });
  ro.observe(container);

  const geometry = new THREE.SphereGeometry(500, 60, 40);
  geometry.scale(-1, 1, 1);

  const texture = new THREE.CanvasTexture(panoCanvas);
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  let isUserInteracting = false;
  let onPointerDownMouseX = 0, onPointerDownMouseY = 0;
  let lon = 0, onPointerDownLon = 0;
  let lat = 0, onPointerDownLat = 0;
  let phi = 0, theta = 0;
  let reqId = null;

  function onPointerDown(event) {
    isUserInteracting = true;
    onPointerDownMouseX = event.clientX;
    onPointerDownMouseY = event.clientY;
    onPointerDownLon = lon;
    onPointerDownLat = lat;
  }
  function onPointerMove(event) {
    if (!isUserInteracting) return;
    lon = (onPointerDownMouseX - event.clientX) * 0.2 + onPointerDownLon;
    lat = (event.clientY - onPointerDownMouseY) * 0.2 + onPointerDownLat;
  }
  function onPointerUp() { isUserInteracting = false; }
  function onWheel(event) {
    camera.fov = Math.max(30, Math.min(100, camera.fov + event.deltaY * 0.05));
    camera.updateProjectionMatrix();
  }

  const el = renderer.domElement;
  el.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  el.addEventListener('wheel', onWheel, { passive: true });

  function animate() {
    reqId = requestAnimationFrame(animate);
    lat = Math.max(-85, Math.min(85, lat));
    phi = THREE.MathUtils.degToRad(90 - lat);
    theta = THREE.MathUtils.degToRad(lon);

    camera.target.x = 500 * Math.sin(phi) * Math.cos(theta);
    camera.target.y = 500 * Math.cos(phi);
    camera.target.z = 500 * Math.sin(phi) * Math.sin(theta);
    camera.lookAt(camera.target);

    renderer.render(scene, camera);
  }
  animate();

  panoViewer = {
    dispose() {
      cancelAnimationFrame(reqId);
      ro.disconnect();
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('wheel', onWheel);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      container.innerHTML = '';
    }
  };
}
function exportHoles() {
  if (!integrityCheck(false)) return;
  const r = buildOBJ(Object.assign({}, state.doc, { placements: viewPlacements() }), state.catalog);
  download('smart3d-holes.json', JSON.stringify({ version: 1, unit: 'mm', holes: r.holes, placements: r.placements }, null, 1), 'application/json');
}
function exportCut() {
  if (!integrityCheck(true)) return;
  const cls = state._res.cutlists;
  download('smart3d-cutlist.csv', cutlistCSV(cls), 'text/csv');
}
function exportXnc() {
  if (!integrityCheck(true)) return;
  const cls = state._res.cutlists;
  const name = $('#projName').textContent.trim() || 'smart3d';
  download(name.replace(/\s+/g, '_') + '-xnc.csv',
    '﻿' + xncCSV(cls, state.materials, state.catalog), 'text/csv');
  toast('XNC CSV tayyor — GibLab import uchun', 'good');
}

function printReport() {
  /* A4 hisobot: kotirovka + ishlab chiqarish + raskroy — chop etish / PDF */
  const res = state._res;
  if (!res || !res.priceRes) { toast('Avval smeta hisoblansin', 'bad'); return; }
  const name = $('#projName').textContent.trim() || 'Smart3D';
  const pr = res.priceRes, prod = res.prod, nest = res.nest;
  const s = (nest && nest.summary) || {};
  const fmt = (x) => fmtSum(x == null ? 0 : x);
  const rows = pr.lines.map(l =>
    `<tr><td>${esc(l.name)}<br><small>${esc(l.code)} · ${Number(l.w) || 0}×${Number(l.d) || 0} mm</small></td><td class=n>${Number(l.qty) || 0}</td><td class=n>${fmt(l.unit_price)}</td><td class=n>${fmt(l.amount)}</td></tr>`
  ).join('') || '<tr><td colspan=4>Mebel qo\'yilmagan</td></tr>';
  const prodRows = ((prod && prod.lines) || []).map(l =>
    `<tr><td>${esc(l.name || l.material || '')}</td><td class=n>${esc(l.unit || '')}</td><td class=n>${fmt(l.amount != null ? l.amount : l.cost)}</td></tr>`
  ).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(name)} — hisobot</title>
<style>
  body{font-family:Segoe UI,Arial,sans-serif;color:#111;margin:28px;font-size:13px}
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
<h1>${esc(name)}</h1>
<div class="meta">Smart3D hisobot · ${new Date().toLocaleDateString('uz-UZ')} · material: ${esc(state.materialCode)}</div>
<h2>1. Kotirovka (mijozga)</h2>
<table><thead><tr><th>Mebel</th><th class=n>Miq.</th><th class=n>Narx</th><th class=n>Summa</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="tot">JAMI: ${fmt(pr.total)} so'm</div>
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
<footer>Smart3D · ${esc(name)} · ${new Date().toISOString().slice(0, 10)} · sahifa 1/1</footer>
<script>window.onload = () => { window.print(); };</script>
</body></html>`;
  const w = window.open('', '_blank');
  if (!w) { toast('Brauzer popup yopdi — ruxsat bering', 'bad'); return; }
  w.document.write(html);
  w.document.close();
}
function exportXlsx() {
  if (!integrityCheck(true)) return;
  try {
    const res = state._res;
    const name = ($('#projName').textContent.trim() || 'smart3d').replace(/\s+/g, '_');
    const xlsx = buildXLSX({
      doc: state.doc,
      catalog: state.catalog,
      materials: effectiveMaterials(),
      priceRes: res.priceRes,
      prod: res.prod,
      nest: res.nest,
      sheet: state.sheet,
      materialCode: state.materialCode,
      projectName: $('#projName').textContent.trim() || 'Smart3D Loyihasi',
      services: state.services
    });
    download(name + '-smeta.xlsx', xlsx, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    toast('Excel smeta tayyor (5 ta bo\'lim)', 'good');
  } catch (e) {
    console.error('XLSX export xato:', e);
    toast('Excel xato: ' + e.message, 'bad');
  }
}
function exportSmeta() {
  if (!integrityCheck(true)) return;
  const pr = state._res.priceRes;
  download('smart3d-smeta.csv', smetaCSV(pr.lines.map(l => ({ group: 'Mebel', name: l.name, qty: l.qty, unit: 'dona', unit_price: l.unit_price, amount: l.amount })), pr.total), 'text/csv');
}
function exportProject() {
  if (!integrityCheck(false)) return;
  download('smart3d-project.json', JSON.stringify({
    app: 'smart3d', v: 2, ts: Date.now(),
    material: state.materialCode,
    fasad: state.fasadCode,
    sheet: state.sheet || null,
    name: $('#projName').textContent.trim(),
    doc: state.doc
  }, null, 1), 'application/json');
}
function exportBpj() {
  if (!integrityCheck(false)) return;
  /* Real .bpj — BazisUniversalExport 4.2 formati (haqiqiy 1.bpj fayl asosida).
     JSON (UTF-8) — BazisViewer/Bazis import qiladi. */
  try {
    const name = $('#projName').textContent.trim() || 'Smart3D';
    const bpj = buildBPJ(Object.assign({}, state.doc, { placements: viewPlacements() }), state.catalog, state.materials, {
      modelName: name, materialCode: state.materialCode, cutlists: state._res?.cutlists
    });
    download(name.replace(/\s+/g, '_') + '.bpj',
      JSON.stringify(bpj, null, 2), 'application/json');
    toast('BPJ tayyor — ' + bpj.meta.totalPanels + ' panel — SINOV: Bazis\'da ochib tekshirilmagan', 'warn');   // TZ-01
  } catch (e) {
    console.error('BPJ export xato:', e);
    toast('BPJ xato: ' + e.message, 'bad');
  }
}

function exportGl() {
  if (!integrityCheck(true)) return;
  /* GibLab .project — XML + binar raskroy kartasi (data attr).
     kroy.bittada.uz'ga import qilinadi (haqiqiy format, 57/57 round-trip). */
  try {
    const res = state._res;
    const name = $('#projName').textContent.trim() || 'Smart3D';
    const gl = buildGlProject({
      cutlists: res.cutlists, materials: state.materials,
      modelName: name, materialCode: state.materialCode,
      nest: res.nest,
      settings: {
        kerf: state.nestCfg && state.nestCfg.kerf,
        trimL: state.nestCfg && state.nestCfg.trimL,
        trimW: state.nestCfg && state.nestCfg.trimW
      }
    });
    download(name.replace(/\s+/g, '_') + '.project', gl.xml, 'application/xml');
    const ops = (gl.xml.match(/<operation /g) || []).length;
    const st = gl.stats || {};
    toast(`GibLab .project tayyor — ${ops} operatsiya, ${st.placed}/${st.parts} detal, ${st.sheets} varaq`, 'good');
    if (gl.warnings && gl.warnings.length) {
      console.warn('GibLab ogohlantirish:', gl.warnings);
      toast('GibLab: ' + gl.warnings[0] + (gl.warnings.length > 1 ? ` (+${gl.warnings.length - 1})` : ''), 'warn');
    }
  } catch (e) {
    console.error('GibLab export xato:', e);
    toast('GibLab xato: ' + e.message, 'bad');
  }
}

/* ── CNC export: DXF / NC / PTP ── */
function cncSafe(fn, filename, mime, okMsg) {
  if (!integrityCheck(true)) return;
  try {
    const res = state._res;
    const content = fn(res.nest, res.cutlists);
    const name = ($('#projName').textContent.trim() || 'smart3d').replace(/\s+/g, '_');
    download(name + filename, content, mime);
    toast(okMsg + ' — SINOV: sexda tekshirilmagan', 'warn');   // TZ-01
  } catch (e) {
    console.error('CNC export xato:', e);
    toast('CNC xato: ' + e.message, 'bad');
  }
}
function exportDxf() {
  cncSafe((nest, cls) => cncBundle(nest, cls).dxf, '-raskroy.dxf', 'application/dxf', 'DXF tayyor — raskroy');
}
function exportNc() {
  cncSafe((nest, cls) => cncBundle(nest, cls).nc, '-teshik.nc', 'text/plain', 'NC (Excellon) tayyor');
}
function exportPtp() {
  cncSafe((nest, cls) => cncBundle(nest, cls).ptp, '-ptp.csv', 'text/csv', 'PTP pozitsiya tayyor');
}
function exportGcode() {
  cncSafe((nest, cls) => cutGCode(nest, cls, { toolDia: 6.0, addTabs: true }), '-kesim.nc', 'text/plain', 'G-code (ISO) tayyor — kontur kesim');
}
function exportCix() {
  cncSafe((nest, cls) => cncBundle(nest, cls).cix, '-biesse.cix', 'text/plain', 'Biesse CIX dasturi tayyor');
}
function exportMpr() {
  cncSafe((nest, cls) => cncBundle(nest, cls).mpr, '-homag.mpr', 'text/plain', 'Homag WoodWOP MPR dasturi tayyor');
}
function exportAltendorf() {
  cncSafe((nest, cls) => cncBundle(nest, cls).altendorf, '-altendorf-fazali-kesim.txt', 'text/plain', 'Altendorf fazali kesim xaritasi tayyor');
}

/* ═══════════════════ LAYOUT / TABS ═══════════════════ */
function openTab(name) {
  const already = $('.tab.is-active') && $('.tab.is-active').dataset.tab === name;
  const panel = $('#panel');
  $$('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.tab === name));
  $$('.pane').forEach(p => p.classList.toggle('is-active', p.dataset.pane === name));
  if (already && panel.classList.contains('open')) {
    panel.classList.remove('open', 'tall');
  } else {
    panel.classList.add('open');
    panel.classList.toggle('tall', name === 'smeta' || name === 'export' || name === 'ai');
  }
  syncPanelState();
}

/* Pastki sheet rejimida (telefon/planshet) sahna panel ustida qisqaradi — CSS body
   klasslari orqali; #scene ResizeObserver o'lchamni o'zi yangilaydi va 2D ni sig'diradi. */
function syncPanelState() {
  const panel = $('#panel');
  document.body.classList.toggle('panel-open', panel.classList.contains('open'));
  document.body.classList.toggle('panel-tall', panel.classList.contains('tall'));
  setTimeout(() => sp._resize(), 250);       // panel balandligi animatsiyasidan keyin
}
function togglePanel() {
  const panel = $('#panel');
  if (panel.classList.contains('open')) { panel.classList.remove('open', 'tall'); syncPanelState(); }
  else openTab(($('.tab.is-active') || $('.tab')).dataset.tab);
}

function hideItemCardOnSmall() {}

/* ═══════════════════ SAVE / LOAD ═══════════════════ */
const LS_KEY = 'smart3d.project.v2';
function saveProject() {
  if (!state.doc || !state.doc.placements) { toast('Saqlash uchun loyiha yo\'q', 'bad'); return; }
  const payload = {
    app: 'smart3d', v: 2, ts: Date.now(),
    name: $('#projName').textContent.trim(),
    material: state.materialCode,
    fasad: state.fasadCode,
    sheet: state.sheet ? { sku: state.sheet.sku, name: state.sheet.name, type: state.sheet.type, th: state.sheet.th, l: state.sheet.l, w: state.sheet.w, uzs: state.sheet.uzs } : null,
    doc: state.doc
  };
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
    toast('Loyiha saqlandi (' + state.doc.placements.length + ' mebel)', 'good');
  } catch (e) {
    toast('Saqlashda xato: ' + e.message, 'bad');
  }
}
function loadProject() {
  const raw = localStorage.getItem(LS_KEY) || localStorage.getItem('smart3d.project.v1');
  if (!raw) { toast('Saqlangan loyiha yo\'q', 'bad'); return; }
  try {
    const p = JSON.parse(raw);
    /* integrity: minimal tuzilma tekshiruvi */
    if (!p.doc || !p.doc.room || !Array.isArray(p.doc.placements)) {
      toast('Loyiha fayli buzilgan (noto\'g\'ri tuzilma)', 'bad'); return;
    }
    /* versiya: eskisi ham qabul qilinadi, lekin ogohlantiramiz */
    if (p.v && p.v > 2) {
      toast('Loyiha yangi versiyada — ba\'zi funksiyalar ishlamasligi mumkin', 'warn');
    }
    $('#projName').textContent = p.name || 'Loyiha';
    state.materialCode = p.material || 'LDSP18';
    state.fasadCode = p.fasad || 'MDF16';
    state.sheet = p.sheet || null;
    renderMaterials(); renderSheetSel(); renderCatalog();
    setDoc(p.doc, { immediate: true });
    toast('Loyiha yuklandi — ' + p.doc.placements.length + ' mebel', 'good');
  } catch (e) {
    toast('Yuklashda xato: ' + e.message, 'bad');
  }
}
async function newProject() {
  if (state.doc.placements.length &&
      !(await askConfirm('Joriy loyiha (' + state.doc.placements.length + ' mebel) o\'chiriladi. Davom etasizmi?', 'Yangi loyiha'))) return;
  state.doc = { v: 1, kind: 'smart3d', room: freshRoom(), placements: [] };
  $('#projName').textContent = 'Yangi loyiha';
  items.select(null); hideItemCard();
  setDoc(state.doc, { immediate: true });
}

/* ═══════════════════ INIT ═══════════════════ */
async function boot() {
  const [frags, mats, nestDef, sheetCat, matIdx, services, appliances, mcFrags, sexStd, furnCat] = await Promise.all([
    fetch('data/fragments.json').then(r => r.json()),
    fetch('data/materials.json').then(r => r.json()),
    fetch('data/nesting-defaults.json').then(r => r.json()).catch(() => ({})),
    fetch('data/sheet-catalog.json').then(r => r.json()).catch(() => null),
    fetch('data/materials-index.json').then(r => r.json()).catch(() => null),
    fetch('data/services.json').then(r => r.json()).catch(() => null),
    fetch('data/appliances.json').then(r => r.json()).catch(() => null),
    fetch('data/fragments-mc.json').then(r => r.json()).catch(() => null),        // MebelCity haqiqiy modullari (TZ-HAQIQIY-MODULLAR A2)
    fetch('data/sex-standartlari.json').then(r => r.json()).catch(() => null),    // sex min/max (A1)
    fetch('data/furnitura-catalog.json').then(r => r.json()).catch(() => null)    // ERP furnitura, ID → narx (A4)
  ]);
  /* ERP furnitura ID → {name, uzs, no_price}: tannarx zapchast narxini ID bo'yicha oladi */
  state.furnById = {};
  for (const it of (furnCat && furnCat.items) || []) if (it.id) state.furnById[it.id] = it;
  state.catalog = {};
  for (const f of frags) state.catalog[f.code] = f;
  for (const f of (mcFrags && mcFrags.fragments) || []) state.catalog[f.code] = f;
  state.sexStd = sexStd;
  for (const f of Object.values(state.catalog)) applySexStandart(f, sexStd);
  /* F2: o'rnatma texnika — nishon (bo'sh korpusli) katalog yozuvlari */
  for (const a of (appliances && appliances.appliances) || []) {
    state.catalog[a.code] = {
      code: a.code, name: a.name, category: 'appliance', group: 'texnika',
      w: a.w, d: a.d, h: a.h, min_w: 200, max_w: 1200,
      price_mode: 'unit', price: 0, production: 'none',
      parts: [], holes: [], hardware: [], edge: [],
      default_z: a.z || 0, note: a.note
    };
  }
  state.materials = mats;
  state.sheetCatalog = sheetCat;
  state.services = services;
  /* material ID + fuzzy qidiruv indeksi */
  if (matIdx && matIdx.items) {
    state.searchIndex = buildSearchIndex(matIdx.items);
  }
  /* nesting config: defaults + localStorage (foydalanuvchi sozlamalari) */
  state.nestCfg = Object.assign({}, nestDef);
  try {
    const saved = JSON.parse(localStorage.getItem('s3d-nest-cfg') || 'null');
    if (saved && typeof saved === 'object') Object.assign(state.nestCfg, saved);
  } catch (e) { /* buzilgan kesh — defaults bilan davom */ }
  delete state.nestCfg._meta;
  const known = (c) => (mats.panel_materials || []).some(m => m.code === c);
  if (!known(state.materialCode)) state.materialCode = 'LDSP18';
  if (!known(state.fasadCode)) state.fasadCode = 'MDF16';

  /* sahna */
  // sp-scene inline `position:relative` qo'yadi — stylesheetdagi absolute
  // ustun bo'lishi uchun avval inline qiymatni belgilaymiz.
  $('#scene').style.position = 'absolute';
  sp = createScene($('#scene'), { mode: '2d', insetTop: 56 });   // 56px — #viewCtl tugmalari
  ctl = attachControls(sp, {
    onToggle: () => { $('#btn2d').classList.toggle('is-active', sp.mode === '2d'); $('#btn3d').classList.toggle('is-active', sp.mode === '3d'); },
    hitTest: (e) => !!(items && items.hitTest(e))      // mebel ustida — sudrash items.js ga
  });
  items = createItems(sp, {
    getPlacements: () => viewPlacements(),
    onSelect: (id, mesh, source) => {
      state.selectedId = id;
      if (id) {
        /* telefonda sahnadagi mebelga tegilsa panel yig'iladi — mebel kartasiga joy kerak
           (app.css ≤599px). Katalogdan qo'shishda panel ochiq qoladi. */
        if (source === 'scene' && PHONE_MQ.matches && $('#panel').classList.contains('open')) togglePanel();
        showItemCard(id);
      } else hideItemCard();
    },
    /* sudrash paytida mesh'ni items.js o'zi siljitadi — bu yerda faqat ma'lumot,
       qayta qurish yo'q; narx to'xtagandan keyin (debounce) hisoblanadi */
    onDrag: (id, x, y) => {
      const p = state.doc.placements.find(q => q.id === id);
      if (!p) return;
      p.x = x; p.y = y;
      if (state.selectedId === id) $('#icX').value = x;
      scheduleRecalc();
    },
    /* TZ-08: burish dastagi — markaz atrofida; qo'yib yuborilganda sahna qayta quriladi
       (stoleshnitsa/sokol kabi hosila elementlar yangi burchakka moslashadi) */
    onRotate: (id, rot, x, y) => {
      const p = state.doc.placements.find(q => q.id === id);
      if (!p) return;
      p.rot = rot; p.x = x; p.y = y;
      if (state.selectedId === id) $('#icX').value = x;
      scheduleRecalc();
    },
    onRotateEnd: (id) => {
      items.setPlacements(viewPlacements(), state.catalog);
      if (state.selectedId === id) showItemCard(id);
    }
  });

  /* boshlang'ich namuna: oshxona */
  state.doc = { v: 1, kind: 'smart3d', room: freshRoom(), placements: [] };
  const sample = suggestLayout(state.doc.room, state.catalog, [{ kind: 'pastki', qty: 3 }, { kind: 'ustki', qty: 2 }]);
  state.doc.placements = sample;

  renderMaterials();
  renderSheetSel();
  renderCatalog();
  setDoc(state.doc, { immediate: true });

  /* ── Hodisalar ── */
  // tabs
  $$('.tab').forEach(t => t.addEventListener('click', () => openTab(t.dataset.tab)));
  $('#panelGrab').addEventListener('click', togglePanel);
  // view
  /* VR tugmasi — faqat 3D rejimda + WebXR qo'llab-quvvatlansa ko'rinadi */
  let vrBtn = null;
  try {
    vrBtn = VRButton.createButton(sp.renderer);
    vrBtn.style.display = 'none';
    document.body.appendChild(vrBtn);
  } catch (e) { /* WebXR yo'q — jim o'tamiz */ }
  const syncVR = () => {
    if (!vrBtn) return;
    // isSessionSupported async javob beradi — "NOT SUPPORTED" bo'lsa yashiramiz
    const unsupported = /NOT SUPPORTED|NOT ALLOWED/i.test(vrBtn.textContent || '');
    vrBtn.style.display = (sp.mode === '3d' && !unsupported) ? '' : 'none';
  };
  [400, 1200, 2500].forEach(t => setTimeout(syncVR, t));   // WebXR async javobini kutamiz

  $('#btn2d').addEventListener('click', () => { sp.setMode('2d'); ctl.updateButtons(); $('#btn2d').classList.add('is-active'); $('#btn3d').classList.remove('is-active'); syncVR(); });
  $('#btn3d').addEventListener('click', () => { sp.setMode('3d'); ctl.updateButtons(); $('#btn3d').classList.add('is-active'); $('#btn2d').classList.remove('is-active'); syncVR(); });
  $('#btnFit').addEventListener('click', () => sp.fit());
  // zamer
  $('#zApply').addEventListener('click', applyRoom);
  $$('#zPresets .chip').forEach(c => c.addEventListener('click', () => {
    $('#zW').value = c.dataset.w; $('#zD').value = c.dataset.d;
    rectifyPts(); applyRoom();                       // preset = doim to'rtburchak
  }));
  // F1: shakl tugmalari — to'rtburchak (W/D) yoki L shakl poligoni
  $$('#zShapes .chip').forEach(c => c.addEventListener('click', () => {
    if (c.dataset.shape === 'rect') { rectifyPts(); applyRoom(); }
    else {
      renderPts([[0, 0], [3600, 0], [3600, 2000], [2200, 2000], [2200, 3000], [0, 3000]]);
      $('#zPtsWrap').open = true;                    // nuqtalar ko'rinib tursin
      applyRoom();
    }
  }));
  // F1: nuqtalar jadvali — qo'shish / o'chirish; W/D kiritilsa → rect
  $('#zPtAdd').addEventListener('click', () => {
    const rows = [...document.querySelectorAll('#zPts [data-row]')];
    const last = rows.length ? [+rows[rows.length - 1].querySelector('.px').value,
                                +rows[rows.length - 1].querySelector('.py').value] : [0, 0];
    const pts = rows.map(r => [+r.querySelector('.px').value, +r.querySelector('.py').value]);
    pts.push([isFinite(last[0]) ? last[0] + 500 : 0, isFinite(last[1]) ? last[1] : 0]);
    renderPts(pts);
  });
  $('#zPts').addEventListener('click', (e) => {
    const i = e.target.dataset && e.target.dataset.delpt;
    if (i == null) return;
    const pts = [...document.querySelectorAll('#zPts [data-row]')]
      .filter(r => r.dataset.row !== i)
      .map(r => [+r.querySelector('.px').value, +r.querySelector('.py').value]);
    if (pts.length >= 3) renderPts(pts);
  });
  ['#zW', '#zD'].forEach(sel => $(sel).addEventListener('input', rectifyPts));
  $('#oAdd').addEventListener('click', () => {
    const wall = +$('#oWall').value;
    const w = state.doc.room.outline;
    const a = w[wall], b = w[(wall + 1) % w.length];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);   // F1: haqiqiy edge uzunligi
    const wid = Math.min(+$('#oW').value || 1000, seg - 800);
    state.doc.room.openings.push({
      wall, type: $('#oType').value, offset: Math.max(100, Math.round((seg - wid) / 2)),
      width: wid, sill: $('#oType').value === 'window' ? 900 : 0,
      height: $('#oType').value === 'window' ? 1400 : 2100
    });
    setDoc(state.doc, { immediate: true });
  });
  $('#oClear').addEventListener('click', () => { state.doc.room.openings = []; setDoc(state.doc, { immediate: true }); });
  // F1: quvur / rozetka
  $('#uAdd').addEventListener('click', () => {
    const pts = state.doc.room.outline || [];
    const wall = +$('#uWall').value;
    const a = pts[wall], b = pts[(wall + 1) % pts.length];
    if (!a || !b) { toast("Avval xonani qo'llang", 'err'); return; }
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const off = Math.max(0, Math.min(seg, +$('#uOffset').value || 0));
    (state.doc.room.utilities = state.doc.room.utilities || []).push({
      type: $('#uType').value, wall, offset: Math.round(off),
      z: Math.max(50, +$('#uZ').value || 1000)
    });
    setDoc(state.doc, { immediate: true });
    toast("Quvur/rozetka qo'yildi", 'good');
  });
  $('#uList').addEventListener('click', (e) => {
    const i = e.target.dataset && e.target.dataset.delu;
    if (i != null) {
      (state.doc.room.utilities || []).splice(+i, 1);
      setDoc(state.doc, { immediate: true });
    }
  });
  // F2: oshxona elementlari — toggle → synthetic stoleshnitsa/sokol/dobor/karniz/moyka
  const K_IDS = ['#kStol', '#kSokol', '#kDobor', '#kKarniz', '#kDoborH', '#kKarnizH',
                 '#kMoyka', '#kMoykaSize', '#kMoykaOff', '#kMoykaBack'];
  K_IDS.forEach(sel => $(sel).addEventListener('change', () => kitchenApply()));
  $('#oList').addEventListener('click', (e) => {
    const i = e.target.dataset && e.target.dataset.del;
    if (i != null) { state.doc.room.openings.splice(+i, 1); setDoc(state.doc, { immediate: true }); }
  });
  // loyiha
  $('#pSave').addEventListener('click', saveProject);
  $('#pLoad').addEventListener('click', loadProject);
  $('#pNew').addEventListener('click', newProject);
  // katalog
  $('#catFilter').addEventListener('click', (e) => {
    const f = e.target.dataset && e.target.dataset.f;
    if (f) { state.filter = f; renderCatalog(); }
  });
  $('#catGrid').addEventListener('click', (e) => {
    const b = e.target.closest('.cat-card');
    if (b) addPlacement(state.catalog[b.dataset.code]);
  });
  $('#matSel').addEventListener('change', (e) => {
    state.materialCode = e.target.value;
    state.sheet = null;               // bazaviy tip almashtirildi — katalog tanlovi reset
    renderSheetSel();
    renderCatalog();
    scheduleRecalc(true);
    toast('Korpus: ' + state.materialCode + ' — narx yangilandi', 'good');
  });
  $('#fasadSel').addEventListener('change', (e) => {
    state.fasadCode = e.target.value;
    state.sheet = null;
    renderSheetSel();
    renderCatalog();
    scheduleRecalc(true);
    toast('Fasad: ' + state.fasadCode + ' — narx yangilandi', 'good');
  });
  $('#sheetSel').addEventListener('change', (e) => {
    const idx = +e.target.value;
    const all = (state.sheetCatalog && state.sheetCatalog.sheets) || [];
    state.sheet = idx >= 0 ? all[idx] : null;
    if (state.sheet) {
      const base = baseForSheet(state.sheet), slot = slotForBase(base);
      if (slot === 'korpus') { state.materialCode = base; $('#matSel').value = base; }
      else if (slot === 'fasad') { state.fasadCode = base; $('#fasadSel').value = base; }
      renderCatalog();
      toast(slot ? 'Real material (' + slot + '): ' + state.sheet.name
                 : state.sheet.name + ' — korpus/fasad uchun emas, faqat narx bazasi yangilandi', slot ? 'good' : 'warn');
    } else {
      toast('Demo narxlar (materials.json)', 'ok');
    }
    scheduleRecalc(true);
  });
  $('#sheetQ').addEventListener('input', () => { state.sheet = null; renderSheetSel(); });
  // AI
  $('#btnBuild').addEventListener('click', runAI);
  $('#btnVoice').addEventListener('click', toggleVoice);
  $('#aiSamples').addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) { $('#aiText').value = e.target.textContent; runAI(); }
  });
  // item card
  $('#icClose').addEventListener('click', () => { items.select(null); hideItemCard(); });
  $('#icDel').addEventListener('click', () => state.selectedId && removePlacement(state.selectedId));
  const numPatch = (key) => (e) => {
    if (!state.selectedId) return;
    const p = state.doc.placements.find(x => x.id === state.selectedId);
    const frag = state.catalog[p.frg] || {};
    const patch = { [key]: key === 'z' ? Math.max(0, Math.round(+e.target.value || 0)) : Math.round(+e.target.value || 0) };
    Object.assign(p, patch);
    const want = { w: p.w, d: p.d, h: p.h };        // usta kiritgan — ogohlantirish shu bo'yicha
    const cl = clampSize(p, frag);
    if (Object.keys(cl).length) { Object.assign(p, cl); showItemCard(p.id); }
    items.setPlacements(viewPlacements(), state.catalog);
    checkClamp(want, frag, true);
    scheduleRecalc();
  };
  ['icW', 'icD', 'icH', 'icX', 'icZ'].forEach((id, i) => {
    $('#' + id).addEventListener('change', numPatch(['w', 'd', 'h', 'x', 'z'][i]));
  });
  /* TZ-03: xizmat tanlovi loyiha hujjatida saqlanadi (doc.xizmatlar) */
  $('#xzTeshik').addEventListener('change', (e) => {
    state.doc.xizmatlar = Object.assign({}, state.doc.xizmatlar, { teshik: e.target.checked });
    scheduleRecalc(true);
    renderCatalog();
    toast(e.target.checked ? "Prisadka smetaga qo'shildi" : "Prisadka smetadan olindi", 'good');
  });
  $('#icLeft').addEventListener('click', () => nudge(-50, 0));
  $('#icRight').addEventListener('click', () => nudge(50, 0));
  $('#icRot').addEventListener('click', () => {
    if (!state.selectedId) return;
    const p = state.doc.placements.find(x => x.id === state.selectedId);
    p.rot = ((p.rot || 0) + 90) % 360;
    items.setPlacements(viewPlacements(), state.catalog);
    scheduleRecalc();
  });
  $('#icDup').addEventListener('click', () => {
    if (!state.selectedId) return;
    const p = state.doc.placements.find(x => x.id === state.selectedId);
    const f = footprint(p);
    const np = Object.assign({}, p, { id: 'p' + (state.idSeq++), x: p.x + f.ex + 50 });
    state.doc.placements.push(np);
    items.setPlacements(viewPlacements(), state.catalog);
    items.select(np.id);
    scheduleRecalc();
  });
  function nudge(dx, dy) {
    if (!state.selectedId) return;
    const p = state.doc.placements.find(x => x.id === state.selectedId);
    p.x += dx; p.y += dy;
    items.setPlacements(viewPlacements(), state.catalog);
    showItemCard(p.id);
    scheduleRecalc();
  }
  // export
  $('#exRender1080').addEventListener('click', take1080pRender);
  $('#exRender360').addEventListener('click', take360Panorama);
  if ($('#btnSnap1080')) $('#btnSnap1080').addEventListener('click', take1080pRender);
  if ($('#btnSnap360')) $('#btnSnap360').addEventListener('click', take360Panorama);
  $('#exObj').addEventListener('click', exportOBJ);
  $('#exGlb').addEventListener('click', exportGlb);
  $('#exHoles').addEventListener('click', exportHoles);
  $('#exCut').addEventListener('click', exportCut);
  $('#exXlsx').addEventListener('click', exportXlsx);
  $('#exSmeta').addEventListener('click', exportSmeta);
  $('#exProject').addEventListener('click', exportProject);
  $('#exBpj').addEventListener('click', exportBpj);
  $('#exGl').addEventListener('click', exportGl);
  $('#exXnc').addEventListener('click', exportXnc);
  $('#exReport').addEventListener('click', printReport);
  $('#exDxf').addEventListener('click', exportDxf);
  $('#exNc').addEventListener('click', exportNc);
  $('#exGcode').addEventListener('click', exportGcode);
  $('#exPtp').addEventListener('click', exportPtp);
  $('#exCix').addEventListener('click', exportCix);
  $('#exMpr').addEventListener('click', exportMpr);
  $('#exAltendorf').addEventListener('click', exportAltendorf);

  /* nesting parametrlari modal */
  $('#nestCfgBtn').addEventListener('click', () => {
    const c = state.nestCfg || {};
    $('#ncMode').value = c.mode || 'bssf';
    $('#ncMaxRot').value = String(c.maxRot != null ? c.maxRot : 2);
    $('#ncKerf').value = c.kerf != null ? c.kerf : 4;
    $('#ncTrimL').value = c.trimL != null ? c.trimL : 8;
    $('#ncTrimW').value = c.trimW != null ? c.trimW : 8;
    $('#ncRemA').value = c.remMinA != null ? c.remMinA : 300;
    $('#ncRemB').value = c.remMinB != null ? c.remMinB : 300;
    $('#ncRemU').value = c.remUsableMin != null ? c.remUsableMin : 0.5;
    $('#nestCfgModal').hidden = false;
  });
  $('#ncClose').addEventListener('click', () => { $('#nestCfgModal').hidden = true; });
  $('#ncReset').addEventListener('click', () => {
    localStorage.removeItem('s3d-nest-cfg');
    state.nestCfg = { mode: 'bssf', kerf: 4, maxRot: 2, trimL: 8, trimW: 8, remMinA: 300, remMinB: 300, remUsableMin: 0.5 };
    $('#nestCfgModal').hidden = true;
    doRecalc();
    toast('Raskroy standart qaytarildi', 'good');
  });
  $('#ncApply').addEventListener('click', () => {
    state.nestCfg = {
      mode: $('#ncMode').value,
      maxRot: +$('#ncMaxRot').value,
      kerf: Math.max(1, +$('#ncKerf').value || 4),
      trimL: Math.max(0, +$('#ncTrimL').value || 0),
      trimW: Math.max(0, +$('#ncTrimW').value || 0),
      remMinA: +$('#ncRemA').value || 300,
      remMinB: +$('#ncRemB').value || 300,
      remUsableMin: +$('#ncRemU').value || 0.5
    };
    try { localStorage.setItem('s3d-nest-cfg', JSON.stringify(state.nestCfg)); } catch (e) { /* kvota */ }
    $('#nestCfgModal').hidden = true;
    doRecalc();
    toast('Raskroy parametrlari qo\'llandi — qayta hisoblandi', 'good');
  });
  $('#nestCfgModal').addEventListener('click', (e) => {
    if (e.target === $('#nestCfgModal')) $('#nestCfgModal').hidden = true;
  });

  // boot yopish
  window.__s3d = { state, exportBpj, exportGl, openTab, get sp() { return sp; } };   // QA uchun
  /* PWA offline — birinchi tashrifdan keyin internetsiz ishlaydi */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline emas — jim */ });
  }
  connectPriceSocket();
  $('#boot').style.transition = 'opacity .35s';
  $('#boot').style.opacity = '0';
  setTimeout(() => $('#boot').remove(), 400);
  toast('Smart3D tayyor — 2D/3D ni ko\'ring', 'good');
}

/* ═══ WebSocket — real-time narx yangilanishi ═══
 * Faqat sayt Smart3D serveri orqali ochilganda ulanadi (bir xil origin'da /api/health
 * javob bersa). Statik hostingda (python http.server, CDN) WebSocket umuman ochilmaydi. */
async function connectPriceSocket() {
  if (!location.protocol.startsWith('http')) return;
  try {
    const r = await fetch('/api/health', { cache: 'no-store' });
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return;
  } catch (e) { return; }                    // server yo'q — jim
  try {
    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${wsProto}//${location.host}/ws`);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'price_update' && state.sheetCatalog) {
          /* sheetCatalog'da narxni yangilash */
          const sh = (state.sheetCatalog.sheets || []).find(s => s.sku && s.id === msg.material_id);
          if (sh) {
            const old = sh.uzs;
            sh.uzs = msg.uzs;
            sh.usd = msg.usd;
            renderSheetSel();
            if (sh === state.sheet) { renderCatalog(); scheduleRecalc(true); }   // tanlangan varaq — narx qayta
            toast(`Narx yangilandi: ${sh.name.slice(0, 40)} — ${fmtSum(old)} → ${fmtSum(msg.uzs)}`, 'good');
          }
        }
      } catch (err) { /* ignore */ }
    };
    ws.onclose = () => { /* server to'xtadi — jim */ };
  } catch (err) { /* WebSocket yo'q — jim */ }
}

boot().catch(e => {
  console.error(e);
  const b = $('#boot');
  if (b) b.innerHTML = '<div class="logo">Smart<span>3D</span></div><small style="color:var(--bad)">Yuklashda xato: ' + esc(e.message) + '</small>';
});
