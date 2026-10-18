/* TZ-33 A: SketchUp Pro uchun zaxira — COLLADA 1.4.1 (.dae), .skp bilan xuddi shu tarkib (eksportModeli). three 0.160 da
 * ColladaExporter yo'q — o'z yozuvchimiz. SketchUp'ning o'z eksportidagidek: birlik — dyuym (<unit meter="0.0254">), Z yuqori;
 * modul va furnitura ta'riflari — library_nodes (instance_node bilan qayta ishlatiladi), detal — o'z tuguni (qatlam — node layer),
 * geometriya bir xil o'lchamda bo'lsa — bitta, material joylashuvda bog'lanadi (bind_material). Atributlar — <extra> (Smart3D). */
import { modulJoyi, shaklYuzalar, qutiYuzalar } from './model.js';

const DYUYM = 25.4;
const n6 = (v) => { const r = Math.round(v * 1e6) / 1e6; return Object.is(r, -0) ? '0' : String(r); };
const xe = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[ch]))
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
/** COLLADA layer nomi — bo'shliqsiz (ListOfNames) */
const qatlamNomi = (s) => String(s).trim().replace(/\s+/g, '_');

/** ko'pburchak normali (Newell) */
function normal(pts) {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

/** yuzalar (mm) → <geometry> (dyuymda, uchburchaklar, yassi normallar) */
function geometriya(id, nom, yuzalar) {
  const pos = [], nrm = [], p = [];
  let vi = 0;
  yuzalar.forEach((f, fi) => {
    const n = normal(f);
    nrm.push(n.map(n6).join(' '));
    const base = vi;
    for (const q of f) { pos.push(q.map(v => n6(v / DYUYM)).join(' ')); vi++; }
    for (let k = 1; k + 1 < f.length; k++) p.push(base, fi, base + k, fi, base + k + 1, fi);
  });
  const tri = p.length / 6;
  return `<geometry id="${id}" name="${xe(nom)}"><mesh>`
    + `<source id="${id}-pos"><float_array id="${id}-pos-a" count="${vi * 3}">${pos.join(' ')}</float_array><technique_common><accessor source="#${id}-pos-a" count="${vi}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>`
    + `<source id="${id}-nrm"><float_array id="${id}-nrm-a" count="${yuzalar.length * 3}">${nrm.join(' ')}</float_array><technique_common><accessor source="#${id}-nrm-a" count="${yuzalar.length}" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source>`
    + `<vertices id="${id}-vtx"><input semantic="POSITION" source="#${id}-pos"/></vertices>`
    + `<triangles material="mat" count="${tri}"><input semantic="VERTEX" source="#${id}-vtx" offset="0"/><input semantic="NORMAL" source="#${id}-nrm" offset="1"/><p>${p.join(' ')}</p></triangles>`
    + `</mesh></geometry>`;
}

/** 4×4 matritsa (COLLADA — qatorlab), dyuymda: bazis ustunlari X, Y, Z va siljish t (mm) */
const matritsa = (m, t) => `<matrix>${[
  m[0][0], m[1][0], m[2][0], t[0] / DYUYM, m[0][1], m[1][1], m[2][1], t[1] / DYUYM, m[0][2], m[1][2], m[2][2], t[2] / DYUYM, 0, 0, 0, 1].map(n6).join(' ')}</matrix>`;
const birlik = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const extra = (o) => `<extra><technique profile="Smart3D">${Object.entries(o || {}).map(([k, v]) => `<param name="${xe(k)}" type="string">${xe(v)}</param>`).join('')}</technique></extra>`;
const bog = (url, mi) => `<instance_geometry url="#${url}"><bind_material><technique_common><instance_material symbol="mat" target="#m${mi}"/></technique_common></bind_material></instance_geometry>`;

/**
 * @param {Object} model — eksportModeli() natijasi
 * @param {Object} [o] — { sana: ISO vaqt (test uchun barqaror) }
 * @returns {string} — COLLADA 1.4.1 XML
 */
export function daeYoz(model, o = {}) {
  const sana = o.sana || new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const eff = [], mats = [], geos = [], libNodes = [], scene = [];
  model.materiallar.forEach((m, i) => {
    eff.push(`<effect id="e${i}"><profile_COMMON><technique sid="common"><lambert><diffuse><color>${m.rang.map(c => n6(c / 255)).join(' ')} 1</color></diffuse></lambert></technique></profile_COMMON></effect>`);
    mats.push(`<material id="m${i}" name="${xe(m.nom)}"><instance_effect url="#e${i}"/></material>`);
  });
  const qatlam = model.qatlamlar.map(qatlamNomi);
  /* geometriya: bir xil quti o'lchami — bitta */
  const qutiGeo = new Map();
  const quti = (s) => {
    const k = s.map(n6).join('x');
    if (!qutiGeo.has(k)) { const id = 'gq' + qutiGeo.size; qutiGeo.set(k, id); geos.push(geometriya(id, k + ' mm', qutiYuzalar([0, 0, 0], s.map(v => Math.max(0.1, v))))); }
    return qutiGeo.get(k);
  };
  const furnNode = new Map(), modNode = new Map();
  let uid = 0;
  for (const m of model.modullar) {
    if (modNode.has(m.imzo)) continue;
    const ichi = [];
    for (const dt of m.detallar) {
      ichi.push(`<node id="d${uid++}" name="${xe(dt.nom + ' ' + dt.atr.olcham)}" layer="${xe(qatlam[dt.qatlam])}">${matritsa(birlik, dt.min)}${bog(quti(dt.s), dt.mat)}${extra(dt.atr)}</node>`);
    }
    for (const f of m.furnitura) {
      const k = f.nom + '|' + f.mat + '|' + JSON.stringify(f.shakl);
      if (!furnNode.has(k)) {
        const id = 'f' + furnNode.size, gid = 'g' + id;
        geos.push(geometriya(gid, f.nom, f.shakl.flatMap(sh => shaklYuzalar(sh))));
        libNodes.push(`<node id="${id}" name="${xe(f.nom)}" layer="${xe(qatlam[3])}">${bog(gid, f.mat)}${extra(f.atr)}</node>`);
        furnNode.set(k, id);
      }
      ichi.push(`<node id="n${uid++}" name="${xe(f.nom)}" layer="${xe(qatlam[3])}">${matritsa(f.m, f.t)}<instance_node url="#${furnNode.get(k)}"/></node>`);
    }
    const id = 'mod' + modNode.size;
    libNodes.push(`<node id="${id}" name="${xe(m.nom)}">${ichi.join('')}${extra(m.atr)}</node>`);
    modNode.set(m.imzo, id);
  }
  for (const m of model.modullar) {
    const J = modulJoyi(m), R = J.R, ust = [[R[0][0], R[1][0], R[2][0]], [R[0][1], R[1][1], R[2][1]], [R[0][2], R[1][2], R[2][2]]];
    for (let n = 0; n < m.qty; n++) scene.push(`<node id="j${uid++}" name="${xe(m.nom)}">${matritsa(ust, J.t)}<instance_node url="#${modNode.get(m.imzo)}"/></node>`);
  }
  return '<?xml version="1.0" encoding="utf-8"?>\n'
    + '<COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1">\n'
    + `<asset><contributor><authoring_tool>Smart3D</authoring_tool></contributor><created>${sana}</created><modified>${sana}</modified><unit name="inch" meter="0.0254"/><up_axis>Z_UP</up_axis></asset>\n`
    + `<library_effects>${eff.join('')}</library_effects>\n<library_materials>${mats.join('')}</library_materials>\n`
    + `<library_geometries>${geos.join('\n')}</library_geometries>\n<library_nodes>${libNodes.join('\n')}</library_nodes>\n`
    + `<library_visual_scenes><visual_scene id="smart3d" name="Smart3D">${scene.join('\n')}</visual_scene></library_visual_scenes>\n`
    + '<scene><instance_visual_scene url="#smart3d"/></scene>\n</COLLADA>\n';
}
