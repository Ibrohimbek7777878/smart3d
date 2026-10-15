/* giblab_check.mjs — GibLab .project faylini MUSTAQIL tekshirish (TZ-02).
 *
 * Manba modeli: mebelcity-platform/widget_fms/vendor/giblab_raskroy.py (Bittada FMS) —
 * parse_data / build_data / pattern_rects / _render_nodes / run_tests mantig'i Node'da aynan
 * takrorlangan. Smart3D yozuvchisidan (app/js/engine/giblab.js) hech narsa import qilinmaydi.
 *
 * Tekshiradi:
 *   · round-trip — data blobini o'qib qayta yig'ilganda bayt-ma-bayt teng;
 *   · render xato — daraxt bo'yicha chizishda konteyner yo'q / sig'imdan oshish;
 *   · o'lcham — kartadagi detal = XMLdagi kesim o'lchami (cl×cw; bo'lmasa l×w), ±0.6 mm;
 *   · son — karta: joylashuv × list soni = n_parts; detal: joylashuv = usedCount;
 *   · ustma-ust — bir kartadagi ikki detal kesishmasligi;
 *   · joylashtirilmagan — mahsulotdagi (product) detal birorta kartada yo'q.
 *
 * Ishlatish: import { checkProject } — yoki CLI: node tests/giblab_check.mjs FAYL.project
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const T_TRIM = 1, T_CUT = 2, T_PART = 3, T_WASTE = 4;
const SIG = Buffer.from('bff0000000000000'.repeat(4), 'hex');   // 4 × float64(-1.0)

/* ── data blobi (base64, BIG-ENDIAN) → struktura — parse_data() ── */
export function parseData(b64) {
  const b = Buffer.from(b64, 'base64');
  let cur = 0;
  const header = b.subarray(0, 8); cur = 8;
  const version = b[cur++];
  const patCount = b.readInt32BE(cur); cur += 4;
  const patterns = [];
  for (let i = 0; i < patCount; i++) {
    const p = { sheet_count: b.readInt32BE(cur) }; cur += 4;
    p.length = b.readDoubleBE(cur); p.width = b.readDoubleBE(cur + 8); cur += 16;
    const sigPos = b.indexOf(SIG, cur);
    if (sigPos < 0 || sigPos > cur + 48) throw new Error(`karta #${i}: imzo (4×-1.0) topilmadi, pos=${cur}`);
    p.extra = b.subarray(cur, sigPos); cur = sigPos + SIG.length;
    p.n_parts = b.readInt32BE(cur); p.u1 = b.readInt32BE(cur + 4); p.u2 = b.readInt32BE(cur + 8); p.n_parts2 = b.readInt32BE(cur + 12); cur += 16;
    p.parts_area = b.readDoubleBE(cur); cur += 8;
    p.n_waste = b.readInt32BE(cur); cur += 4;
    p.waste_area = b.readDoubleBE(cur); cur += 8;
    p.u3 = b.readInt32BE(cur); cur += 4;
    p.cut_len = b.readDoubleBE(cur); cur += 8;
    p.cut_count = b.readInt32BE(cur); cur += 4;
    p.filling = b.readDoubleBE(cur); cur += 8;
    const recCount = b.readInt32BE(cur); cur += 4;
    if (!(recCount >= 0 && recCount <= 100000)) throw new Error(`karta #${i}: rec_count=${recCount} — xato`);
    p.records = [];
    for (let k = 0; k < recCount; k++) {
      const op = b[cur]; cur += 1;
      p.records.push({ level: op >> 3, type: op & 7, size: b.readDoubleBE(cur), count: b.readInt16BE(cur + 8), part_id: b.readInt32BE(cur + 10) });
      cur += 14;
    }
    patterns.push(p);
  }
  if (cur !== b.length) throw new Error(`blob to'liq o'qilmadi: ${cur}/${b.length} bayt`);
  return { header, version, patterns };
}

/* ── struktura → base64 — build_data() ── */
export function buildData(rd) {
  const chunks = [Buffer.from(rd.header), Buffer.from([rd.version])];
  const i32 = (v) => { const x = Buffer.alloc(4); x.writeInt32BE(v); return x; };
  const f64 = (v) => { const x = Buffer.alloc(8); x.writeDoubleBE(v); return x; };
  chunks.push(i32(rd.patterns.length));
  for (const p of rd.patterns) {
    chunks.push(i32(p.sheet_count), f64(p.length), f64(p.width), Buffer.from(p.extra), SIG,
      i32(p.n_parts), i32(p.u1), i32(p.u2), i32(p.n_parts2), f64(p.parts_area), i32(p.n_waste),
      f64(p.waste_area), i32(p.u3), f64(p.cut_len), i32(p.cut_count), f64(p.filling), i32(p.records.length));
    for (const r of p.records) {
      const x = Buffer.alloc(15);
      x[0] = (r.level << 3) | r.type; x.writeDoubleBE(r.size, 1); x.writeInt16BE(r.count, 9); x.writeInt32BE(r.part_id, 11);
      chunks.push(x);
    }
  }
  return Buffer.concat(chunks).toString('base64');
}

/* ── karta daraxti → to'rtburchaklar — pattern_rects() + _render_nodes() ── */
export function patternRects(p, kerf = 4.4) {
  const recs = p.records, errors = [], rects = [];
  let dirShift = 0, start = 0;
  if (recs.length && recs[0].level === 0) { dirShift = 1; start = 1; }   // 0x01: yo'nalish teskari
  const root = { rec: null, children: [] };
  const containers = { 1: root };
  for (let i = start; i < recs.length; i++) {
    const r = recs[i], parent = containers[r.level];
    if (!parent) { errors.push(`rec#${i}: daraja ${r.level} uchun konteyner yo'q`); continue; }
    const node = { rec: r, children: [] };
    parent.children.push(node);
    if (r.type === T_CUT) containers[r.level + 1] = node;
  }
  const render = (children, x, y, lx, ly, axis) => {
    let pos = 0;
    for (const node of children) {
      const r = node.rec;
      for (let k = 0; k < Math.max(1, r.count); k++) {       // trim/qoldiqda count=0
        const rect = axis === 0 ? { x: x + pos, y, w: r.size, h: ly } : { x, y: y + pos, w: lx, h: r.size };
        Object.assign(rect, { type: r.type, part_id: r.part_id, level: r.level });
        rects.push(rect);
        if (r.type === T_CUT) render(node.children, rect.x, rect.y, rect.w, rect.h, 1 - axis);
        pos += r.size + kerf;
      }
    }
    const cap = axis === 0 ? lx : ly;
    if (pos - kerf > cap + 0.6) errors.push(`sig'imdan oshdi: ${(pos - kerf).toFixed(1)} > ${cap.toFixed(1)}`);
  };
  render(root.children, 0, 0, p.length, p.width, dirShift % 2);
  return { rects, errors };
}

/* ── .project XML → detallar, CS operatsiyalari — load_project() ── */
const attrs = (s) => { const o = {}; for (const m of s.matchAll(/([\w.:-]+)="([^"]*)"/g)) o[m[1]] = m[2]; return o; };

export function loadProject(xml) {
  const parts = {}, product = new Set(), sheets = {}, kerfs = {}, ops = [];
  let good = null, op = null;
  for (const m of xml.matchAll(/<(\/?)(good|part|operation|material)\b([^>]*?)(\/?)>/g)) {
    const [, close, tag, body, selfClose] = m;
    if (close) { if (tag === 'good') good = null; if (tag === 'operation') op = null; continue; }
    const a = attrs(body);
    if (tag === 'good') {
      if (a.typeId === 'sheet') sheets[a.id] = a.name;
      if (a.typeId === 'tool.cutting') kerfs[a.id] = parseFloat(a.swSawthick || '4.4');
      if (!selfClose) good = a;
    } else if (tag === 'operation') {
      if (a.typeId === 'CS' && a.data) { op = { op_id: a.id, tool1: a.tool1, data: a.data, material: null }; ops.push(op); }
      else if (!selfClose) op = { skip: true };
    } else if (tag === 'material' && op && !op.skip) {
      op.material = sheets[a.id] || '?';
    } else if (tag === 'part' && good) {
      const pid = parseInt(a.id, 10);
      parts[pid] = { l: +a.l || 0, w: +a.w || 0, cl: a.cl != null ? +a.cl : null, cw: a.cw != null ? +a.cw : null,
        waste: a.waste === 'true', used: parseInt(a.usedCount || '0', 10) };
      if (good.typeId === 'product') product.add(pid);
    }
  }
  for (const o of ops) { o.kerf = kerfs[o.tool1] != null ? kerfs[o.tool1] : 4.4; o.parsed = parseData(o.data); }
  return { parts, product, ops };
}

/* ── hamma tekshiruvlar — run_tests() + ustma-ust + joylashtirilmagan ── */
export function checkProject(xml) {
  const r = { ops: 0, patterns: 0, placed: 0, rtOk: 0, renderErr: 0, dimErr: 0, cntErr: 0, overlap: 0, missing: 0, messages: [] };
  const say = (s) => { if (r.messages.length < 40) r.messages.push(s); };
  let prj;
  try { prj = loadProject(xml); } catch (e) { r.renderErr++; say('o\'qib bo\'lmadi: ' + e.message); return r; }
  const placedById = {};
  for (const op of prj.ops) {
    r.ops++;
    if (buildData(op.parsed) === op.data) r.rtOk++; else say(`round-trip farq: op${op.op_id}`);
    for (const p of op.parsed.patterns) {
      r.patterns++;
      const { rects, errors } = patternRects(p, op.kerf);
      r.renderErr += errors.length; errors.forEach(e => say(`render op${op.op_id}: ${e}`));
      const pr = rects.filter(x => x.type === T_PART);
      for (const x of pr) {
        r.placed++;
        placedById[x.part_id] = (placedById[x.part_id] || 0) + p.sheet_count;
        const info = prj.parts[x.part_id];
        if (!info) { r.renderErr++; say(`detal yo'q: id=${x.part_id}`); continue; }
        const [a, b] = [x.w, x.h].sort((u, v) => u - v);
        const [c, d] = [info.cl != null ? info.cl : info.l, info.cw != null ? info.cw : info.w].sort((u, v) => u - v);
        if (Math.abs(a - c) > 0.6 || Math.abs(b - d) > 0.6) { r.dimErr++; say(`o'lcham farq: id=${x.part_id} ${x.w}×${x.h} ≠ ${c}×${d}`); }
      }
      if (pr.length * p.sheet_count !== p.n_parts) { r.cntErr++; say(`karta son farq: ${pr.length}×${p.sheet_count} ≠ ${p.n_parts}`); }
      for (let i = 0; i < pr.length; i++) for (let j = i + 1; j < pr.length; j++) {
        const A = pr[i], B = pr[j], e = 0.01;
        if (A.x < B.x + B.w - e && B.x < A.x + A.w - e && A.y < B.y + B.h - e && B.y < A.y + A.h - e) {
          r.overlap++; say(`ustma-ust: id=${A.part_id} va id=${B.part_id}`);
        }
      }
    }
  }
  for (const [pid, cnt] of Object.entries(placedById)) {
    const info = prj.parts[pid];
    if (info && !info.waste && info.used !== cnt) { r.cntErr++; say(`usedCount farq: id=${pid} joylashdi ${cnt} ≠ ${info.used}`); }
  }
  for (const pid of prj.product) if (!placedById[pid]) r.missing++;
  r.line = `render xato=${r.renderErr} | ustma-ust=${r.overlap} | joylashtirilmagan=${r.missing} | o'lcham farq=${r.dimErr} | son farq=${r.cntErr} | round-trip ${r.rtOk}/${r.ops}`;
  return r;
}

/* CLI */
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const f = process.argv[2];
  if (!f) { console.log('Ishlatish: node tests/giblab_check.mjs FAYL.project'); process.exit(2); }
  const res = checkProject(readFileSync(f, 'utf8'));
  res.messages.forEach(m => console.log('  ' + m));
  console.log(res.line);
  process.exit(res.renderErr || res.overlap || res.dimErr || res.cntErr || res.rtOk !== res.ops ? 1 : 0);
}
